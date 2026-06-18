/**
 * 键盘快捷键 Composable
 *
 * 从 App.vue 提取，集中管理所有键盘快捷键绑定。
 * 通过依赖注入解耦，不直接依赖 Vue 组件实例。
 */

/**
 * 创建键盘快捷键处理器
 *
 * @param {Object} deps - 依赖注入
 * @param {Function} deps.getMultiTabMode - 获取多标签模式状态
 * @param {Function} deps.getActiveVditor - 获取当前活跃编辑器实例
 * @param {Object} deps.tabStore - Pinia tab store
 * @param {Function} deps.persistTabs - 持久化标签页状态
 * @param {Function} deps.openFileInTab - 多标签模式下打开文件
 * @param {Function} deps.handleCloseTab - 关闭标签页
 * @param {Function} deps.handleSwitchTab - 切换标签页
 * @param {Function} deps.toggleZenMode - 切换 Zen 模式
 * @returns {{ handleKeyboardShortcut: Function, cleanup: Function }}
 */
export function useKeyboardShortcuts(deps) {
  const {
    getMultiTabMode,
    getActiveVditor,
    tabStore,
    persistTabs,
    openFileInTab,
    handleCloseTab,
    handleSwitchTab,
    toggleZenMode,
  } = deps

  function handleKeyboardShortcut(event) {
    // F11: 切换 Zen 模式
    if (event.key === 'F11') {
      event.preventDefault()
      toggleZenMode()
      return
    }

    // Escape: 退出 Zen 模式
    if (event.key === 'Escape' && document.body.classList.contains('zen-mode')) {
      event.preventDefault()
      toggleZenMode(false)
      return
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey
    const multiTabMode = getMultiTabMode()

    // Ctrl+T: 新建标签页（仅多标签模式）
    if (ctrlOrCmd && event.key === 't' && !event.shiftKey) {
      if (!multiTabMode) return
      event.preventDefault()
      tabStore.addTab()
      persistTabs()
      return
    }

    // Ctrl+W: 关闭当前标签页（仅多标签模式）
    if (ctrlOrCmd && event.key === 'w' && !event.shiftKey) {
      if (!multiTabMode) return
      event.preventDefault()
      if (tabStore.activeTabId) {
        handleCloseTab(tabStore.activeTabId)
      }
      return
    }

    // Ctrl+Tab: 切换到下一个标签页（仅多标签模式）
    if (ctrlOrCmd && event.key === 'Tab' && !event.shiftKey) {
      if (!multiTabMode) return
      event.preventDefault()
      const tabs = tabStore.tabs
      if (tabs.length > 1) {
        const idx = tabs.findIndex(t => t.id === tabStore.activeTabId)
        const nextIdx = (idx + 1) % tabs.length
        handleSwitchTab(tabs[nextIdx].id)
      }
      return
    }

    // Ctrl+N: 单文档 → 新建空白文档，多标签 → 新建标签页
    if (ctrlOrCmd && event.key === 'n' && !event.shiftKey) {
      event.preventDefault()
      if (multiTabMode) {
        tabStore.addTab()
        persistTabs()
      } else {
        getActiveVditor()?.newFile()
      }
      return
    }

    // Ctrl+O: 打开文件
    if (ctrlOrCmd && event.key === 'o' && !event.shiftKey) {
      event.preventDefault()
      if (multiTabMode) {
        openFileInTab()
      } else {
        getActiveVditor()?.openMdFile()
      }
      return
    }

    // Ctrl+S: 保存文件
    if (ctrlOrCmd && event.key === 's' && !event.shiftKey) {
      event.preventDefault()
      getActiveVditor()?.saveMdFile()
      return
    }

    // Ctrl+Shift+S: 导出文件
    if (ctrlOrCmd && event.shiftKey && event.key === 'S') {
      event.preventDefault()
      getActiveVditor()?.exportFile()
      return
    }

    // Ctrl+P: 打印
    if (ctrlOrCmd && event.key === 'p' && !event.shiftKey) {
      event.preventDefault()
      getActiveVditor()?.printPage()
      return
    }
  }

  function cleanup() {
    window.removeEventListener('keydown', handleKeyboardShortcut)
  }

  return { handleKeyboardShortcut, cleanup }
}
