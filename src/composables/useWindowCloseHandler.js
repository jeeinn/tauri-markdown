/**
 * 窗口关闭拦截 Composable
 *
 * 从 App.vue 提取，统一处理窗口关闭时的未保存修改检查。
 */

import { getCurrentWindow } from '@tauri-apps/api/window'
import { checkUnsavedChanges } from '../utils/unsaved-check.js'
import { getI18nConfig } from '../utils/i18n-helper.js'

/**
 * 设置窗口关闭拦截
 *
 * @param {Object} deps - 依赖注入
 * @param {Function} deps.getMultiTabMode - 获取多标签模式状态
 * @param {Function} deps.getTabStore - 获取 tab store
 * @param {Function} deps.getTabContentRefs - 获取 tabContentRefs Map
 * @param {Function} deps.getVditorRef - 获取单文档模式的 vditor ref
 * @param {Function} deps.getCurrentLang - 获取当前语言
 * @returns {Promise<Function>} cleanup 函数
 */
export async function setupWindowCloseHandler(deps) {
  const {
    getMultiTabMode,
    getTabStore,
    getTabContentRefs,
    getVditorRef,
    getCurrentLang,
  } = deps

  let _unlisten = null

  try {
    const appWindow = getCurrentWindow()
    _unlisten = await appWindow.onCloseRequested(async (event) => {
      event.preventDefault()

      // 收集有未保存修改的标签/编辑器
      const modifiedItems = []
      if (getMultiTabMode()) {
        const tabStore = getTabStore()
        const tabContentRefs = getTabContentRefs()
        for (const tab of tabStore.tabs) {
          const tc = tabContentRefs.get(tab.id)
          const vd = tc?.vditorRef
          if (vd ? vd.isContentModified : tab.contentModified) {
            modifiedItems.push(vd)
          }
        }
      } else {
        const vd = getVditorRef()
        if (vd?.isContentModified) modifiedItems.push(vd)
      }

      // 无修改，直接退出
      if (modifiedItems.length === 0) {
        await appWindow.destroy()
        return
      }

      // 有修改，弹窗提示
      const i18nNotif = getI18nConfig(getCurrentLang()).notifications
      const msgConfig = i18nNotif.closeWindow?.unsavedChanges || {
        title: '提示', message: '有未保存的修改，是否保存？',
        confirmButtonText: '保存并关闭', cancelButtonText: '取消', thirdButtonText: '丢弃'
      }
      const result = await checkUnsavedChanges(true, msgConfig, true)

      if (result === 'discard') {
        await appWindow.destroy()
      } else if (result === 'save') {
        let allSaved = true
        for (const vd of modifiedItems) {
          if (vd) {
            const saved = await vd.saveMdFile()
            if (!saved) { allSaved = false; break }
          }
        }
        if (allSaved) await appWindow.destroy()
      }
      // cancel → 窗口保持打开
    })
  } catch (error) {
    console.error('[WindowClose] 初始化窗口关闭拦截失败:', error)
  }

  return function cleanup() {
    _unlisten?.()
  }
}
