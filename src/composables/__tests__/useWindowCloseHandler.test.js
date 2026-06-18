/**
 * useWindowCloseHandler composable 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock 在导入前设置 - getCurrentWindow 返回同步值
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    onCloseRequested: vi.fn().mockResolvedValue(vi.fn()),
    destroy: vi.fn().mockResolvedValue()
  }))
}))

vi.mock('../../utils/unsaved-check.js', () => ({
  checkUnsavedChanges: vi.fn()
}))

vi.mock('../../utils/i18n-helper.js', () => ({
  getI18nConfig: vi.fn(() => ({
    notifications: {
      closeWindow: {
        unsavedChanges: {
          title: '提示',
          message: '有未保存的修改',
          confirmButtonText: '保存并关闭',
          cancelButtonText: '取消',
          thirdButtonText: '丢弃'
        }
      }
    }
  }))
}))

import { getCurrentWindow } from '@tauri-apps/api/window'
import { checkUnsavedChanges } from '../../utils/unsaved-check.js'
import { setupWindowCloseHandler } from '../useWindowCloseHandler.js'

describe('useWindowCloseHandler', () => {
  let deps = null
  let mockWindow = null
  let mockUnlisten = null

  beforeEach(() => {
    vi.clearAllMocks()

    mockUnlisten = vi.fn()
    mockWindow = {
      onCloseRequested: vi.fn().mockResolvedValue(mockUnlisten),
      destroy: vi.fn().mockResolvedValue()
    }
    // 直接替换 mock 实现，返回同步值
    getCurrentWindow.mockReturnValue(mockWindow)

    const tabContentRefs = new Map([
      ['tab1', { vditorRef: { isContentModified: false } }],
      ['tab2', { vditorRef: { isContentModified: true, saveMdFile: vi.fn().mockResolvedValue(true) } }],
    ])

    deps = {
      getMultiTabMode: vi.fn(() => true),
      getTabStore: vi.fn(() => ({
        tabs: [
          { id: 'tab1', contentModified: false },
          { id: 'tab2', contentModified: true },
        ]
      })),
      getTabContentRefs: vi.fn(() => tabContentRefs),
      getVditorRef: vi.fn(() => ({ isContentModified: false })),
      getCurrentLang: vi.fn(() => 'zh_CN'),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setupWindowCloseHandler', () => {
    it('应该返回 cleanup 函数', async () => {
      const cleanup = await setupWindowCloseHandler(deps)

      expect(cleanup).toBeDefined()
      expect(typeof cleanup).toBe('function')
    })

    it('应该注册窗口关闭事件监听器', async () => {
      await setupWindowCloseHandler(deps)

      expect(getCurrentWindow).toHaveBeenCalled()
      expect(mockWindow.onCloseRequested).toHaveBeenCalled()
    })

    describe('关闭请求处理', () => {
      it('应该在无未保存修改时直接关闭窗口', async () => {
        deps.getTabStore.mockReturnValue({
          tabs: [{ id: 'tab1', contentModified: false }]
        })
        deps.getTabContentRefs.mockReturnValue(new Map([
          ['tab1', { vditorRef: { isContentModified: false } }]
        ]))

        await setupWindowCloseHandler(deps)

        const callback = mockWindow.onCloseRequested.mock.calls[0][0]
        const event = { preventDefault: vi.fn() }

        await callback(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockWindow.destroy).toHaveBeenCalled()
        expect(checkUnsavedChanges).not.toHaveBeenCalled()
      })

      it('应该在有未保存修改时调用 checkUnsavedChanges', async () => {
        checkUnsavedChanges.mockResolvedValue('cancel')

        await setupWindowCloseHandler(deps)

        const callback = mockWindow.onCloseRequested.mock.calls[0][0]
        const event = { preventDefault: vi.fn() }

        await callback(event)

        expect(checkUnsavedChanges).toHaveBeenCalled()
        expect(mockWindow.destroy).not.toHaveBeenCalled()
      })

      it('应该在用户选择丢弃时关闭窗口', async () => {
        checkUnsavedChanges.mockResolvedValue('discard')

        await setupWindowCloseHandler(deps)

        const callback = mockWindow.onCloseRequested.mock.calls[0][0]
        const event = { preventDefault: vi.fn() }

        await callback(event)

        expect(checkUnsavedChanges).toHaveBeenCalled()
        expect(mockWindow.destroy).toHaveBeenCalled()
      })

      it('应该在用户选择保存时保存所有修改并关闭窗口', async () => {
        checkUnsavedChanges.mockResolvedValue('save')

        await setupWindowCloseHandler(deps)

        const callback = mockWindow.onCloseRequested.mock.calls[0][0]
        const event = { preventDefault: vi.fn() }

        await callback(event)

        expect(checkUnsavedChanges).toHaveBeenCalled()
        expect(mockWindow.destroy).toHaveBeenCalled()
      })

      it('应该在保存失败时不关闭窗口', async () => {
        checkUnsavedChanges.mockResolvedValue('save')
        const vditorRef = { isContentModified: true, saveMdFile: vi.fn().mockResolvedValue(false) }
        deps.getTabContentRefs.mockReturnValue(new Map([
          ['tab1', { vditorRef }]
        ]))
        deps.getTabStore.mockReturnValue({
          tabs: [{ id: 'tab1', contentModified: true }]
        })

        await setupWindowCloseHandler(deps)

        const callback = mockWindow.onCloseRequested.mock.calls[0][0]
        const event = { preventDefault: vi.fn() }

        await callback(event)

        expect(vditorRef.saveMdFile).toHaveBeenCalled()
        expect(mockWindow.destroy).not.toHaveBeenCalled()
      })

      it('应该支持单文档模式', async () => {
        deps.getMultiTabMode.mockReturnValue(false)
        const vditorRef = { isContentModified: true, saveMdFile: vi.fn().mockResolvedValue(true) }
        deps.getVditorRef.mockReturnValue(vditorRef)
        checkUnsavedChanges.mockResolvedValue('save')

        await setupWindowCloseHandler(deps)

        const callback = mockWindow.onCloseRequested.mock.calls[0][0]
        const event = { preventDefault: vi.fn() }

        await callback(event)

        expect(checkUnsavedChanges).toHaveBeenCalled()
        expect(mockWindow.destroy).toHaveBeenCalled()
      })
    })

    it('应该在初始化失败时捕获错误', async () => {
      getCurrentWindow.mockImplementation(() => {
        throw new Error('Window error')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await setupWindowCloseHandler(deps)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[WindowClose] 初始化窗口关闭拦截失败:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('应该正确取消事件监听', async () => {
      const cleanup = await setupWindowCloseHandler(deps)

      cleanup()

      expect(mockUnlisten).toHaveBeenCalled()
    })

    it('应该在未初始化时安全调用', async () => {
      getCurrentWindow.mockImplementation(() => {
        throw new Error('Error')
      })

      const cleanup = await setupWindowCloseHandler(deps)

      expect(() => cleanup()).not.toThrow()
    })
  })
})