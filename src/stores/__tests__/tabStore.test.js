/**
 * Pinia Tab Store 单元测试
 *
 * 测试覆盖：addTab, switchTab, closeTab, updateTab, saveTabs, loadTabs
 *
 * Requirements: 2.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock uuid 以生成可预测的 ID
let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${++uuidCounter}`,
}))

// Mock Tauri store utilities
vi.mock('../../utils/store.js', () => ({
  saveTabs: vi.fn().mockResolvedValue(undefined),
  loadTabs: vi.fn().mockResolvedValue([]),
  saveActiveTabId: vi.fn().mockResolvedValue(undefined),
  loadActiveTabId: vi.fn().mockResolvedValue(null),
}))

// ─── Test Helpers ─────────────────────────────────────────────────────────────

async function getStore() {
  // re-import after pinia is active so the store uses the correct pinia instance
  const { useTabStore } = await import('../tabStore.js')
  return useTabStore()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTabStore', () => {
  beforeEach(async () => {
    // 每次测试前重置 Pinia 实例
    setActivePinia(createPinia())
    uuidCounter = 0
    vi.clearAllMocks()
    // 重置模块缓存，使 uuid mock 的计数器对每个测试生效
    vi.resetModules()
  })

  // ── addTab ──────────────────────────────────────────────────────────────────

  describe('addTab', () => {
    it('新建标签页时 tabs 数组长度 +1', async () => {
      const store = await getStore()
      expect(store.tabs).toHaveLength(0)

      store.addTab()

      expect(store.tabs).toHaveLength(1)
    })

    it('新建标签页后 activeTabId 指向新标签', async () => {
      const store = await getStore()
      const newTab = store.addTab()

      expect(store.activeTabId).toBe(newTab.id)
    })

    it('新建标签页时传入 filePath 会保存到 tab.filePath', async () => {
      const store = await getStore()
      const tab = store.addTab('/path/to/file.md')

      expect(tab.filePath).toBe('/path/to/file.md')
    })

    it('不传 filePath 时 tab.filePath 为 null', async () => {
      const store = await getStore()
      const tab = store.addTab()

      expect(tab.filePath).toBeNull()
    })

    it('新建标签页后 contentModified 默认为 false', async () => {
      const store = await getStore()
      const tab = store.addTab()

      expect(tab.contentModified).toBe(false)
    })

    it('新建标签页后新 tab.active 为 true，其他标签 active 变为 false', async () => {
      const store = await getStore()
      const tab1 = store.addTab()
      const tab2 = store.addTab()

      expect(tab1.active).toBe(false)
      expect(tab2.active).toBe(true)
    })

    it('activeTab computed 应返回新建的活跃标签', async () => {
      const store = await getStore()
      const tab = store.addTab('/file.md')

      expect(store.activeTab).not.toBeNull()
      expect(store.activeTab.id).toBe(tab.id)
    })

    it('新建标签页返回完整的 tab 对象', async () => {
      const store = await getStore()
      const tab = store.addTab()

      expect(tab).toMatchObject({
        contentModified: false,
        active: true,
        scrollPosition: 0,
        editMode: 'ir',
      })
      expect(typeof tab.id).toBe('string')
    })
  })

  // ── switchTab ───────────────────────────────────────────────────────────────

  describe('switchTab', () => {
    it('切换标签后 activeTabId 更新为目标 tab ID', async () => {
      const store = await getStore()
      const tab1 = store.addTab()
      const tab2 = store.addTab()

      store.switchTab(tab1.id)

      expect(store.activeTabId).toBe(tab1.id)
    })

    it('切换后目标标签 active 为 true，其他为 false', async () => {
      const store = await getStore()
      const tab1 = store.addTab()
      const tab2 = store.addTab()
      const tab3 = store.addTab()

      store.switchTab(tab1.id)

      expect(tab1.active).toBe(true)
      expect(tab2.active).toBe(false)
      expect(tab3.active).toBe(false)
    })

    it('切换到不存在的 tabId 时什么都不做', async () => {
      const store = await getStore()
      const tab1 = store.addTab()

      store.switchTab('non-existent-id')

      // activeTabId 保持不变
      expect(store.activeTabId).toBe(tab1.id)
    })
  })

  // ── closeTab ─────────────────────────────────────────────────────────────────

  describe('closeTab', () => {
    it('关闭标签后 tabs 数组长度 -1', async () => {
      const store = await getStore()
      store.addTab()
      const tab2 = store.addTab()

      store.closeTab(tab2.id)

      expect(store.tabs).toHaveLength(1)
    })

    it('关闭当前活跃标签后切换到相邻标签', async () => {
      const store = await getStore()
      const tab1 = store.addTab()
      const tab2 = store.addTab()
      const tab3 = store.addTab()

      // tab3 is active; close it → should switch to tab2 (index - 1) or remaining[index]
      store.closeTab(tab3.id)

      expect(store.activeTabId).toBe(tab2.id)
    })

    it('关闭第一个标签后切换到新的第一个', async () => {
      const store = await getStore()
      const tab1 = store.addTab()
      const tab2 = store.addTab()
      const tab3 = store.addTab()

      store.switchTab(tab1.id)
      store.closeTab(tab1.id)

      // 关闭后 index=0 处变为 tab2
      expect(store.activeTabId).toBe(tab2.id)
    })

    it('关闭最后一个标签后 activeTabId 为 null', async () => {
      const store = await getStore()
      const tab = store.addTab()

      store.closeTab(tab.id)

      expect(store.activeTabId).toBeNull()
      expect(store.tabs).toHaveLength(0)
    })

    it('关闭不活跃标签时不改变 activeTabId', async () => {
      const store = await getStore()
      const tab1 = store.addTab()
      const tab2 = store.addTab()

      // tab2 is active
      store.closeTab(tab1.id)

      expect(store.activeTabId).toBe(tab2.id)
    })

    it('关闭不存在的 tabId 返回 false', async () => {
      const store = await getStore()
      store.addTab()

      const result = store.closeTab('non-existent-id')

      expect(result).toBe(false)
    })

    it('成功关闭时返回 true', async () => {
      const store = await getStore()
      const tab = store.addTab()

      const result = store.closeTab(tab.id)

      expect(result).toBe(true)
    })
  })

  // ── updateTab ────────────────────────────────────────────────────────────────

  describe('updateTab', () => {
    it('patch 对象中的属性应合并到对应标签', async () => {
      const store = await getStore()
      const tab = store.addTab()

      store.updateTab(tab.id, { contentModified: true, scrollPosition: 0.5 })

      expect(tab.contentModified).toBe(true)
      expect(tab.scrollPosition).toBe(0.5)
    })

    it('patch 不应影响其他标签', async () => {
      const store = await getStore()
      const tab1 = store.addTab()
      const tab2 = store.addTab()

      store.updateTab(tab1.id, { contentModified: true })

      expect(tab2.contentModified).toBe(false)
    })

    it('updateTab 对不存在的 tabId 应无副作用', async () => {
      const store = await getStore()
      const tab = store.addTab()

      // 不应抛出错误
      expect(() => store.updateTab('non-existent', { contentModified: true })).not.toThrow()
      expect(tab.contentModified).toBe(false)
    })
  })

  // ── hasUnsavedChanges ────────────────────────────────────────────────────────

  describe('hasUnsavedChanges', () => {
    it('所有标签 contentModified 为 false 时返回 false', async () => {
      const store = await getStore()
      store.addTab()
      store.addTab()

      expect(store.hasUnsavedChanges).toBe(false)
    })

    it('任意标签 contentModified 为 true 时返回 true', async () => {
      const store = await getStore()
      const tab1 = store.addTab()
      store.addTab()

      store.updateTab(tab1.id, { contentModified: true })

      expect(store.hasUnsavedChanges).toBe(true)
    })
  })

  // ── saveTabs ─────────────────────────────────────────────────────────────────

  describe('saveTabs', () => {
    it('调用 saveTabs 应将 tabs 和 activeTabId 传递给 store.js', async () => {
      const storeUtils = await import('../../utils/store.js')
      const store = await getStore()
      store.addTab('/file.md')

      await store.saveTabs()

      expect(storeUtils.saveTabs).toHaveBeenCalledWith(store.tabs)
      expect(storeUtils.saveActiveTabId).toHaveBeenCalledWith(store.activeTabId)
    })

    it('saveTabs 出现异常时不应向外抛出', async () => {
      const storeUtils = await import('../../utils/store.js')
      storeUtils.saveTabs.mockRejectedValueOnce(new Error('save failed'))

      const store = await getStore()
      store.addTab()

      await expect(store.saveTabs()).resolves.not.toThrow()
    })
  })

  // ── loadTabs ─────────────────────────────────────────────────────────────────

  describe('loadTabs', () => {
    it('从 store.js 加载的标签应填充到 tabs', async () => {
      const storeUtils = await import('../../utils/store.js')
      const savedTabs = [
        { id: 'saved-1', filePath: '/a.md', contentModified: false, active: true, scrollPosition: 0, editMode: 'ir' },
        { id: 'saved-2', filePath: '/b.md', contentModified: false, active: false, scrollPosition: 0, editMode: 'ir' },
      ]
      storeUtils.loadTabs.mockResolvedValueOnce(savedTabs)
      storeUtils.loadActiveTabId.mockResolvedValueOnce('saved-1')

      const store = await getStore()
      await store.loadTabs()

      expect(store.tabs).toHaveLength(2)
      expect(store.activeTabId).toBe('saved-1')
    })

    it('若 activeTabId 不在已加载标签列表中，应回退到第一个标签', async () => {
      const storeUtils = await import('../../utils/store.js')
      const savedTabs = [
        { id: 'saved-1', filePath: '/a.md', contentModified: false, active: false, scrollPosition: 0, editMode: 'ir' },
      ]
      storeUtils.loadTabs.mockResolvedValueOnce(savedTabs)
      storeUtils.loadActiveTabId.mockResolvedValueOnce('stale-id') // 不存在的 ID

      const store = await getStore()
      await store.loadTabs()

      expect(store.activeTabId).toBe('saved-1')
    })

    it('store.js 返回空数组时 tabs 保持为空', async () => {
      const storeUtils = await import('../../utils/store.js')
      storeUtils.loadTabs.mockResolvedValueOnce([])

      const store = await getStore()
      await store.loadTabs()

      expect(store.tabs).toHaveLength(0)
      expect(store.activeTabId).toBeNull()
    })

    it('loadTabs 出现异常时不应向外抛出', async () => {
      const storeUtils = await import('../../utils/store.js')
      storeUtils.loadTabs.mockRejectedValueOnce(new Error('load failed'))

      const store = await getStore()

      await expect(store.loadTabs()).resolves.not.toThrow()
    })

    it('加载后活跃标签的 active 标记应为 true', async () => {
      const storeUtils = await import('../../utils/store.js')
      const savedTabs = [
        { id: 'saved-1', filePath: '/a.md', contentModified: false, active: false, scrollPosition: 0, editMode: 'ir' },
        { id: 'saved-2', filePath: '/b.md', contentModified: false, active: false, scrollPosition: 0, editMode: 'ir' },
      ]
      storeUtils.loadTabs.mockResolvedValueOnce(savedTabs)
      storeUtils.loadActiveTabId.mockResolvedValueOnce('saved-2')

      const store = await getStore()
      await store.loadTabs()

      const active = store.tabs.find(t => t.id === 'saved-2')
      const inactive = store.tabs.find(t => t.id === 'saved-1')
      expect(active.active).toBe(true)
      expect(inactive.active).toBe(false)
    })
  })
})
