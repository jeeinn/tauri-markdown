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
    storeModule = await import('./store.js')
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
