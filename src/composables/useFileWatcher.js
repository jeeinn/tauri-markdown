/**
 * 外部文件变更监听
 *
 * 使用 tauri-plugin-fs 的 watch API 监听已打开文件，
 * 在磁盘内容变更时通知调用方。
 */

import { watch, exists } from '@tauri-apps/plugin-fs'

/** 自身保存后抑制 watch 事件的默认时长（毫秒） */
export const SELF_SAVE_SUPPRESS_MS = 500

/** watch 防抖延迟（毫秒） */
export const WATCH_DEBOUNCE_MS = 500

/**
 * 创建文件监听器实例
 *
 * @param {Object} [deps] - 可注入依赖，便于测试
 * @param {typeof watch} [deps.watchFn]
 * @param {typeof exists} [deps.existsFn]
 * @returns {{
 *   startWatch: (filePath: string, handlers: object) => Promise<void>,
 *   stopWatch: () => void,
 *   suppressEvents: (durationMs?: number) => void,
 *   getWatchedPath: () => string|null
 * }}
 */
export function createFileWatcher(deps = {}) {
  const watchFn = deps.watchFn ?? watch
  const existsFn = deps.existsFn ?? exists

  let unwatch = null
  let watchedPath = null
  let suppressUntil = 0

  /**
   * 开始监听指定文件
   *
   * @param {string} filePath
   * @param {Object} handlers
   * @param {() => boolean} [handlers.shouldIgnore] - 返回 true 时忽略事件
   * @param {(payload: { type: 'modified'|'deleted', filePath: string }) => void|Promise<void>} handlers.onChange
   */
  async function startWatch(filePath, handlers) {
    await stopWatch()

    if (!filePath) return

    watchedPath = filePath
    suppressUntil = 0

    unwatch = await watchFn(
      filePath,
      async () => {
        if (handlers.shouldIgnore?.()) return
        if (Date.now() < suppressUntil) return
        if (watchedPath !== filePath) return

        const fileExists = await existsFn(filePath)
        await handlers.onChange({
          type: fileExists ? 'modified' : 'deleted',
          filePath,
        })
      },
      { delayMs: WATCH_DEBOUNCE_MS, recursive: false }
    )
  }

  /** 停止监听并释放资源 */
  function stopWatch() {
    if (unwatch) {
      unwatch()
      unwatch = null
    }
    watchedPath = null
  }

  /**
   * 在指定时间内忽略 watch 事件（用于自身保存）
   * @param {number} [durationMs]
   */
  function suppressEvents(durationMs = SELF_SAVE_SUPPRESS_MS) {
    suppressUntil = Date.now() + durationMs
  }

  function getWatchedPath() {
    return watchedPath
  }

  return { startWatch, stopWatch, suppressEvents, getWatchedPath }
}
