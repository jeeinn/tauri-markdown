/**
 * file-upload 工具函数单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockNotification, mockGetImageHostConfig, mockUploadToImageHost, mockUploadToSMMS } = vi.hoisted(() => ({
  mockNotification: {
    info: vi.fn(() => ({ close: vi.fn() })),
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  mockGetImageHostConfig: vi.fn().mockResolvedValue(null),
  mockUploadToImageHost: vi.fn().mockResolvedValue('https://example.com/image.png'),
  mockUploadToSMMS: vi.fn().mockResolvedValue('https://example.com/image.png'),
}))

// Mock 在导入前设置
vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: vi.fn().mockResolvedValue(),
  exists: vi.fn().mockResolvedValue(false),
  mkdir: vi.fn().mockResolvedValue(),
  remove: vi.fn().mockResolvedValue()
}))

vi.mock('@tauri-apps/api/path', () => ({
  dirname: vi.fn().mockResolvedValue('/test'),
  join: vi.fn((...args) => args.join('/')),
  normalize: vi.fn((path) => path),
  tempDir: vi.fn().mockResolvedValue('/tmp')
}))

vi.mock('element-plus', () => ({
  ElNotification: mockNotification,
  ElMessageBox: {
    alert: vi.fn().mockResolvedValue(),
    confirm: vi.fn().mockResolvedValue(),
  }
}))

vi.mock('../image-path-mapper.js', () => ({
  default: {
    addMapping: vi.fn()
  }
}))

vi.mock('../file-utils.js', () => ({
  calculateFileHash: vi.fn().mockResolvedValue('testhash'),
  isImageFile: vi.fn((file) => file.type.startsWith('image/'))
}))

vi.mock('../image-host-config.js', () => ({
  getImageHostConfig: (...args) => mockGetImageHostConfig(...args),
  uploadToImageHost: (...args) => mockUploadToImageHost(...args),
  uploadToSMMS: (...args) => mockUploadToSMMS(...args),
}))

import { uploadFiles } from '../file-upload.js'
import { ElMessageBox } from 'element-plus'
import { mkdir } from '@tauri-apps/plugin-fs'

describe('file-upload', () => {
  const defaultContext = {
    currentFilePath: '/test/document.md',
    i18n: {
      uploading: { title: 'Uploading', message: 'Uploading files...' },
      uploadFailed: {
        title: 'Failed',
        message: '{count} files failed, check permissions',
      },
      uploadFailedImageHost: {
        title: 'Host Failed',
        message: '{count} files failed, check network',
      },
      uploadSuccess: { title: 'Success', message: '{count} files succeeded' },
      uploadFallbackPrompt: {
        title: 'Fallback?',
        message: 'Failed ({reason}), save {count} locally?',
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
      },
      uploadFallbackSuccess: {
        title: 'Fallback OK',
        message: 'Saved {count} locally',
      },
      uploadErrorDetail: { message: '{name}: {reason}' },
      uploadErrorMkdir: { message: 'Failed to create directory' },
      uploadErrorNetwork: { message: 'Network connection failed' },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetImageHostConfig.mockResolvedValue(null)
    mockUploadToSMMS.mockResolvedValue('https://example.com/image.png')
    mkdir.mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('uploadFiles', () => {
    it('应该处理文件上传', async () => {
      const files = [new File(['test content'], 'test.png', { type: 'image/png' })]
      const result = await uploadFiles(files, defaultContext)

      expect(result).toBeDefined()
      expect(result[0].code).toBe(0)
      expect(Object.keys(result[0].data.succMap).length).toBe(1)
    })

    it('应该处理空文件列表', async () => {
      const files = []
      const result = await uploadFiles(files, defaultContext)

      expect(result).toBeDefined()
      expect(result[0].data.errFiles).toEqual([])
      expect(Object.keys(result[0].data.succMap).length).toBe(0)
    })

    it('应该处理未保存文件时的上传', async () => {
      const files = [new File(['test content'], 'test.png', { type: 'image/png' })]
      const context = { ...defaultContext, currentFilePath: null }

      const result = await uploadFiles(files, context)

      expect(result[0].code).toBe(1)
    })

    it('创建目录失败时应显示具体错误', async () => {
      mkdir.mockRejectedValue(new Error('permission denied'))

      const files = [new File(['test content'], 'test.png', { type: 'image/png' })]
      await uploadFiles(files, defaultContext)

      expect(mockNotification.error).toHaveBeenCalled()
      const call = mockNotification.error.mock.calls[0][0]
      expect(call.message).toContain('test.png')
      expect(call.message).toMatch(/permission denied|Failed to create directory|创建目录失败/i)
    })

    it('图床失败且用户确认回退时应保存到本地', async () => {
      mockGetImageHostConfig.mockResolvedValue({
        enabled: true,
        current: 'smms',
        smms: { token: 'token' },
      })
      mockUploadToSMMS.mockRejectedValue(new Error('fetch failed'))

      const files = [new File(['test content'], 'test.png', { type: 'image/png' })]
      const result = await uploadFiles(files, defaultContext)

      expect(ElMessageBox.confirm).toHaveBeenCalled()
      expect(mockNotification.warning).toHaveBeenCalled()
      expect(result[0].data.errFiles).toEqual([])
      expect(Object.keys(result[0].data.succMap).length).toBe(1)
    })

    it('图床失败且用户取消回退时应报告图床失败', async () => {
      mockGetImageHostConfig.mockResolvedValue({
        enabled: true,
        current: 'smms',
        smms: { token: 'token' },
      })
      mockUploadToSMMS.mockRejectedValue(new Error('fetch failed'))
      ElMessageBox.confirm.mockRejectedValue(new Error('cancel'))

      const files = [new File(['test content'], 'test.png', { type: 'image/png' })]
      const result = await uploadFiles(files, defaultContext)

      expect(result[0].data.errFiles).toEqual(['test.png'])
      expect(Object.keys(result[0].data.succMap).length).toBe(0)
      expect(mockNotification.error).toHaveBeenCalled()
      const call = mockNotification.error.mock.calls[0][0]
      expect(call.message).toContain('check network')
    })
  })
})
