/**
 * 未保存修改检查工具
 * 用于在执行可能丢失修改的操作前检查并提示用户
 */

import { ElMessageBox } from 'element-plus'
import { h } from 'vue'

/**
 * 检查是否有未保存的修改，如果有则显示确认对话框（支持三按钮）
 * @param {boolean} isContentModified - 当前内容是否被修改
 * @param {Object} i18nConfig - 国际化配置对象，包含 title、message、confirmButtonText、cancelButtonText、thirdButtonText（可选）
 * @param {boolean} showThreeButtons - 是否显示三个按钮
 * @returns {Promise<'save' | 'discard' | 'cancel'>} - 'save': 保存并继续，'discard': 不保存继续，'cancel': 取消操作
 */
export async function checkUnsavedChanges(isContentModified, i18nConfig, showThreeButtons = false) {
  if (!isContentModified) {
    return 'continue'
  }

  // 如果需要显示三个按钮，使用 VNode 自定义消息内容
  if (showThreeButtons && i18nConfig.thirdButtonText) {
    return new Promise((resolve) => {
      let dismissed = false

      const dismiss = (result) => {
        if (dismissed) return
        dismissed = true
        resolve(result)
      }

      const msgVNode = h('div', [
        h('p', { style: 'margin: 0 0 16px;' }, i18nConfig.message),
        h('div', { style: 'display: flex; justify-content: flex-end; gap: 8px;' }, [
          // 第三个按钮（丢弃）放在最左侧
          h('button', {
            class: 'el-button el-button--default',
            onClick: () => {
              dismiss('discard')
              // 通过 ElMessageBox 关闭机制关闭
              const btns = document.querySelector('.el-message-box__btns')
              if (btns) {
                const cancelBtn = btns.querySelector('.el-button--default')
                if (cancelBtn) cancelBtn.click()
              }
            }
          }, i18nConfig.thirdButtonText),
        ])
      ])

      ElMessageBox({
        title: i18nConfig.title,
        message: msgVNode,
        type: 'warning',
        distinguishCancelAndClose: true,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: i18nConfig.confirmButtonText,
        cancelButtonText: i18nConfig.cancelButtonText,
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            dismiss('save')
          } else if (action === 'cancel') {
            dismiss('cancel')
          } else {
            // close (X button or Escape)
            dismiss('cancel')
          }
          done()
        }
      }).then(() => {}).catch(() => {
        dismiss('cancel')
      })
    })
  }

  // 默认行为：两个按钮
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
