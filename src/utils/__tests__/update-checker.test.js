/**
 * update-checker 工具函数单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock 在导入前设置
vi.mock('element-plus', () => ({
  ElMessageBox: vi.fn().mockRejectedValue('cancel'),
  ElNotification: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn().mockResolvedValue(null)
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn().mockResolvedValue()
}))

import { checkForUpdate } from '../update-checker.js'
import { ElMessageBox, ElNotification } from 'element-plus'

describe('update-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkForUpdate', () => {
    it('应该检查更新并返回无更新结果', async () => {
      const { check } = await import('@tauri-apps/plugin-updater')
      check.mockResolvedValue(null)

      await checkForUpdate({ manual: true })

      expect(ElNotification.info).toHaveBeenCalled()
    })

    it('应该检查更新并发现新版本', async () => {
      const { check } = await import('@tauri-apps/plugin-updater')
      check.mockResolvedValue({
        version: '2.0.0',
        downloadAndInstall: vi.fn().mockResolvedValue()
      })
      ElMessageBox.mockResolvedValue('confirm')

      await checkForUpdate({ manual: true })

      expect(ElMessageBox).toHaveBeenCalled()
    })

    it('应该在用户取消时不安装更新', async () => {
      const { check } = await import('@tauri-apps/plugin-updater')
      check.mockResolvedValue({
        version: '2.0.0',
        downloadAndInstall: vi.fn().mockResolvedValue()
      })
      ElMessageBox.mockRejectedValue('cancel')

      await checkForUpdate({ manual: true })

      expect(ElNotification.info).not.toHaveBeenCalled()
    })

    it('应该在自动检查时不显示无更新提示', async () => {
      const { check } = await import('@tauri-apps/plugin-updater')
      check.mockResolvedValue(null)

      await checkForUpdate({ manual: false })

      expect(ElNotification.info).not.toHaveBeenCalled()
    })

    it('应该处理检查失败', async () => {
      const { check } = await import('@tauri-apps/plugin-updater')
      check.mockRejectedValue(new Error('Network error'))

      await checkForUpdate({ manual: true })

      expect(ElNotification.error).toHaveBeenCalled()
    })
  })
})