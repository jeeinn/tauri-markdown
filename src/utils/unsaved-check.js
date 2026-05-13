/**
 * 未保存修改检查工具
 * 用于在执行可能丢失修改的操作前检查并提示用户
 */

import { ElMessageBox } from 'element-plus'

/**
 * 检查是否有未保存的修改，如果有则显示确认对话框
 * @param {boolean} isContentModified - 当前内容是否被修改
 * @param {Object} i18nConfig - 国际化配置对象，包含 title、message、confirmButtonText、cancelButtonText
 * @returns {Promise<boolean>} - true: 继续执行，false: 取消操作
 */
export async function checkUnsavedChanges(isContentModified, i18nConfig) {
  if (!isContentModified) {
    return true
  }

  try {
    await ElMessageBox.confirm(
      i18nConfig.message,
      i18nConfig.title,
      {
        confirmButtonText: i18nConfig.confirmButtonText,
        cancelButtonText: i18nConfig.cancelButtonText,
        type: 'warning'
      }
    )
    return true
  } catch {
    return false
  }
}
