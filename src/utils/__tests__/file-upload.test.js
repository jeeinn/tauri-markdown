/**
 * file-upload 工具函数单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock 在导入前设置
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn().mockResolvedValue(''),
  writeTextFile: vi.fn().mockResolvedValue(),
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
  ElNotification: {
    info: vi.fn(() => ({ close: vi.fn() })),
    error: vi.fn(),
    success: vi.fn()
  },
  ElMessageBox: {
    alert: vi.fn().mockResolvedValue()
  }
}))

vi.mock('./image-path-mapper.js', () => ({
  default: {
    addMapping: vi.fn()
  }
}))

vi.mock('./file-utils.js', () => ({
  calculateFileHash: vi.fn().mockResolvedValue('testhash'),
  isImageFile: vi.fn((file) => file.type.startsWith('image/'))
}))

vi.mock('./image-host-config.js', () => ({
  getImageHostConfig: vi.fn().mockResolvedValue(null),
  uploadToImageHost: vi.fn().mockResolvedValue('https://example.com/image.png'),
  uploadToSMMS: vi.fn().mockResolvedValue('https://example.com/image.png')
}))

import { uploadFiles } from '../file-upload.js'

describe('file-upload', () => {
  const defaultContext = {
    currentFilePath: '/test/document.md',
    i18n: {
      uploading: { title: 'Uploading', message: 'Uploading files...' },
      uploadFailed: { title: 'Failed', message: '{count} files failed' },
      uploadSuccess: { title: 'Success', message: '{count} files succeeded' }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
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
  })
})