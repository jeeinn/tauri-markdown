/**
 * 滚动位置记忆管理器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ScrollMemoryManager, createScrollMemoryManager } from '../scroll-memory.js'

// Mock store 模块
vi.mock('../store.js', () => ({
  saveScrollPosition: vi.fn().mockResolvedValue(undefined),
  getScrollPosition: vi.fn().mockResolvedValue(null),
}))

describe('ScrollMemoryManager', () => {
  let manager
  let mockVditor
  let mockGetCurrentFilePath

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks()

    // 创建模拟 Vditor 实例
    mockVditor = {
      vditor: {
        currentMode: 'ir',
        ir: {
          element: {
            scrollHeight: 1000,
            clientHeight: 500,
            scrollTop: 250,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
        },
        sv: {
          element: {
            scrollHeight: 1000,
            clientHeight: 500,
            scrollTop: 250,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
        },
        wysiwyg: {
          element: {
            scrollHeight: 1000,
            clientHeight: 500,
            scrollTop: 250,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
        },
      },
    }

    mockGetCurrentFilePath = vi.fn().mockReturnValue('/test/file.md')

    // 创建管理器实例
    manager = new ScrollMemoryManager(
      () => mockVditor,
      {
        getCurrentFilePath: mockGetCurrentFilePath,
        throttleMs: 50, // 使用较短的节流时间加快测试
        debounceMs: 50,
        pollMaxTimes: 5,
        pollIntervalMs: 10,
        stableCheckCount: 2,
        modeCheckIntervalMs: 100,
      }
    )
  })

  describe('构造函数', () => {
    it('应该正确初始化默认配置', () => {
      const defaultManager = createScrollMemoryManager(() => mockVditor)
      expect(defaultManager.enabled).toBe(true)
      expect(defaultManager.config.throttleMs).toBe(200)
      expect(defaultManager.config.debounceMs).toBe(500)
    })

    it('应该支持自定义配置', () => {
      expect(manager.config.throttleMs).toBe(50)
      expect(manager.config.debounceMs).toBe(50)
    })

    it('应该接受外部传入的回调函数', () => {
      expect(manager._getCurrentFilePath()).toBe('/test/file.md')
    })
  })

  describe('setEnabled', () => {
    it('应该能够禁用功能', () => {
      manager.setEnabled(false)
      expect(manager.enabled).toBe(false)
    })

    it('应该能够启用功能', () => {
      manager.setEnabled(false)
      manager.setEnabled(true)
      expect(manager.enabled).toBe(true)
    })

    it('禁用时应该清除当前文件的缓存', () => {
      manager.scrollPositionsCache['/test/file.md'] = 0.5
      manager.setEnabled(false)
      expect(manager.scrollPositionsCache['/test/file.md']).toBeUndefined()
    })

    it('禁用时应该解绑滚动监听', () => {
      manager.setupScrollListener()
      manager.setEnabled(false)
      expect(manager._scrollEl).toBeNull()
    })
  })

  describe('getScrollElement', () => {
    it('应该返回 IR 模式的滚动元素', () => {
      mockVditor.vditor.currentMode = 'ir'
      const el = manager.getScrollElement()
      expect(el).toBe(mockVditor.vditor.ir.element)
    })

    it('应该返回 SV 模式的滚动元素', () => {
      mockVditor.vditor.currentMode = 'sv'
      const el = manager.getScrollElement()
      expect(el).toBe(mockVditor.vditor.sv.element)
    })

    it('应该返回 WYSIWYG 模式的滚动元素', () => {
      mockVditor.vditor.currentMode = 'wysiwyg'
      const el = manager.getScrollElement()
      expect(el).toBe(mockVditor.vditor.wysiwyg.element)
    })

    it('Vditor 未初始化时应该返回 null', () => {
      const nullManager = createScrollMemoryManager(() => null)
      expect(nullManager.getScrollElement()).toBeNull()
    })
  })

  describe('setupScrollListener', () => {
    it('功能禁用时不应该设置监听', () => {
      manager.setEnabled(false)
      manager.setupScrollListener()
      expect(mockVditor.vditor.ir.element.addEventListener).not.toHaveBeenCalled()
    })

    it('功能启用时应该设置监听', () => {
      manager.setupScrollListener()
      expect(mockVditor.vditor.ir.element.addEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      )
    })

    it('应该移除旧的监听器', () => {
      manager.setupScrollListener()
      const oldEl = manager._scrollEl
      manager.setupScrollListener()
      expect(oldEl.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  describe('saveCurrentScrollPosition', () => {
    it('功能禁用时不应该保存位置', () => {
      manager.setEnabled(false)
      manager.saveCurrentScrollPosition()
      expect(Object.keys(manager.scrollPositionsCache).length).toBe(0)
    })

    it('应该计算并保存滚动百分比', () => {
      manager.saveCurrentScrollPosition()
      // scrollTop / (scrollHeight - clientHeight) = 250 / (1000 - 500) = 0.5
      expect(manager.scrollPositionsCache['/test/file.md']).toBeCloseTo(0.5, 2)
    })

    it('内容未溢出时不应该保存', () => {
      mockVditor.vditor.ir.element.scrollHeight = 400
      mockVditor.vditor.ir.element.clientHeight = 500
      manager.saveCurrentScrollPosition()
      expect(Object.keys(manager.scrollPositionsCache).length).toBe(0)
    })
  })

  describe('flushScrollPosition', () => {
    it('功能禁用时不应该写入 Store', async () => {
      const { saveScrollPosition } = await import('../store.js')
      manager.setEnabled(false)
      manager.scrollPositionsCache['/test/file.md'] = 0.5
      await manager.flushScrollPosition()
      expect(saveScrollPosition).not.toHaveBeenCalled()
    })

    it('应该将缓存的位置写入 Store', async () => {
      const { saveScrollPosition } = await import('../store.js')
      manager.scrollPositionsCache['/test/file.md'] = 0.75
      await manager.flushScrollPosition()
      expect(saveScrollPosition).toHaveBeenCalledWith('/test/file.md', 0.75)
    })

    it('没有缓存位置时不应该调用 Store', async () => {
      const { saveScrollPosition } = await import('../store.js')
      await manager.flushScrollPosition()
      expect(saveScrollPosition).not.toHaveBeenCalled()
    })
  })

  describe('restoreScrollPosition', () => {
    it('功能禁用时不应该恢复位置', async () => {
      const { getScrollPosition } = await import('../store.js')
      manager.setEnabled(false)
      await manager.restoreScrollPosition('/test/file.md')
      expect(getScrollPosition).not.toHaveBeenCalled()
    })

    it('没有保存的位置时不应该恢复', async () => {
      const el = mockVditor.vditor.ir.element
      el.scrollTop = 0
      await manager.restoreScrollPosition('/test/file.md')
      expect(el.scrollTop).toBe(0)
    })

    it('应该恢复保存的滚动位置', async () => {
      const { getScrollPosition } = await import('../store.js')
      getScrollPosition.mockResolvedValue(0.5)

      const el = mockVditor.vditor.ir.element
      await manager.restoreScrollPosition('/test/file.md')

      // 等待轮询完成
      await new Promise(resolve => setTimeout(resolve, 200))

      // scrollTop = 0.5 * (1000 - 500) = 250
      expect(el.scrollTop).toBe(250)
    })
  })

  describe('destroy', () => {
    it('应该清理所有资源', async () => {
      const { saveScrollPosition } = await import('../store.js')
      
      manager.setupScrollListener()
      manager.scrollPositionsCache['/test/file.md'] = 0.5
      
      manager.destroy()

      expect(saveScrollPosition).toHaveBeenCalled()
      expect(manager._scrollEl).toBeNull()
      // _modeCheckInterval 已移除，改为使用 mode-switch-listener
      expect(manager._unsubscribeModeSwitch).toBeNull()
      expect(Object.keys(manager.scrollPositionsCache).length).toBe(0)
    })
  })

  describe('工厂函数', () => {
    it('createScrollMemoryManager 应该返回 ScrollMemoryManager 实例', () => {
      const instance = createScrollMemoryManager(() => mockVditor)
      expect(instance).toBeInstanceOf(ScrollMemoryManager)
    })
  })
})
