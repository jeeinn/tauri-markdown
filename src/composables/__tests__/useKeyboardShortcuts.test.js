/**
 * useKeyboardShortcuts composable 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts.js'

describe('useKeyboardShortcuts', () => {
  let deps = null
  let result = null
  let mockVditor = null

  beforeEach(() => {
    vi.clearAllMocks()

    mockVditor = {
      newFile: vi.fn(),
      openMdFile: vi.fn(),
      saveMdFile: vi.fn(),
      exportFile: vi.fn(),
      printPage: vi.fn(),
    }

    deps = {
      getMultiTabMode: vi.fn(() => true),
      getActiveVditor: vi.fn(() => mockVditor),
      tabStore: {
        addTab: vi.fn(),
        activeTabId: 'tab1',
        tabs: [
          { id: 'tab1', name: 'Tab 1' },
          { id: 'tab2', name: 'Tab 2' },
        ],
      },
      persistTabs: vi.fn(),
      openFileInTab: vi.fn(),
      handleCloseTab: vi.fn(),
      handleSwitchTab: vi.fn(),
      toggleZenMode: vi.fn(),
    }

    result = useKeyboardShortcuts(deps)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初始化', () => {
    it('应该正确返回 handleKeyboardShortcut 和 cleanup 函数', () => {
      expect(result.handleKeyboardShortcut).toBeDefined()
      expect(typeof result.handleKeyboardShortcut).toBe('function')
      expect(result.cleanup).toBeDefined()
      expect(typeof result.cleanup).toBe('function')
    })
  })

  describe('handleKeyboardShortcut', () => {
    it('应该处理 F11 切换 Zen 模式', () => {
      const event = { key: 'F11', preventDefault: vi.fn() }
      result.handleKeyboardShortcut(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(deps.toggleZenMode).toHaveBeenCalled()
    })

    it('应该处理 Escape 退出 Zen 模式', () => {
      document.body.classList.add('zen-mode')
      const event = { key: 'Escape', preventDefault: vi.fn() }
      result.handleKeyboardShortcut(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(deps.toggleZenMode).toHaveBeenCalledWith(false)

      document.body.classList.remove('zen-mode')
    })

    it('应该在非 Zen 模式下忽略 Escape', () => {
      const event = { key: 'Escape', preventDefault: vi.fn() }
      result.handleKeyboardShortcut(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(deps.toggleZenMode).not.toHaveBeenCalled()
    })

    describe('Ctrl+T - 新建标签页', () => {
      it('应该在多标签模式下新建标签页', () => {
        deps.getMultiTabMode.mockReturnValue(true)
        const event = { key: 't', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(deps.tabStore.addTab).toHaveBeenCalled()
        expect(deps.persistTabs).toHaveBeenCalled()
      })

      it('应该在单文档模式下忽略', () => {
        deps.getMultiTabMode.mockReturnValue(false)
        const event = { key: 't', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(deps.tabStore.addTab).not.toHaveBeenCalled()
      })
    })

    describe('Ctrl+W - 关闭标签页', () => {
      it('应该在多标签模式下关闭当前标签页', () => {
        deps.getMultiTabMode.mockReturnValue(true)
        const event = { key: 'w', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(deps.handleCloseTab).toHaveBeenCalledWith('tab1')
      })

      it('应该在单文档模式下忽略', () => {
        deps.getMultiTabMode.mockReturnValue(false)
        const event = { key: 'w', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(deps.handleCloseTab).not.toHaveBeenCalled()
      })
    })

    describe('Ctrl+Tab - 切换标签页', () => {
      it('应该在多标签模式下切换到下一个标签页', () => {
        deps.getMultiTabMode.mockReturnValue(true)
        const event = { key: 'Tab', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(deps.handleSwitchTab).toHaveBeenCalledWith('tab2')
      })

      it('应该在单文档模式下忽略', () => {
        deps.getMultiTabMode.mockReturnValue(false)
        const event = { key: 'Tab', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(deps.handleSwitchTab).not.toHaveBeenCalled()
      })

      it('应该在只有一个标签时不切换', () => {
        deps.getMultiTabMode.mockReturnValue(true)
        deps.tabStore.tabs = [{ id: 'tab1', name: 'Tab 1' }]
        const event = { key: 'Tab', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(deps.handleSwitchTab).not.toHaveBeenCalled()
      })
    })

    describe('Ctrl+N - 新建文档', () => {
      it('应该在多标签模式下新建标签页', () => {
        deps.getMultiTabMode.mockReturnValue(true)
        const event = { key: 'n', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(deps.tabStore.addTab).toHaveBeenCalled()
        expect(deps.persistTabs).toHaveBeenCalled()
      })

      it('应该在单文档模式下调用 newFile', () => {
        deps.getMultiTabMode.mockReturnValue(false)
        const event = { key: 'n', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockVditor.newFile).toHaveBeenCalled()
      })
    })

    describe('Ctrl+O - 打开文件', () => {
      it('应该在多标签模式下调用 openFileInTab', () => {
        deps.getMultiTabMode.mockReturnValue(true)
        const event = { key: 'o', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(deps.openFileInTab).toHaveBeenCalled()
      })

      it('应该在单文档模式下调用 openMdFile', () => {
        deps.getMultiTabMode.mockReturnValue(false)
        const event = { key: 'o', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockVditor.openMdFile).toHaveBeenCalled()
      })
    })

    describe('Ctrl+S - 保存文件', () => {
      it('应该调用 saveMdFile', () => {
        const event = { key: 's', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockVditor.saveMdFile).toHaveBeenCalled()
      })
    })

    describe('Ctrl+Shift+S - 导出文件', () => {
      it('应该调用 exportFile', () => {
        const event = { key: 'S', ctrlKey: true, shiftKey: true, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockVditor.exportFile).toHaveBeenCalled()
      })
    })

    describe('Ctrl+P - 打印', () => {
      it('应该调用 printPage', () => {
        const event = { key: 'p', ctrlKey: true, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockVditor.printPage).toHaveBeenCalled()
      })
    })

    describe('Mac 键盘支持', () => {
      it('应该支持 Mac 上的 Command 键', () => {
        const originalPlatform = navigator.platform
        Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true })

        const event = { key: 's', metaKey: true, ctrlKey: false, shiftKey: false, preventDefault: vi.fn() }
        result.handleKeyboardShortcut(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockVditor.saveMdFile).toHaveBeenCalled()

        Object.defineProperty(navigator, 'platform', { value: originalPlatform, configurable: true })
      })
    })

    it('应该忽略不匹配的按键', () => {
      const event = { key: 'x', ctrlKey: false, shiftKey: false, preventDefault: vi.fn() }
      result.handleKeyboardShortcut(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('应该正确清理事件监听器', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      result.cleanup()

      expect(removeSpy).toHaveBeenCalledWith('keydown', result.handleKeyboardShortcut)

      removeSpy.mockRestore()
    })
  })
})