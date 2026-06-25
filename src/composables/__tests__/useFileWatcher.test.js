/**
 * useFileWatcher composable 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

  afterEach(() => {
    vi.useRealTimers()
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
    vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'))
    const onChange = vi.fn()
    await watcher.startWatch('/test/file.md', { onChange })

    watcher.suppressEvents(SELF_SAVE_SUPPRESS_MS)
    const callback = mockWatchFn.mock.calls[0][1]
    await callback()

    expect(onChange).not.toHaveBeenCalled()
  })

  it('stopWatch 应调用 unwatch 并清除路径', async () => {
    await watcher.startWatch('/test/file.md', { onChange: vi.fn() })
    await watcher.stopWatch()

    expect(mockUnwatch).toHaveBeenCalled()
    expect(watcher.getWatchedPath()).toBeNull()
  })

  it('切换文件时应先停止旧监听', async () => {
    await watcher.startWatch('/old.md', { onChange: vi.fn() })
    await watcher.startWatch('/new.md', { onChange: vi.fn() })

    expect(mockUnwatch).toHaveBeenCalledTimes(1)
    expect(watcher.getWatchedPath()).toBe('/new.md')
  })

  it('并发 startWatch 不应泄漏旧 watcher', async () => {
    let resolveFirst
    const firstWatch = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const secondUnwatch = vi.fn()
    mockWatchFn
      .mockImplementationOnce(() => firstWatch)
      .mockResolvedValueOnce(secondUnwatch)

    const first = watcher.startWatch('/first.md', { onChange: vi.fn() })
    const second = watcher.startWatch('/second.md', { onChange: vi.fn() })

    resolveFirst(mockUnwatch)
    await Promise.all([first, second])

    expect(mockUnwatch).toHaveBeenCalled()
    expect(watcher.getWatchedPath()).toBe('/second.md')
  })

  it('watch 回调抛错时不应向外传播', async () => {
    const onChange = vi.fn().mockRejectedValue(new Error('handler failed'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await watcher.startWatch('/test/file.md', { onChange })
    const callback = mockWatchFn.mock.calls[0][1]

    await expect(callback()).resolves.toBeUndefined()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('startWatch 失败后 watchedPath 应为 null', async () => {
    mockWatchFn.mockRejectedValueOnce(new Error('watch failed'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      watcher.startWatch('/bad.md', { onChange: vi.fn() })
    ).rejects.toThrow('watch failed')
    expect(watcher.getWatchedPath()).toBeNull()

    consoleSpy.mockRestore()
  })

  it('suppressEvents 多次调用应延长抑制窗口', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'))
    const onChange = vi.fn()
    await watcher.startWatch('/test/file.md', { onChange })

    watcher.suppressEvents(100)
    vi.advanceTimersByTime(150)
    watcher.suppressEvents(500)

    const callback = mockWatchFn.mock.calls[0][1]
    vi.advanceTimersByTime(200)
    await callback()
    expect(onChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(400)
    await callback()
    expect(onChange).toHaveBeenCalled()
  })
})
