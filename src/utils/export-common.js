/**
 * 导出工具共享模块
 * 封装 html-export.js 和 pdf-export.js 中重复的工具函数
 */

import { readFile } from '@tauri-apps/plugin-fs'
import { getLastFilePath } from './store.js'
import imagePathMapper from './image-path-mapper.js'
import { dirname, join } from '@tauri-apps/api/path'

// ── 图片工具函数 ──────────────────────────────────────

/**
 * 通过 Magic Bytes 检测图片类型
 * @param {Uint8Array} bytes - 图片字节数据
 * @returns {string} MIME 类型
 */
export function detectImageType(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif'
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  return 'image/png'
}

/**
 * Blob 转 base64
 * @param {Blob} blob - Blob 对象
 * @returns {Promise<string>} base64 字符串
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * ArrayBuffer 转 base64
 * @param {Uint8Array} buffer - 二进制数据
 * @returns {string} base64 字符串
 */
export function arrayBufferToBase64(buffer) {
  if (buffer instanceof Uint8Array) {
    let binary = ''
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i])
    }
    return btoa(binary)
  }
  return ''
}

/**
 * 获取图片扩展名
 * @param {string} path - 文件路径
 * @returns {string} 扩展名（小写）
 */
export function getImageExtension(path) {
  const match = path.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|avif)$/i)
  return match ? match[1].toLowerCase() : 'png'
}

/**
 * 根据扩展名获取 MIME 类型
 * @param {string} ext - 扩展名
 * @returns {string} MIME 类型
 */
export function getImageMimeType(ext) {
  const mimeMap = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif'
  }
  return mimeMap[ext] || 'image/png'
}

/**
 * 解析 lastPath 获取文件所在目录
 * 处理 Windows 反斜杠路径转换为 POSIX 格式
 * @param {*} lastPath - 从 store 获取的路径（可能是字符串或对象）
 * @returns {Promise<string>} 目录路径
 */
async function resolveBaseDir(lastPath) {
  if (typeof lastPath === 'string') {
    const posixLastPath = lastPath.split(String.fromCharCode(92)).join('/')
    return await dirname(posixLastPath)
  } else if (lastPath && typeof lastPath === 'object' && lastPath.path) {
    const posixPath = lastPath.path.split(String.fromCharCode(92)).join('/')
    return await dirname(posixPath)
  }
  return '.'
}

/**
 * 通过 Tauri API 读取本地图片并转换为 base64
 * @param {string} tmdUrl - tmd URL（含 tmd.localhost 或 localhost:1420）
 * @returns {Promise<string>} base64 字符串
 */
export async function readLocalImageToBase64(tmdUrl) {
  console.log('[ExportCommon] readLocalImageToBase64:', tmdUrl)

  const relativePath = imagePathMapper.getRelativePath(tmdUrl)
  if (!relativePath) {
    throw new Error(`未找到图片映射: ${tmdUrl}`)
  }

  const cleanRelativePath = relativePath.replace(/^\.\//, '')
  const lastPath = await getLastFilePath()
  if (!lastPath) {
    throw new Error('未打开文件，无法解析图片路径')
  }
  const baseDir = await resolveBaseDir(lastPath)
  const fullPath = await join(baseDir, cleanRelativePath)

  const binaryData = await readFile(fullPath)
  const base64 = arrayBufferToBase64(binaryData)
  const ext = getImageExtension(cleanRelativePath)
  const mimeType = getImageMimeType(ext)

  return `data:${mimeType};base64,${base64}`
}


/**
 * 读取相对路径图片并转换为 base64
 * @param {string} relativePath - 相对路径（./ 或 ../ 开头）
 * @returns {Promise<string>} base64 字符串
 */
export async function readRelativePathImageToBase64(relativePath) {
  console.log('[ExportCommon] readRelativePathImageToBase64:', relativePath)

  const lastPath = await getLastFilePath()
  if (!lastPath) {
    throw new Error('未打开文件，无法解析相对路径')
  }

  const baseDir = await resolveBaseDir(lastPath)
  const fullPath = await join(baseDir, relativePath)
  console.log('[ExportCommon] 相对路径完整路径:', fullPath)

  const binaryData = await readFile(fullPath)
  const base64 = arrayBufferToBase64(binaryData)
  const ext = getImageExtension(relativePath)
  const mimeType = getImageMimeType(ext)

  return `data:${mimeType};base64,${base64}`
}