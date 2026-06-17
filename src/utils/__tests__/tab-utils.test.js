/**
 * Tab 工具函数单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { generateTabId, getTabTitle, saveTabScrollPosition, restoreTabScrollPosition } from '../tab-utils.js'

// UUID v4 格式正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

/**
 * 构造一个带滚动元素的 vditorRef mock
 * @param {object} opts - { mode, scrollTop, scrollHeight, clientHeight }
 */
function makeVditorRef({ mode = 'ir', scrollTop = 0, scrollHeight = 1000, clientHeight = 500 } = {}) {
  const element = { scrollTop, scrollHeight, clientHeight }
  const vditorInstance = {
    currentMode: mode,
    ir: mode === 'ir' ? { element } : undefined,
    sv: mode === 'sv' ? { element } : undefined,
    wysiwyg: mode === 'wysiwyg' ? { element } : undefined,
  }
  return { value: { vditor: vditorInstance }, _element: element }
}

// ─── generateTabId ─────────────────────────────────────────────────────────────

describe('generateTabId', () => {
  it('应该返回合法的 UUID v4 字符串', () => {
    const id = generateTabId()
    expect(typeof id).toBe('string')
    expect(id).toMatch(UUID_REGEX)
  })

  it('每次调用应该返回不同的 ID', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateTabId()))
    expect(ids.size).toBe(20)
  })
})

// ─── getTabTitle ───────────────────────────────────────────────────────────────

describe('getTabTitle', () => {
  it('filePath 为 null 且未修改 → "未命名"', () => {
    expect(getTabTitle({ filePath: null, contentModified: false })).toBe('未命名')
  })

  it('filePath 为 null 且已修改 → "* 未命名"', () => {
    expect(getTabTitle({ filePath: null, contentModified: true })).toBe('* 未命名')
  })

  it('Unix 路径：提取文件名', () => {
    expect(getTabTitle({ filePath: '/home/user/docs/readme.md', contentModified: false })).toBe('readme.md')
  })

  it('Windows 路径：提取文件名', () => {
    expect(getTabTitle({ filePath: 'C:\\Users\\user\\docs\\note.md', contentModified: false })).toBe('note.md')
  })

  it('有 filePath 且已修改 → "* " + 文件名', () => {
    expect(getTabTitle({ filePath: '/home/user/note.md', contentModified: true })).toBe('* note.md')
  })

  it('filePath 为空字符串 → "未命名"', () => {
    expect(getTabTitle({ filePath: '', contentModified: false })).toBe('未命名')
  })

  it('英文语言下 filePath 为 null → "Untitled"', () => {
    expect(getTabTitle({ filePath: null, contentModified: false }, 'en_US')).toBe('Untitled')
  })

  it('日文语言下 filePath 为 null → "* 無題"', () => {
    expect(getTabTitle({ filePath: null, contentModified: true }, 'ja_JP')).toBe('* 無題')
  })

  it('韩文语言下 filePath 为 null → "제목 없음"', () => {
    expect(getTabTitle({ filePath: null, contentModified: false }, 'ko_KR')).toBe('제목 없음')
  })

  it('未知语言回退到中文', () => {
    expect(getTabTitle({ filePath: null, contentModified: false }, 'fr_FR')).toBe('未命名')
  })
})

// ─── saveTabScrollPosition ─────────────────────────────────────────────────────

describe('saveTabScrollPosition', () => {
  let tab

  beforeEach(() => {
    tab = { id: 'test-id', scrollPosition: 0 }
  })

  it('应该将滚动百分比保存到 tab.scrollPosition', () => {
    // scrollTop=250, scrollHeight=1000, clientHeight=500 → pct = 250/500 = 0.5
    const ref = makeVditorRef({ scrollTop: 250, scrollHeight: 1000, clientHeight: 500 })
    saveTabScrollPosition(tab, ref)
    expect(tab.scrollPosition).toBeCloseTo(0.5, 5)
  })

  it('内容未溢出时（scrollHeight <= clientHeight）不应该修改 tab.scrollPosition', () => {
    const ref = makeVditorRef({ scrollTop: 0, scrollHeight: 400, clientHeight: 500 })
    tab.scrollPosition = 0.3
    saveTabScrollPosition(tab, ref)
    expect(tab.scrollPosition).toBe(0.3) // 保持原值不变
  })

  it('顶部位置应该保存为 0', () => {
    const ref = makeVditorRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    saveTabScrollPosition(tab, ref)
    expect(tab.scrollPosition).toBe(0)
  })

  it('底部位置应该保存为 1', () => {
    const ref = makeVditorRef({ scrollTop: 500, scrollHeight: 1000, clientHeight: 500 })
    saveTabScrollPosition(tab, ref)
    expect(tab.scrollPosition).toBe(1)
  })

  it('vditorRef 为 null 时不应该抛出错误', () => {
    expect(() => saveTabScrollPosition(tab, null)).not.toThrow()
  })

  it('vditorRef.value 为 null 时不应该抛出错误', () => {
    expect(() => saveTabScrollPosition(tab, { value: null })).not.toThrow()
  })

  it('应该支持 sv 模式', () => {
    const ref = makeVditorRef({ mode: 'sv', scrollTop: 250, scrollHeight: 1000, clientHeight: 500 })
    saveTabScrollPosition(tab, ref)
    expect(tab.scrollPosition).toBeCloseTo(0.5, 5)
  })

  it('应该支持 wysiwyg 模式', () => {
    const ref = makeVditorRef({ mode: 'wysiwyg', scrollTop: 100, scrollHeight: 1000, clientHeight: 500 })
    saveTabScrollPosition(tab, ref)
    expect(tab.scrollPosition).toBeCloseTo(0.2, 5)
  })
})

// ─── restoreTabScrollPosition ──────────────────────────────────────────────────

describe('restoreTabScrollPosition', () => {
  let tab

  beforeEach(() => {
    tab = { id: 'test-id', scrollPosition: 0.5 }
  })

  it('应该根据百分比恢复 scrollTop', () => {
    // pct=0.5, scrollHeight=1000, clientHeight=500 → scrollTop = 0.5*500 = 250
    const ref = makeVditorRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    restoreTabScrollPosition(tab, ref)
    expect(ref._element.scrollTop).toBe(250)
  })

  it('scrollPosition 为 0 时不应该修改 scrollTop', () => {
    tab.scrollPosition = 0
    const ref = makeVditorRef({ scrollTop: 100, scrollHeight: 1000, clientHeight: 500 })
    restoreTabScrollPosition(tab, ref)
    expect(ref._element.scrollTop).toBe(100) // 保持原值不变
  })

  it('scrollPosition 为 null 时不应该抛出错误', () => {
    tab.scrollPosition = null
    const ref = makeVditorRef()
    expect(() => restoreTabScrollPosition(tab, ref)).not.toThrow()
  })

  it('vditorRef 为 null 时不应该抛出错误', () => {
    expect(() => restoreTabScrollPosition(tab, null)).not.toThrow()
  })

  it('内容未溢出时不应该修改 scrollTop', () => {
    const ref = makeVditorRef({ scrollTop: 0, scrollHeight: 400, clientHeight: 500 })
    restoreTabScrollPosition(tab, ref)
    expect(ref._element.scrollTop).toBe(0)
  })

  it('scrollPosition 为 1 时应该恢复到底部', () => {
    tab.scrollPosition = 1
    const ref = makeVditorRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    restoreTabScrollPosition(tab, ref)
    expect(ref._element.scrollTop).toBe(500)
  })

  it('应该支持 sv 模式', () => {
    const ref = makeVditorRef({ mode: 'sv', scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    restoreTabScrollPosition(tab, ref)
    expect(ref._element.scrollTop).toBe(250)
  })

  it('应该支持 wysiwyg 模式', () => {
    tab.scrollPosition = 0.2
    const ref = makeVditorRef({ mode: 'wysiwyg', scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    restoreTabScrollPosition(tab, ref)
    expect(ref._element.scrollTop).toBe(100)
  })
})
