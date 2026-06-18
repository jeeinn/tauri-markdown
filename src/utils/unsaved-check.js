/**
 * 未保存修改检查工具
 * 用于在执行可能丢失修改的操作前检查并提示用户
 */

import { ElMessageBox } from 'element-plus'

/**
 * 检查是否有未保存的修改，如果有则显示确认对话框（支持三按钮）
 * @param {boolean} isContentModified - 当前内容是否被修改
 * @param {Object} i18nConfig - 国际化配置对象，包含 title、message、confirmButtonText、cancelButtonText、thirdButtonText（可选）
 * @param {boolean} showThreeButtons - 是否显示三个按钮（仅用于窗口关闭场景）
 * @returns {Promise<'save' | 'discard' | 'cancel'>} - 'save': 保存并继续，'discard': 不保存继续，'cancel': 取消操作
 */
export async function checkUnsavedChanges(isContentModified, i18nConfig, showThreeButtons = false) {
  if (!isContentModified) {
    return 'save'
  }

  // 如果需要显示三个按钮（窗口关闭场景），使用自定义对话框
  if (showThreeButtons && i18nConfig.thirdButtonText) {
    return new Promise((resolve) => {
      let dismissed = false

      const dismiss = (result) => {
        if (dismissed) return
        dismissed = true
        resolve(result)
      }

      ElMessageBox({
        title: i18nConfig.title,
        message: i18nConfig.message,
        type: 'warning',
        distinguishCancelAndClose: true,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: i18nConfig.confirmButtonText,
        cancelButtonText: i18nConfig.cancelButtonText,
        // 通过 CSS 和 DOM 操作添加第三个按钮
        customClass: 'three-buttons-dialog',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            dismiss('save')
            done()
          } else if (action === 'cancel') {
            dismiss('cancel')
            done()
          } else {
            dismiss('cancel')
            done()
          }
        }
      }).then(() => {}).catch(() => {
        dismiss('cancel')
      })

      // 在对话框渲染后添加第三个按钮到底部
      setTimeout(() => {
        const dialogElement = document.querySelector('.three-buttons-dialog')
        if (dialogElement) {
          const footer = dialogElement.querySelector('.el-message-box__btns')
          if (footer) {
            const thirdButton = document.createElement('button')
            thirdButton.className = 'el-button el-button--default'
            thirdButton.textContent = i18nConfig.thirdButtonText
            thirdButton.onclick = () => {
              dismiss('discard')
              // 关闭对话框（Element Plus 关闭按钮选择器）
              const closeBtn = dialogElement.querySelector('.el-message-box__headerbtn')
              if (closeBtn) closeBtn.click()
            }
            // 插入到最前面（丢弃按钮在左侧）
            footer.insertBefore(thirdButton, footer.firstChild)
          }
        }
      }, 100)
    })
  }

  // 默认行为：两个按钮（用于新建、打开、导出等场景）
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
    return 'save'
  } catch {
    return 'cancel'
  }
}
