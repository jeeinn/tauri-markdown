/**
 * 文件哈希计算工具
 * 
 * 提供文件 SHA256 Hash 计算功能
 */

/**
 * 计算文件的 SHA256 Hash
 * @param {File} file - 文件对象
 * @returns {Promise<string>} 文件的 SHA256 Hash 值（十六进制字符串）
 */
export async function calculateFileHash(file) {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

const IMAGE_EXT_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif|jfif|heic|heif|tiff?)$/i

/**
 * 判断文件是否为图片（MIME 类型 + 扩展名兜底，兼容 Windows 剪贴板/文件选择器 type 为空）
 * @param {File} file - 文件对象
 * @returns {boolean} 是否为图片文件
 */
export function isImageFile(file) {
  if (file.type && file.type.startsWith('image/')) return true
  return IMAGE_EXT_PATTERN.test(file.name || '')
}
