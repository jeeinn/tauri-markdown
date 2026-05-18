/**
 * 拖拽文件打开功能 Composable
 * 
 * 提供文件拖拽到窗口的监听和处理功能
 * 支持 Markdown 文件的拖拽打开
 */

import { getCurrentWebview } from '@tauri-apps/api/webview'
import { ElNotification } from 'element-plus'
import { getI18nText } from '../utils/i18n-helper.js'

/**
 * 创建拖拽文件管理器
 * @param {Function} onFileDrop - 文件拖放回调函数，接收文件路径作为参数
 * @param {Function|Ref<string>} getLang - 获取当前语言的函数或响应式引用
 * @returns {object} 拖拽管理器对象
 */
export function useDragDrop(onFileDrop, getLang) {
  let _unlistenDragDrop = null

  /**
   * 获取当前语言值
   * @returns {string} 当前语言代码
   */
  function getCurrentLang() {
    // 支持函数和 Ref 两种形式
    if (typeof getLang === 'function') {
      return getLang()
    }
    // 如果是 Ref，访问 .value
    return getLang?.value ?? 'zh_CN'
  }

  /**
   * 初始化拖拽文件打开功能
   */
  async function setupDragDrop() {
    try {
      const webview = await getCurrentWebview()
      _unlistenDragDrop = await webview.onDragDropEvent((event) => {
        const { type, paths } = event.payload

        if (type === 'drop') {
          // 文件已拖放
          if (!paths || paths.length === 0) return

          // 查找第一个 Markdown 文件
          const mdFile = paths.find(p =>
            p.endsWith('.md') || p.endsWith('.markdown') || p.endsWith('.txt')
          )

          if (mdFile) {
            console.log('[DragDrop] 拖拽打开文件:', mdFile)
            onFileDrop(mdFile)
          } else {
            // 提示用户只支持 Markdown 文件
            const currentLang = getCurrentLang()
            ElNotification({
              title: getI18nText(currentLang, 'dragDrop.title'),
              message: getI18nText(currentLang, 'dragDrop.unsupported'),
              type: 'warning',
              duration: 3000,
            })
          }
        }
      })
      console.log('[DragDrop] 拖拽文件打开功能已初始化')
    } catch (error) {
      console.error('[DragDrop] 初始化拖拽监听失败:', error)
    }
  }

  /**
   * 清理拖拽监听器
   */
  function cleanup() {
    if (_unlistenDragDrop) {
      _unlistenDragDrop()
      _unlistenDragDrop = null
    }
  }

  return {
    setupDragDrop,
    cleanup
  }
}
