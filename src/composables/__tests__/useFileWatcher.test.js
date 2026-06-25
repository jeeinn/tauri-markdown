/**
 * useFileWatcher composable 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFileWatcher, SELF_SAVE_SUPPRESS_MS } from '../useFileWatcher.js'

describe('createFileWatcher', () => {
  let mockUnwatch
  let mockWatchFn
  let mockExistsFn
  let watcher

  beforeEach(() => {
    vi.clearAllMocks()
    mockUnwatch = vi.fn()
    mockWatchFn = vi.fn().mockResolvedValue(mockUnwatch)
    mockExistsFn = vi.fn().mockResolvedValue(true)
    watcher = createFileWatcher({
      watchFn: mockWatchFn,
      existsFn: mockExistsFn,
    })
  })

  it('startWatch 应注册 watch 并在变更时回调', async () => {
    const onChange = vi.fn()
    await watcher.startWatch('/test/file.md', { onChange })

    expect(mockWatchFn).toHaveBeenCalledWith(
      '/test/file.md',
      expect.any(Function),
      expect.objectContaining({ recursive: false })
    )
    expect(watcher.getWatchedPath()).toBe('/test/file.md')

    const callback = mockWatchFn.mock.calls[0][1]
    await callback()

    expect(mockExistsFn).toHaveBeenCalledWith('/test/file.md')
    expect(onChange).toHaveBeenCalledWith({
      type: 'modified',
      filePath: '/test/file.md',
    })
  })

  it('文件被删除时应回调 deleted 类型', async () => {
    mockExistsFn.mockResolvedValue(false)
    const onChange = vi.fn()
    await watcher.startWatch('/test/file.md', { onChange })

    const callback = mockWatchFn.mock.calls[0][1]
    await callback()

    expect(onChange).toHaveBeenCalledWith({
      type: 'deleted',
      filePath: '/test/file.md',
    })
  })

  it('shouldIgnore 返回 true 时应忽略事件', async () => {
    const onChange = vi.fn()
    await watcher.startWatch('/test/file.md', {
      onChange,
      shouldIgnore: () => true,
    })

    const callback = mockWatchFn.mock.calls[0][1]
    await callback()

    expect(onChange).not.toHaveBeenCalled()
  })

  it('suppressEvents 期间应忽略事件', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    await watcher.startWatch('/test/file.md', { onChange })

    watcher.suppressEvents(SELF_SAVE_SUPPRESS_MS)
    const callback = mockWatchFn.mock.calls[0][1]
    await callback()

    expect(onChange).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('stopWatch 应调用 unwatch 并清除路径', async () => {
    await watcher.startWatch('/test/file.md', { onChange: vi.fn() })
    watcher.stopWatch()

    expect(mockUnwatch).toHaveBeenCalled()
    expect(watcher.getWatchedPath()).toBeNull()
  })

  it('切换文件时应先停止旧监听', async () => {
    await watcher.startWatch('/old.md', { onChange: vi.fn() })
    await watcher.startWatch('/new.md', { onChange: vi.fn() })

    expect(mockUnwatch).toHaveBeenCalledTimes(1)
    expect(watcher.getWatchedPath()).toBe('/new.md')
  })
})
