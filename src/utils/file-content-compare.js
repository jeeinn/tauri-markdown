/**
 * 磁盘文件内容与编辑器基准内容的比较工具
 *
 * 编辑器内 originalContent 为 convertToAssetUrl 后的格式，
 * 比较前需将磁盘原始内容做相同转换（无副作用，不写 mapping）。
 */

import imagePathMapper from './image-path-mapper.js'

/**
 * 将磁盘原始 Markdown 转为与编辑器一致的比较格式
 * @param {string} diskRaw
 * @returns {string}
 */
export function normalizeDiskContentForCompare(diskRaw) {
  if (!diskRaw) return ''
  return imagePathMapper.convertToAssetUrlPure(diskRaw)
}

/**
 * 判断磁盘内容是否与编辑器记录的基准内容不同
 * @param {string} diskRaw - 磁盘原始内容
 * @param {string} originalConverted - 编辑器 originalContent
 * @returns {boolean}
 */
export function isExternalContentChanged(diskRaw, originalConverted) {
  return normalizeDiskContentForCompare(diskRaw) !== originalConverted
}
