/**
 * Pinia Tab Store
 *
 * 管理多标签页编辑器的核心状态：
 * - tabs: 所有标签页数组
 * - activeTabId: 当前活跃标签 ID
 *
 * 提供的 Actions：
 * - addTab(filePath?)
 * - switchTab(tabId)
 * - closeTab(tabId)
 * - updateTab(tabId, patch)
 * - saveTabs()
 * - loadTabs()
 *
 * Requirements: 2.3
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateTabId, getTabTitle } from '../utils/tab-utils.js'
import {
  saveTabs as storeSaveTabs,
  loadTabs as storeLoadTabs,
  saveActiveTabId as storeSaveActiveTabId,
  loadActiveTabId as storeLoadActiveTabId,
} from '../utils/store.js'

export const useTabStore = defineStore('tab', () => {
  // ─── State ────────────────────────────────────────────────────────────────

  /** @type {import('vue').Ref<Array<{
   *   id: string,
   *   filePath: string|null,
   *   contentModified: boolean,
   *   active: boolean,
   *   scrollPosition: number,
   *   editMode: 'ir'|'sv'|'wysiwyg'
   * }>>} */
  const tabs = ref([])

  /** @type {import('vue').Ref<string|null>} */
  const activeTabId = ref(null)

  // ─── Computed ─────────────────────────────────────────────────────────────

  /** 当前活跃标签页对象，未找到时返回 null */
  const activeTab = computed(() =>
    tabs.value.find(t => t.id === activeTabId.value) ?? null
  )

  /** 是否存在任何未保存修改的标签页 */
  const hasUnsavedChanges = computed(() =>
    tabs.value.some(t => t.contentModified)
  )

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * 根据 filePath 创建新的 Tab 对象
   * @param {string|null} filePath
   * @returns {object} Tab 对象
   */
  function createTab(filePath = null) {
    return {
      id: generateTabId(),
      filePath,
      contentModified: false,
      fileMissing: false,
      active: true,
      scrollPosition: 0,
      editMode: 'ir',
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * 新建标签页
   *
   * 创建新 Tab 对象并设为活跃；将其他标签的 active 置为 false。
   *
   * @param {string|null} [filePath] - 文件路径，null 表示新建空白文档
   * @returns {object} 新创建的 Tab 对象
   */
  function addTab(filePath = null) {
    const newTab = createTab(filePath)

    // 取消当前所有标签的 active 标记
    tabs.value.forEach(t => { t.active = false })

    tabs.value.push(newTab)
    activeTabId.value = newTab.id

    return newTab
  }

  /**
   * 切换到指定标签页
   *
   * 更新 activeTabId 并同步各标签的 active 标记。
   * 切换前不在这里保存滚动位置，由调用方（组件）负责在切换前调用
   * saveTabScrollPosition() 并通过 updateTab() 写回。
   *
   * @param {string} tabId - 要切换到的标签 ID
   */
  function switchTab(tabId) {
    if (!tabs.value.some(t => t.id === tabId)) return

    activeTabId.value = tabId
    tabs.value.forEach(t => { t.active = (t.id === tabId) })
  }

  /**
   * 关闭指定标签页
   *
   * 移除标签并在必要时切换到相邻标签。
   * 注意：未保存修改的提示由调用方（App.vue）在调用前处理。
   *
   * @param {string} tabId - 要关闭的标签 ID
   * @returns {boolean} 是否成功关闭
   */
  function closeTab(tabId) {
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return false

    tabs.value.splice(index, 1)

    // 如果关闭的是当前活跃标签，切换到相邻标签
    if (activeTabId.value === tabId) {
      if (tabs.value.length === 0) {
        activeTabId.value = null
      } else {
        // 优先切换到原来位置的标签，否则前一个
        const nextTab = tabs.value[index] ?? tabs.value[index - 1]
        activeTabId.value = nextTab.id
      }
      // 同步所有标签的 active 标记
      tabs.value.forEach(t => { t.active = (t.id === activeTabId.value) })
    }

    return true
  }

  /**
   * 更新指定标签的部分属性（patch 合并）
   *
   * @param {string} tabId - 目标标签 ID
   * @param {object} patch - 要合并的属性对象
   */
  function updateTab(tabId, patch) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) return

    Object.assign(tab, patch)
  }

  /**
   * 将标签从当前位置移动到目标位置（拖拽排序）
   *
   * @param {string} fromId - 被拖动的标签 ID
   * @param {string} toId - 目标位置的标签 ID（在其前面插入）
   */
  function reorderTab(fromId, toId) {
    if (fromId === toId) return

    const fromIndex = tabs.value.findIndex(t => t.id === fromId)
    const toIndex = tabs.value.findIndex(t => t.id === toId)
    if (fromIndex === -1 || toIndex === -1) return

    const [moved] = tabs.value.splice(fromIndex, 1)
    tabs.value.splice(toIndex, 0, moved)
  }

  /**
   * 将当前 tabs 和 activeTabId 持久化到 store.js
   */
  async function saveTabs() {
    try {
      await storeSaveTabs(tabs.value)
      await storeSaveActiveTabId(activeTabId.value)
    } catch (error) {
      console.error('[TabStore] 保存标签状态失败:', error)
    }
  }

  /**
   * 规范化已保存的 Tab 对象，补全缺失字段
   * @param {object} raw - 从持久化存储读取的原始对象
   * @returns {object} 规范化后的 Tab 对象
   */
  function normalizeTab(raw) {
    return {
      id: raw.id || generateTabId(),
      filePath: raw.filePath ?? null,
      contentModified: false, // 恢复时总是从 false 开始（磁盘内容即最新）
      fileMissing: false,
      active: raw.active ?? false,
      scrollPosition: typeof raw.scrollPosition === 'number' ? raw.scrollPosition : 0,
      editMode: ['ir', 'sv', 'wysiwyg'].includes(raw.editMode) ? raw.editMode : 'ir',
    }
  }

  /**
   * 从 store.js 恢复 tabs 和 activeTabId
   *
   * 规范化已保存的 Tab 对象以兼容旧版本数据。
   * 如果 activeTabId 不在恢复的标签列表中，自动选择第一个。
   */
  async function loadTabs() {
    try {
      const savedTabs = await storeLoadTabs()
      const savedActiveId = await storeLoadActiveTabId()

      if (savedTabs && savedTabs.length > 0) {
        // 规范化所有 Tab 对象，补全旧版本可能缺失的字段
        tabs.value = savedTabs.map(normalizeTab)

        // 验证 activeTabId 在已加载的标签中
        const isValidActive = tabs.value.some(t => t.id === savedActiveId)
        activeTabId.value = isValidActive ? savedActiveId : tabs.value[0].id

        // 同步 active 标记
        tabs.value.forEach(t => { t.active = (t.id === activeTabId.value) })
      }
    } catch (error) {
      console.error('[TabStore] 恢复标签状态失败:', error)
    }
  }

  // ─── Expose ───────────────────────────────────────────────────────────────

  return {
    // state
    tabs,
    activeTabId,
    // computed
    activeTab,
    hasUnsavedChanges,
    // actions
    addTab,
    switchTab,
    closeTab,
    reorderTab,
    updateTab,
    saveTabs,
    loadTabs,
  }
})
