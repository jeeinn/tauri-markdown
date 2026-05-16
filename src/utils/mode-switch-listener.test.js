/**
 * mode-switch-listener.js 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import modeSwitchListener from './mode-switch-listener.js'

describe('ModeSwitchListener', () => {
  let mockVditor
  
  beforeEach(() => {
    // 创建模拟 Vditor 实例
    mockVditor = {
      vditor: {
        currentMode: 'ir'
      }
    }
    
    // 设置 Vditor 引用
    modeSwitchListener.setVditorRef(() => mockVditor)
  })
  
  afterEach(() => {
    // 清理所有订阅者
    modeSwitchListener.destroy()
  })
  
  describe('subscribe', () => {
    it('应该能够订阅模式切换事件', () => {
      const callback = vi.fn()
      const unsubscribe = modeSwitchListener.subscribe(callback)
      
      expect(typeof unsubscribe).toBe('function')
    })
    
    it('应该在模式切换时调用回调函数', async () => {
      const callback = vi.fn()
      modeSwitchListener.subscribe(callback)
      
      // 模拟模式切换
      mockVditor.vditor.currentMode = 'sv'
      
      // 等待轮询检测（300ms + 150ms DOM 等待）
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(callback).toHaveBeenCalled()
      expect(callback).toHaveBeenCalledWith('sv', 'ir', mockVditor)
    })
    
    it('应该能够取消订阅', async () => {
      const callback = vi.fn()
      const unsubscribe = modeSwitchListener.subscribe(callback)
      
      unsubscribe()
      
      // 触发模式切换
      mockVditor.vditor.currentMode = 'sv'
      
      // 等待轮询检测
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(callback).not.toHaveBeenCalled()
    })
    
    it('当参数不是函数时应该返回空函数', () => {
      const unsubscribe = modeSwitchListener.subscribe('not a function')
      expect(typeof unsubscribe).toBe('function')
    })
  })
  
  describe('unsubscribe', () => {
    it('应该能够通过 unsubscribe 方法取消订阅', async () => {
      const callback = vi.fn()
      modeSwitchListener.subscribe(callback)
      
      modeSwitchListener.unsubscribe(callback)
      
      // 触发模式切换
      mockVditor.vditor.currentMode = 'sv'
      
      // 等待轮询检测
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(callback).not.toHaveBeenCalled()
    })
  })
  
  describe('setVditorRef', () => {
    it('应该能够更新 Vditor 引用', () => {
      const newMockVditor = {
        vditor: {
          currentMode: 'wysiwyg'
        }
      }
      
      modeSwitchListener.setVditorRef(() => newMockVditor)
      
      expect(modeSwitchListener.getVditor()).toBe(newMockVditor)
    })
    
    it('应该重置 lastMode', async () => {
      const callback = vi.fn()
      modeSwitchListener.subscribe(callback)
      
      // 先触发一次模式切换
      mockVditor.vditor.currentMode = 'sv'
      
      // 等待第一次模式切换完成
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 重新设置 Vditor 引用（会重置 lastMode）
      modeSwitchListener.setVditorRef(() => mockVditor)
      
      // 再次切换到相同模式应该被检测到（因为 lastMode 被重置了）
      mockVditor.vditor.currentMode = 'ir'
      
      // 等待第二次模式切换完成
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('getVditor', () => {
    it('应该返回当前的 Vditor 实例', () => {
      expect(modeSwitchListener.getVditor()).toBe(mockVditor)
    })
    
    it('当没有设置 Vditor 引用时应该返回 null', () => {
      modeSwitchListener.setVditorRef(null)
      expect(modeSwitchListener.getVditor()).toBeNull()
    })
  })
  
  describe('destroy', () => {
    it('应该清理所有资源', async () => {
      const callback = vi.fn()
      modeSwitchListener.subscribe(callback)
      
      modeSwitchListener.destroy()
      
      // 触发模式切换
      mockVditor.vditor.currentMode = 'sv'
      
      // 等待轮询检测
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(callback).not.toHaveBeenCalled()
      expect(modeSwitchListener.getVditor()).toBeNull()
    })
  })
  
  describe('多订阅者', () => {
    it('应该能够支持多个订阅者', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      
      modeSwitchListener.subscribe(callback1)
      modeSwitchListener.subscribe(callback2)
      
      // 模拟模式切换
      mockVditor.vditor.currentMode = 'sv'
      
      // 等待轮询检测
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })
    
    it('一个订阅者失败不应该影响其他订阅者', async () => {
      const callback1 = vi.fn(() => { throw new Error('Test error') })
      const callback2 = vi.fn()
      
      modeSwitchListener.subscribe(callback1)
      modeSwitchListener.subscribe(callback2)
      
      // 模拟模式切换
      mockVditor.vditor.currentMode = 'sv'
      
      // 等待轮询检测
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })
  })
})
