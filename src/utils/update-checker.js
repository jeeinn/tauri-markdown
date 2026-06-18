/**
 * 应用更新检查工具
 *
 * 从 App.vue 提取，降低组件复杂度。
 */

import { ElMessageBox, ElNotification } from 'element-plus'

const DEBUG = import.meta.env.DEV

/**
 * 检查应用更新
 *
 * @param {Object} options
 * @param {Object} options.i18n - updater 相关的国际化文本
 * @param {boolean} [options.manual=false] - 是否手动触发（手动时无更新会提示）
 */
export async function checkForUpdate({ i18n = {}, manual = false } = {}) {
  const updaterI18n = i18n

  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const { relaunch } = await import('@tauri-apps/plugin-process')

    if (DEBUG) console.log('[updater] checking for update...')
    const update = await check()
    if (DEBUG) console.log('[updater] check result:', update)

    if (update) {
      ElMessageBox({
        title: updaterI18n.available || '发现新版本',
        message: (updaterI18n.availableMsg || '新版本 {version} 已发布，是否立即更新？').replace('{version}', update.version),
        showCancelButton: true,
        confirmButtonText: '更新',
        cancelButtonText: '取消',
        beforeClose: async (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true
            instance.confirmButtonText = updaterI18n.downloading || '正在下载...'
            try {
              let progressText = ''
              let downloaded = 0
              let contentLength = 0
              await update.downloadAndInstall((event) => {
                if (event.event === 'Started') {
                  contentLength = event.data.contentLength || 0
                  const totalMB = contentLength > 0 ? (contentLength / 1024 / 1024).toFixed(2) : '未知'
                  instance.message = `${updaterI18n.downloading || '正在下载更新'} (总大小: ${totalMB} MB)...`
                } else if (event.event === 'Progress') {
                  downloaded += event.data.chunkLength || 0
                  const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0
                  const downloadedMB = (downloaded / 1024 / 1024).toFixed(2)
                  const msg = `${(updaterI18n.downloadProgress || '下载进度: {progress}%').replace('{progress}', percent)} (${downloadedMB} MB)`
                  if (msg !== progressText) {
                    instance.message = msg
                    progressText = msg
                  }
                } else if (event.event === 'Finished') {
                  instance.message = updaterI18n.downloadComplete || '下载完成，准备安装...'
                }
              })
              done()
              ElMessageBox({
                title: updaterI18n.available || '更新就绪',
                message: updaterI18n.installConfirm || '更新已下载完成，是否立即重启应用以完成安装？',
                showCancelButton: true,
                confirmButtonText: '重启',
                cancelButtonText: '稍后',
              }).then(() => relaunch()).catch(() => {})
            } catch (err) {
              done()
              ElNotification.error({ title: updaterI18n.error || '更新失败', message: (updaterI18n.errorMsg || '更新失败: {error}').replace('{error}', String(err)) })
            }
          } else {
            done()
          }
        },
      }).catch(() => {})
    } else if (manual) {
      ElNotification.info({ title: updaterI18n.noUpdate || '检查更新', message: updaterI18n.noUpdateMsg || '当前版本已是最新' })
    }
  } catch (err) {
    console.error('[updater] check error:', err)
    if (manual) {
      ElNotification.error({ title: updaterI18n.error || '更新失败', message: (updaterI18n.errorMsg || '检查更新时发生错误: {error}').replace('{error}', String(err)) })
    }
  }
}
