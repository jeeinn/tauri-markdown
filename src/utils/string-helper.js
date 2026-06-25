/**
 * 将模板中的 {fileName} 替换为文件名（安全处理 $ 等特殊字符）
 * @param {string} template
 * @param {string} fileName
 * @returns {string}
 */
export function replaceFileNamePlaceholder(template, fileName) {
  return template.split('{fileName}').join(fileName)
}

/**
 * 从路径中提取文件名
 * @param {string|null|undefined} filePath
 * @returns {string}
 */
export function getFileNameFromPath(filePath) {
  if (!filePath) return ''
  return filePath.split('\\').pop() || filePath.split('/').pop() || ''
}
