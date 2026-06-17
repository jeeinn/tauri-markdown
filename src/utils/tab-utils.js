/**
 * Tab 相关工具函数
 *
 * 提供多标签页编辑器所需的工具方法：
 * - 唯一 ID 生成
 * - 标签标题计算
 * - 滚动位置保存/恢复
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * 生成唯一的 Tab ID（UUID v4）
 * @returns {string} UUID 字符串
 */
export function generateTabId() {
  return uuidv4()
}

// 各语言的"未命名"文本
const UNTITLED_TEXT = {
  zh_CN: '未命名',
  en_US: 'Untitled',
  ja_JP: '無題',
  ko_KR: '제목 없음',
}

/**
 * 获取标签页显示标题
 *
 * 规则：
 * - filePath 为 null → 对应语言的"未命名"
 * - 否则取 filePath 的文件名部分
 * - contentModified 为 true → 在标题后追加 "●"
 *
 * @param {object} tab - Tab 对象 { filePath, contentModified, ... }
 * @param {string} [lang='zh_CN'] - 语言代码
 * @returns {string} 显示标题
 */
export function getTabTitle(tab, lang = 'zh_CN') {
  const untitled = UNTITLED_TEXT[lang] || UNTITLED_TEXT.zh_CN
  let title

  if (!tab.filePath) {
    title = untitled
  } else {
    // 兼容 Windows（\）和 Unix（/）路径分隔符
    const parts = tab.filePath.replace(/\\/g, '/').split('/')
    title = parts[parts.length - 1] || untitled
  }

  if (tab.contentModified) {
    title = '* ' + title
  }

  return title
}

/**
 * 将当前 Vditor 滚动位置（0-1 百分比）保存到 tab.scrollPosition
 *
 * 通过 DOM id `vditor-{tab.id}` 找到 Vditor 的可滚动容器。
 * 若内容未溢出则不保存。
 *
 * @param {object} tab - Tab 对象（会直接修改 tab.scrollPosition）
 * @param {object} vditorRef - Vditor 实例引用 { value: VditorInstance }
 */
export function saveTabScrollPosition(tab, vditorRef) {
  const vditor = vditorRef?.value
  if (!vditor || !vditor.vditor) return

  const vditorInstance = vditor.vditor
  const mode = vditorInstance.currentMode

  let el = null
  if (mode === 'ir' && vditorInstance.ir) {
    el = vditorInstance.ir.element
  } else if (mode === 'sv' && vditorInstance.sv) {
    el = vditorInstance.sv.element
  } else if (mode === 'wysiwyg' && vditorInstance.wysiwyg) {
    el = vditorInstance.wysiwyg.element
  }

  if (!el) return

  const scrollable = el.scrollHeight - el.clientHeight
  if (scrollable <= 0) return // 内容未溢出，无需保存

  const pct = el.scrollTop / scrollable
  if (!isFinite(pct)) return

  tab.scrollPosition = Math.max(0, Math.min(1, pct))
}

/**
 * 将 tab.scrollPosition 中保存的百分比位置恢复到 Vditor 编辑器
 *
 * 通过 DOM id `vditor-{tab.id}` 找到 Vditor 的可滚动容器并设置 scrollTop。
 *
 * @param {object} tab - Tab 对象（读取 tab.scrollPosition 和 tab.id）
 * @param {object} vditorRef - Vditor 实例引用 { value: VditorInstance }
 */
export function restoreTabScrollPosition(tab, vditorRef) {
  const pct = tab.scrollPosition
  if (pct == null || pct <= 0) return

  const vditor = vditorRef?.value
  if (!vditor || !vditor.vditor) return

  const vditorInstance = vditor.vditor
  const mode = vditorInstance.currentMode

  let el = null
  if (mode === 'ir' && vditorInstance.ir) {
    el = vditorInstance.ir.element
  } else if (mode === 'sv' && vditorInstance.sv) {
    el = vditorInstance.sv.element
  } else if (mode === 'wysiwyg' && vditorInstance.wysiwyg) {
    el = vditorInstance.wysiwyg.element
  }

  if (!el) return

  const scrollable = el.scrollHeight - el.clientHeight
  if (scrollable <= 0) return

  el.scrollTop = Math.round(pct * scrollable)
}
