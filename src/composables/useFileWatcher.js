/**
 * 外部文件变更监听
 *
 * 使用 tauri-plugin-fs 的 watch API 监听已打开文件，
 * 在磁盘内容变更时通知调用方。
 */

import { watch, exists } from '@tauri-apps/plugin-fs'

/** 自身保存后抑制 watch 事件的默认时长（毫秒），略大于防抖延迟 */
export const SELF_SAVE_SUPPRESS_MS = 800

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
 *   stopWatch: () => Promise<void>,
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
  let operationQueue = Promise.resolve()

  function enqueueOperation(task) {
    const next = operationQueue.then(task, task)
    operationQueue = next.catch(() => {})
    return next
  }

  function releaseUnwatch() {
    if (!unwatch) return
    const fn = unwatch
    unwatch = null
    try {
      fn()
    } catch (error) {
      console.error('[FileWatcher] 释放 watcher 失败:', error)
    }
  }

  /** 停止监听并释放资源 */
  function stopWatch() {
    return enqueueOperation(async () => {
      releaseUnwatch()
      watchedPath = null
    })
  }

  /**
   * 开始监听指定文件（串行化，避免并发泄漏 OS watcher）
   *
   * @param {string} filePath
   * @param {Object} handlers
   * @param {() => boolean} [handlers.shouldIgnore] - 返回 true 时忽略事件
   * @param {(payload: { type: 'modified'|'deleted', filePath: string }) => void|Promise<void>} handlers.onChange
   */
  async function startWatch(filePath, handlers) {
    return enqueueOperation(async () => {
      releaseUnwatch()
      watchedPath = null

      if (!filePath) return

      const targetPath = filePath
      let unwatchFn
      try {
        unwatchFn = await watchFn(
          targetPath,
          async () => {
            try {
              if (handlers.shouldIgnore?.()) return
              if (Date.now() < suppressUntil) return
              if (watchedPath !== targetPath) return

              const fileExists = await existsFn(targetPath)
              await handlers.onChange({
                type: fileExists ? 'modified' : 'deleted',
                filePath: targetPath,
              })
            } catch (error) {
              console.error('[FileWatcher] watch 回调处理失败:', error)
            }
          },
          { delayMs: WATCH_DEBOUNCE_MS, recursive: false }
        )
      } catch (error) {
        console.error('[FileWatcher] 启动监听失败:', error)
        throw error
      }

      unwatch = unwatchFn
      watchedPath = targetPath
    })
  }

  /**
   * 在指定时间内忽略 watch 事件（用于自身保存）
   * 多次调用取最晚过期时间，不会被 startWatch 重置
   * @param {number} [durationMs]
   */
  function suppressEvents(durationMs = SELF_SAVE_SUPPRESS_MS) {
    const nextUntil = Date.now() + durationMs
    suppressUntil = Math.max(suppressUntil, nextUntil)
  }

  function getWatchedPath() {
    return watchedPath
  }

  return { startWatch, stopWatch, suppressEvents, getWatchedPath }
}
