/**
 * Store 工具函数测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: vi.fn(),
  },
}))

describe('Store Utils', () => {
  let mockInvoke
  let mockStoreLoad
  let storeModule

  beforeEach(async () => {
    // 清除所有 mocks
    vi.clearAllMocks()
    
    // 重置模块缓存，确保每次测试都重新导入
    vi.resetModules()
    
    // 获取 mock 函数引用
    const coreModule = await import('@tauri-apps/api/core')
    mockInvoke = coreModule.invoke
    
    const storePlugin = await import('@tauri-apps/plugin-store')
    mockStoreLoad = storePlugin.Store.load
    
    // 导入 store 模块
    storeModule = await import('../store.js')
  })

  describe('便携模式检测', () => {
    it('应该调用后端命令检测便携模式', async () => {
      mockInvoke.mockResolvedValue(true)
      
      // 触发便携模式检测
      await storeModule.getLastFilePath()
      
      expect(mockInvoke).toHaveBeenCalledWith('get_portable_mode')
    })

    it('便携模式检测结果应该被缓存', async () => {
      mockInvoke.mockResolvedValue(true)
      
      // 第一次调用
      await storeModule.getLastFilePath()
      const firstCallCount = mockInvoke.mock.calls.filter(
        call => call[0] === 'get_portable_mode'
      ).length
      
      // 第二次调用
      await storeModule.getLastFilePath()
      const secondCallCount = mockInvoke.mock.calls.filter(
        call => call[0] === 'get_portable_mode'
      ).length
      
      // 应该只调用一次（被缓存）
      expect(firstCallCount).toBe(1)
      expect(secondCallCount).toBe(1)
    })

    it('检测失败时应该降级为正常模式', async () => {
      mockInvoke.mockRejectedValue(new Error('Command failed'))
      
      // 不应该抛出异常
      await expect(storeModule.getLastFilePath()).resolves.not.toThrow()
    })
  })

  describe('Store 路径选择', () => {
    it('便携模式应该调用 get_store_path 获取路径', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'get_portable_mode') return Promise.resolve(true)
        if (cmd === 'get_store_path') return Promise.resolve('/path/to/store.json')
        return Promise.resolve(null)
      })
      
      mockStoreLoad.mockResolvedValue(mockStore)
      
      await storeModule.getLastFilePath()
      
      expect(mockInvoke).toHaveBeenCalledWith('get_store_path')
    })

    it('正常模式不应该调用 get_store_path', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'get_portable_mode') return Promise.resolve(false)
        return Promise.resolve(null)
      })
      
      mockStoreLoad.mockResolvedValue(mockStore)
      
      await storeModule.getLastFilePath()
      
      expect(mockInvoke).not.toHaveBeenCalledWith('get_store_path')
    })

    it('get_store_path 失败时应该降级为相对路径', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'get_portable_mode') return Promise.resolve(true)
        if (cmd === 'get_store_path') return Promise.reject(new Error('Failed'))
        return Promise.resolve(null)
      })
      
      mockStoreLoad.mockResolvedValue(mockStore)
      
      // 不应该抛出异常
      await expect(storeModule.getLastFilePath()).resolves.not.toThrow()
      
      // 应该使用默认的相对路径
      expect(mockStoreLoad).toHaveBeenCalledWith('store.json')
    })
  })

  describe('数据读写功能', () => {
    it('saveLastFilePath 应该保存文件路径', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      const testPath = '/test/file.md'
      await storeModule.saveLastFilePath(testPath)
      
      expect(mockStore.set).toHaveBeenCalledWith('last_opened_file', testPath)
      expect(mockStore.save).toHaveBeenCalled()
    })

    it('getLastFilePath 应该返回保存的文件路径', async () => {
      const testPath = '/test/file.md'
      const mockStore = {
        get: vi.fn().mockResolvedValue(testPath),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      const result = await storeModule.getLastFilePath()
      
      expect(result).toBe(testPath)
      expect(mockStore.get).toHaveBeenCalledWith('last_opened_file')
    })

    it('getLastFilePath 在没有数据时应该返回 null', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      const result = await storeModule.getLastFilePath()
      
      expect(result).toBeNull()
    })

    it('clearLastFilePath 应该清除文件路径', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      await storeModule.clearLastFilePath()
      
      expect(mockStore.delete).toHaveBeenCalledWith('last_opened_file')
      expect(mockStore.save).toHaveBeenCalled()
    })
  })

  describe('主题设置', () => {
    it('saveTheme 应该保存主题偏好', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      await storeModule.saveTheme('dark')
      
      expect(mockStore.set).toHaveBeenCalledWith('app_theme', 'dark')
      expect(mockStore.save).toHaveBeenCalled()
    })

    it('getTheme 应该返回保存的主题', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue('dark'),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      const result = await storeModule.getTheme()
      
      expect(result).toBe('dark')
    })

    it('getTheme 在没有数据时应该返回默认值 auto', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      const result = await storeModule.getTheme()
      
      expect(result).toBe('auto')
    })
  })

  describe('Zen 模式设置', () => {
    it('saveZenMode 应该保存 Zen 模式状态', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      await storeModule.saveZenMode(true)
      
      expect(mockStore.set).toHaveBeenCalledWith('is_zen_mode', true)
      expect(mockStore.save).toHaveBeenCalled()
    })

    it('getZenMode 应该返回保存的状态', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(true),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      const result = await storeModule.getZenMode()
      
      expect(result).toBe(true)
    })

    it('getZenMode 在没有数据时应该返回默认值 false', async () => {
      const mockStore = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      const result = await storeModule.getZenMode()
      
      expect(result).toBe(false)
    })
  })

  describe('多标签页持久化', () => {
    let mockStore

    beforeEach(() => {
      mockStore = {
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
    })

    it('saveTabs 应该将标签页数组保存到 tabs 键', async () => {
      const tabs = [{ id: '1', title: 'tab1' }, { id: '2', title: 'tab2' }]
      await storeModule.saveTabs(tabs)
      expect(mockStore.set).toHaveBeenCalledWith('tabs', tabs)
      expect(mockStore.save).toHaveBeenCalled()
    })

    it('loadTabs 应该返回已保存的标签页数组', async () => {
      const tabs = [{ id: '1', title: 'tab1' }]
      mockStore.get.mockResolvedValue(tabs)
      const result = await storeModule.loadTabs()
      expect(result).toEqual(tabs)
      expect(mockStore.get).toHaveBeenCalledWith('tabs')
    })

    it('loadTabs 在没有数据时应该返回空数组', async () => {
      mockStore.get.mockResolvedValue(null)
      const result = await storeModule.loadTabs()
      expect(result).toEqual([])
    })

    it('loadTabs 在数据非数组时应该返回空数组', async () => {
      mockStore.get.mockResolvedValue('invalid')
      const result = await storeModule.loadTabs()
      expect(result).toEqual([])
    })

    it('saveActiveTabId 应该将活跃标签 ID 保存到 activeTabId 键', async () => {
      await storeModule.saveActiveTabId('tab-123')
      expect(mockStore.set).toHaveBeenCalledWith('activeTabId', 'tab-123')
      expect(mockStore.save).toHaveBeenCalled()
    })

    it('loadActiveTabId 应该返回已保存的活跃标签 ID', async () => {
      mockStore.get.mockResolvedValue('tab-123')
      const result = await storeModule.loadActiveTabId()
      expect(result).toBe('tab-123')
      expect(mockStore.get).toHaveBeenCalledWith('activeTabId')
    })

    it('loadActiveTabId 在没有数据时应该返回 null', async () => {
      mockStore.get.mockResolvedValue(null)
      const result = await storeModule.loadActiveTabId()
      expect(result).toBeNull()
    })

    it('clearAllTabs 应该删除 tabs 和 activeTabId 并保存', async () => {
      await storeModule.clearAllTabs()
      expect(mockStore.delete).toHaveBeenCalledWith('tabs')
      expect(mockStore.delete).toHaveBeenCalledWith('activeTabId')
      expect(mockStore.save).toHaveBeenCalled()
    })
  })

  describe('多标签模式开关', () => {
    let mockStore

    beforeEach(() => {
      mockStore = {
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
    })

    it('saveMultiTabMode 应该将布尔值保存到 multi_tab_mode 键', async () => {
      await storeModule.saveMultiTabMode(false)
      expect(mockStore.set).toHaveBeenCalledWith('multi_tab_mode', false)
      expect(mockStore.save).toHaveBeenCalled()
    })

    it('saveMultiTabMode(true) 应该保存 true', async () => {
      await storeModule.saveMultiTabMode(true)
      expect(mockStore.set).toHaveBeenCalledWith('multi_tab_mode', true)
    })

    it('getMultiTabMode 应该返回已保存的值', async () => {
      mockStore.get.mockResolvedValue(false)
      const result = await storeModule.getMultiTabMode()
      expect(result).toBe(false)
      expect(mockStore.get).toHaveBeenCalledWith('multi_tab_mode')
    })

    it('getMultiTabMode 在没有数据时应该返回 true（默认启用）', async () => {
      mockStore.get.mockResolvedValue(null)
      const result = await storeModule.getMultiTabMode()
      expect(result).toBe(true)
    })

    it('getMultiTabMode 在数据为 false 时应该返回 false', async () => {
      mockStore.get.mockResolvedValue(false)
      const result = await storeModule.getMultiTabMode()
      expect(result).toBe(false)
    })

    it('getMultiTabMode 在数据为 undefined 时应该返回 true', async () => {
      mockStore.get.mockResolvedValue(undefined)
      const result = await storeModule.getMultiTabMode()
      expect(result).toBe(true)
    })
  })

  describe('编辑器字号', () => {
    let mockStore

    beforeEach(() => {
      mockStore = {
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
    })

    it('clampEditorFontSize 应该限制在 10-100 范围内', () => {
      expect(storeModule.clampEditorFontSize(5)).toBe(10)
      expect(storeModule.clampEditorFontSize(120)).toBe(100)
      expect(storeModule.clampEditorFontSize(16.7)).toBe(17)
      expect(storeModule.clampEditorFontSize('abc')).toBe(storeModule.DEFAULT_EDITOR_FONT_SIZE)
    })

    it('saveEditorFontSize 应该保存 clamp 后的字号', async () => {
      await storeModule.saveEditorFontSize(24)
      expect(mockStore.set).toHaveBeenCalledWith('editor_font_size', 24)
      expect(mockStore.save).toHaveBeenCalled()
    })

    it('getEditorFontSize 在没有数据时应该返回默认值 16', async () => {
      mockStore.get.mockResolvedValue(null)
      const result = await storeModule.getEditorFontSize()
      expect(result).toBe(16)
    })

    it('getEditorFontSize 应该返回已保存并 clamp 后的值', async () => {
      mockStore.get.mockResolvedValue(200)
      const result = await storeModule.getEditorFontSize()
      expect(result).toBe(100)
    })

    it('clampOutlineWidth 应该限制在 180-500 范围内', () => {
      expect(storeModule.clampOutlineWidth(100)).toBe(180)
      expect(storeModule.clampOutlineWidth(600)).toBe(500)
      expect(storeModule.clampOutlineWidth(320.6)).toBe(321)
      expect(storeModule.clampOutlineWidth('abc')).toBe(storeModule.DEFAULT_OUTLINE_WIDTH)
    })

    it('saveOutlineWidth 应该保存 clamp 后的宽度', async () => {
      await storeModule.saveOutlineWidth(320)
      expect(mockStore.set).toHaveBeenCalledWith('outline_sidebar_width', 320)
      expect(mockStore.save).toHaveBeenCalled()
    })

    it('getOutlineWidth 在没有数据时应该返回默认值 250', async () => {
      mockStore.get.mockResolvedValue(null)
      const result = await storeModule.getOutlineWidth()
      expect(result).toBe(250)
    })
  })

  describe('错误处理', () => {
    it('Store 加载失败时 getLastFilePath 应该返回 null', async () => {
      const error = new Error('Store load failed')
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockRejectedValue(error)
      
      // getLastFilePath 内部捕获了异常，应该返回 null
      const result = await storeModule.getLastFilePath()
      expect(result).toBeNull()
    })

    it('读写操作失败时不应该抛出异常', async () => {
      const mockStore = {
        get: vi.fn().mockRejectedValue(new Error('Read failed')),
        set: vi.fn().mockRejectedValue(new Error('Write failed')),
        save: vi.fn().mockRejectedValue(new Error('Save failed')),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      
      mockInvoke.mockResolvedValue(false)
      mockStoreLoad.mockResolvedValue(mockStore)
      
      // 这些函数内部捕获了异常，不应该向外抛出
      await expect(storeModule.saveLastFilePath('/test.md')).resolves.not.toThrow()
      await expect(storeModule.getLastFilePath()).resolves.not.toThrow()
      await expect(storeModule.saveTheme('dark')).resolves.not.toThrow()
      await expect(storeModule.getTheme()).resolves.not.toThrow()
    })
  })
})
