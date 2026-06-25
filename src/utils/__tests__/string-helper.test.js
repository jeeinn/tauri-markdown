/**
 * string-helper 单元测试
 */

import { describe, it, expect } from 'vitest'
import { replaceFileNamePlaceholder, getFileNameFromPath } from '../string-helper.js'

describe('replaceFileNamePlaceholder', () => {
  it('应替换 {fileName} 占位符', () => {
    expect(replaceFileNamePlaceholder('文件 "{fileName}" 已变更', 'test.md'))
      .toBe('文件 "test.md" 已变更')
  })

  it('文件名含 $ 时不应触发 replace 特殊语义', () => {
    expect(replaceFileNamePlaceholder('文件 "{fileName}" 已变更', 'test$file.md'))
      .toBe('文件 "test$file.md" 已变更')
  })
})

describe('getFileNameFromPath', () => {
  it('应从 Windows 路径提取文件名', () => {
    expect(getFileNameFromPath('C:\\Users\\wei\\Desktop\\456.md')).toBe('456.md')
  })

  it('空路径应返回空字符串', () => {
    expect(getFileNameFromPath(null)).toBe('')
  })
})
