/**
 * file-utils 单元测试
 */

import { describe, it, expect } from 'vitest'
import { isImageFile } from '../file-utils.js'

describe('file-utils', () => {
  describe('isImageFile', () => {
    it('应通过 MIME 类型识别图片', () => {
      const file = new File([''], 'photo', { type: 'image/png' })
      expect(isImageFile(file)).toBe(true)
    })

    it('MIME 为空时应通过扩展名识别图片（Windows 常见场景）', () => {
      const file = new File([''], 'screenshot.png', { type: '' })
      expect(isImageFile(file)).toBe(true)
    })

    it('应识别大写扩展名', () => {
      const file = new File([''], 'photo.JPG', { type: '' })
      expect(isImageFile(file)).toBe(true)
    })

    it('非图片文件应返回 false', () => {
      const file = new File([''], 'document.pdf', { type: 'application/pdf' })
      expect(isImageFile(file)).toBe(false)
    })

    it('无 MIME 且无图片扩展名应返回 false', () => {
      const file = new File([''], 'blob', { type: '' })
      expect(isImageFile(file)).toBe(false)
    })
  })
})
