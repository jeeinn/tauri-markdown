/**
 * file-content-compare 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../utils/image-path-mapper.js', () => ({
  default: {
    convertToAssetUrlPure: vi.fn((content) => `converted:${content}`),
  },
}))

import imagePathMapper from '../../utils/image-path-mapper.js'
import {
  normalizeDiskContentForCompare,
  isExternalContentChanged,
} from '../../utils/file-content-compare.js'

describe('file-content-compare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeDiskContentForCompare', () => {
    it('空内容应返回空字符串', () => {
      expect(normalizeDiskContentForCompare('')).toBe('')
      expect(imagePathMapper.convertToAssetUrlPure).not.toHaveBeenCalled()
    })

    it('应通过无副作用转换比较磁盘内容', () => {
      const result = normalizeDiskContentForCompare('# hello')
      expect(imagePathMapper.convertToAssetUrlPure).toHaveBeenCalledWith('# hello')
      expect(result).toBe('converted:# hello')
    })
  })

  describe('isExternalContentChanged', () => {
    it('转换后内容相同应返回 false', () => {
      expect(isExternalContentChanged('# hello', 'converted:# hello')).toBe(false)
    })

    it('转换后内容不同应返回 true', () => {
      expect(isExternalContentChanged('# changed', 'converted:# hello')).toBe(true)
    })
  })
})
