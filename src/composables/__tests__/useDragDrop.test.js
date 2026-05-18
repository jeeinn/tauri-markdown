/**
 * useDragDrop composable 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDragDrop } from '../useDragDrop.js'

// Mock Tauri API
vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: vi.fn()
}))

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElNotification: vi.fn()
}))

// Mock i18n-helper
vi.mock('../../utils/i18n-helper.js', () => ({
  getI18nText: vi.fn((lang, key) => `${lang}:${key}`)
}))

import { getCurrentWebview } from '@tauri-apps/api/webview'
import { ElNotification } from 'element-plus'
import { getI18nText } from '../../utils/i18n-helper.js'

describe('useDragDrop', () => {
  let mockUnlisten = null
  let mockWebview = null
  let onFileDrop = null
  let langRef = null

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()
    
    // 创建 mock webview
    mockUnlisten = vi.fn()
    mockWebview = {
      onDragDropEvent: vi.fn().mockResolvedValue(mockUnlisten)
    }
    getCurrentWebview.mockResolvedValue(mockWebview)
    
    // 创建回调函数
    onFileDrop = vi.fn()
    
    // 创建语言引用
    langRef = ref('zh_CN')
  })

  afterEach(() => {
    // 清理
    vi.restoreAllMocks()
  })

  describe('初始化', () => {
    it('应该正确创建拖拽管理器', () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      
      expect(manager).toBeDefined()
      expect(manager.setupDragDrop).toBeDefined()
      expect(manager.cleanup).toBeDefined()
    })

    it('应该支持传入 getter 函数', () => {
      const getLang = () => 'en_US'
      const manager = useDragDrop(onFileDrop, getLang)
      
      expect(manager).toBeDefined()
    })

    it('应该支持传入 Ref', () => {
      const manager = useDragDrop(onFileDrop, langRef)
      
      expect(manager).toBeDefined()
    })
  })

  describe('setupDragDrop', () => {
    it('应该正确注册拖拽事件监听器', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      expect(getCurrentWebview).toHaveBeenCalled()
      expect(mockWebview.onDragDropEvent).toHaveBeenCalled()
    })

    it('应该在拖放 Markdown 文件时调用回调', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      const testPath = '/path/to/test.md'
      
      callback({ payload: { type: 'drop', paths: [testPath] } })
      
      expect(onFileDrop).toHaveBeenCalledWith(testPath)
    })

    it('应该支持 .markdown 扩展名', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      const testPath = '/path/to/test.markdown'
      
      callback({ payload: { type: 'drop', paths: [testPath] } })
      
      expect(onFileDrop).toHaveBeenCalledWith(testPath)
    })

    it('应该支持 .txt 扩展名', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      const testPath = '/path/to/test.txt'
      
      callback({ payload: { type: 'drop', paths: [testPath] } })
      
      expect(onFileDrop).toHaveBeenCalledWith(testPath)
    })

    it('应该忽略非 Markdown 文件并显示通知', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      const testPath = '/path/to/test.pdf'
      
      callback({ payload: { type: 'drop', paths: [testPath] } })
      
      expect(onFileDrop).not.toHaveBeenCalled()
      expect(ElNotification).toHaveBeenCalledWith({
        title: 'zh_CN:dragDrop.title',
        message: 'zh_CN:dragDrop.unsupported',
        type: 'warning',
        duration: 3000,
      })
    })

    it('应该在空路径数组时不执行任何操作', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      
      callback({ payload: { type: 'drop', paths: [] } })
      
      expect(onFileDrop).not.toHaveBeenCalled()
      expect(ElNotification).not.toHaveBeenCalled()
    })

    it('应该在多个文件中优先选择第一个 Markdown 文件', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      const paths = [
        '/path/to/image.png',
        '/path/to/doc.pdf',
        '/path/to/note.md',
        '/path/to/readme.txt'
      ]
      
      callback({ payload: { type: 'drop', paths } })
      
      expect(onFileDrop).toHaveBeenCalledWith('/path/to/note.md')
    })

    it('应该使用最新的语言值显示通知', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      
      // 切换语言
      langRef.value = 'en_US'
      
      callback({ payload: { type: 'drop', paths: ['/path/to/test.pdf'] } })
      
      expect(ElNotification).toHaveBeenCalledWith({
        title: 'en_US:dragDrop.title',
        message: 'en_US:dragDrop.unsupported',
        type: 'warning',
        duration: 3000,
      })
    })

    it('应该在初始化失败时捕获错误', async () => {
      getCurrentWebview.mockRejectedValue(new Error('Webview error'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DragDrop] 初始化拖拽监听失败:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('应该正确清理事件监听器', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      manager.cleanup()
      
      expect(mockUnlisten).toHaveBeenCalled()
    })

    it('应该在未初始化时安全调用', () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      
      // 不应该抛出错误
      expect(() => manager.cleanup()).not.toThrow()
    })

    it('应该可以多次调用', async () => {
      const manager = useDragDrop(onFileDrop, () => langRef.value)
      await manager.setupDragDrop()
      
      manager.cleanup()
      manager.cleanup() // 第二次调用
      
      expect(mockUnlisten).toHaveBeenCalledTimes(1) // 只调用一次
    })
  })

  describe('语言参数支持', () => {
    it('应该支持函数形式的语言参数', async () => {
      const getLang = vi.fn(() => 'ja_JP')
      const manager = useDragDrop(onFileDrop, getLang)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      callback({ payload: { type: 'drop', paths: ['/test.pdf'] } })
      
      expect(getLang).toHaveBeenCalled()
      expect(ElNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'ja_JP:dragDrop.title'
        })
      )
    })

    it('应该支持 Ref 形式的语言参数', async () => {
      const lang = ref('ko_KR')
      const manager = useDragDrop(onFileDrop, lang)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      callback({ payload: { type: 'drop', paths: ['/test.pdf'] } })
      
      expect(ElNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'ko_KR:dragDrop.title'
        })
      )
    })

    it('应该在 Ref 为 undefined 时使用默认值', async () => {
      const manager = useDragDrop(onFileDrop, undefined)
      await manager.setupDragDrop()
      
      const callback = mockWebview.onDragDropEvent.mock.calls[0][0]
      callback({ payload: { type: 'drop', paths: ['/test.pdf'] } })
      
      expect(ElNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'zh_CN:dragDrop.title'
        })
      )
    })
  })
})
