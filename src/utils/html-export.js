/**
 * HTML 导出工具模块
 * 负责将 Vditor 渲染的 HTML 内容导出为独立的 HTML 文件
 */

import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, readFile } from '@tauri-apps/plugin-fs'
import { getLastFilePath } from './store.js'
import imagePathMapper from './image-path-mapper.js'
import { dirname, join } from '@tauri-apps/api/path'
import { ElNotification } from 'element-plus'

/**
 * 导出 Markdown 为独立 HTML 文件
 * @param {Object} vditor - Vditor 实例
 * @param {Object} i18nConfig - 国际化配置
 * @returns {Promise<boolean>} 是否成功
 */
export async function exportHtml(vditor, i18nConfig) {
  let progressNotification = null

  try {
    const content = vditor.getValue()

    // 检查内容是否为空
    if (!content.trim()) {
      ElNotification.warning({
        title: i18nConfig.emptyContent.title,
        message: i18nConfig.emptyContent.message,
        duration: 2000
      })
      return false
    }

    // 获取 Vditor 渲染后的 HTML 内容
    const htmlContent = vditor.getHTML()

    // 预处理媒体资源
    console.log('[HTML Export] 预处理媒体资源...')
    let processedHtml = preprocessMediaForHTML(htmlContent)

    // 统计需要处理的图片数量
    const imgCount = (processedHtml.match(/<img[^>]+src=["']((?!data:)[^"']+)["']/gi) || []).length

    if (imgCount > 0) {
      progressNotification = ElNotification.info({
        title: i18nConfig.processingImages.title,
        message: i18nConfig.processingImages.message.replace('{count}', imgCount),
        duration: 0,
      })

      // 将图片转换为 base64，带进度回调
      console.log('[HTML Export] 开始处理图片...')
      processedHtml = await convertImagesToBase64(
        processedHtml,
        (current, total) => {
          if (progressNotification) {
            progressNotification.close()
          }
          if (current < total) {
            progressNotification = ElNotification.info({
              title: i18nConfig.processingImages.title,
              message: i18nConfig.imageProgress.message
                .replace('{current}', current)
                .replace('{total}', total),
              duration: 0,
            })
          }
        }
      )

      if (progressNotification) {
        progressNotification.close()
        progressNotification = null
      }

      console.log('[HTML Export] 图片处理完成')
    }

    // 显示转换中提示
    ElNotification.info({
      title: i18nConfig.converting.title,
      message: i18nConfig.converting.message,
      duration: 0,
    })

    // 构建完整的 HTML 文档
    const fullHtml = buildFullHtml(processedHtml)

    // 保存 HTML 文件
    await saveHtmlFile(fullHtml, i18nConfig)

    return true
  } catch (error) {
    console.error('[ERROR] HTML导出失败:', error)
    ElNotification.closeAll()
    ElNotification.error({
      title: i18nConfig.exportError?.title || 'HTML导出失败',
      message: error.message || i18nConfig.exportError?.message || error.toString(),
      duration: 3000
    })
    return false
  }
}

/**
 * 预处理 HTML 内容：处理非图片资源，转换本地路径
 * @param {string} html - 原始 HTML
 * @returns {string} 处理后的 HTML
 */
function preprocessMediaForHTML(html) {
  console.log('[HTML Preprocess] 开始预处理 HTML 内容')
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // 处理所有包含本地路径的链接（tmd.localhost 或 localhost:1420 或相对路径）
  const allElements = doc.querySelectorAll('[src], [href]')
  console.log(`[HTML Preprocess] 找到 ${allElements.length} 个带有 src 或 href 属性的元素`)

  let convertedCount = 0
  allElements.forEach((element) => {
    if (element.tagName === 'IMG') {
      return // 图片将在 convertImagesToBase64 中处理
    }

    const src = element.getAttribute('src') || element.getAttribute('href')
    if (!src) return

    const isLocalResource =
      src.includes('tmd.localhost') ||
      src.includes('localhost:1420') ||
      src.startsWith('./assets/') ||
      src.startsWith('../assets/')

    if (!isLocalResource) return

    if (element.tagName === 'A') {
      // 链接转换为纯文本
      const text = element.textContent || element.getAttribute('href') || src
      const span = doc.createElement('span')
      span.textContent = text
      span.style.color = '#0366d6'
      span.style.textDecoration = 'underline'
      element.parentNode.replaceChild(span, element)
      convertedCount++
    } else {
      if (element.hasAttribute('src')) element.removeAttribute('src')
      if (element.hasAttribute('href')) element.removeAttribute('href')
      convertedCount++
    }
  })

  console.log(`[HTML Preprocess] 预处理完成，共转换 ${convertedCount} 个链接`)
  return doc.body.innerHTML
}

/**
 * 将 HTML 中的图片转换为 base64
 * @param {string} html - 原始 HTML
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 处理后的 HTML
 */
async function convertImagesToBase64(html, onProgress = null) {
  console.log('[HTML ImageConvert] 开始处理图片')
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const images = Array.from(doc.querySelectorAll('img'))
  console.log(`[HTML ImageConvert] 找到 ${images.length} 张图片`)

  if (images.length === 0) return html

  const imagesToProcess = images.filter(img => {
    const src = img.getAttribute('src')
    if (!src || src.startsWith('data:')) {
      return false
    }
    // 只跳过不包含任何路径分隔符的纯文件名（可能是 base64 或无效路径）
    if (!src.includes('/')) {
      console.log('[HTML ImageConvert] 跳过无路径的图片:', src)
      return false
    }
    return true
  })

  console.log(`[HTML ImageConvert] 需要处理 ${imagesToProcess.length} 张图片`)
  if (imagesToProcess.length === 0) return html

  const total = imagesToProcess.length
  let current = 0
  let successCount = 0
  let failCount = 0

  if (onProgress) onProgress(0, total)

  const batchSize = 5
  for (let i = 0; i < imagesToProcess.length; i += batchSize) {
    const batch = imagesToProcess.slice(i, i + batchSize)
    await Promise.all(batch.map(async (img) => {
      const src = img.getAttribute('src')
      if (!src) return

      try {
        if (src.includes('tmd.localhost') || src.includes('localhost:1420')) {
          const base64 = await readLocalImageToBase64(src)
          img.setAttribute('src', base64)
          successCount++
        } else if (src.startsWith('./') || src.startsWith('../')) {
          // 处理相对路径图片
          console.log('[HTML ImageConvert] 处理相对路径图片:', src)
          const base64 = await readRelativePathImageToBase64(src)
          img.setAttribute('src', base64)
          successCount++
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
          try {
            const { fetch } = await import('@tauri-apps/plugin-http')
            const response = await fetch(src)
            const arrayBuffer = await response.arrayBuffer()
            const bytes = new Uint8Array(arrayBuffer)
            const mimeType = detectImageType(bytes)
            const blob = new Blob([arrayBuffer], { type: mimeType })
            const base64 = await blobToBase64(blob)
            img.setAttribute('src', base64)
            successCount++
          } catch (fetchError) {
            failCount++
            console.error('[HTML ImageConvert] 远程图片获取失败:', src, fetchError)
          }
        }
      } catch (error) {
        failCount++
        console.error('[HTML ImageConvert] 图片转换失败:', src, error)
      } finally {
        current++
        if (onProgress) onProgress(current, total)
      }
    }))
  }

  console.log(`[HTML ImageConvert] 处理完成：成功 ${successCount} 张，失败 ${failCount} 张`)
  return doc.body.innerHTML
}

/**
 * 通过 Tauri API 读取本地图片并转换为 base64
 * @param {string} tmdUrl - tmd URL
 * @returns {Promise<string>} base64 字符串
 */
async function readLocalImageToBase64(tmdUrl) {
  console.log('[HTML readLocalImageToBase64] tmdUrl:', tmdUrl)

  const relativePath = imagePathMapper.getRelativePath(tmdUrl)
  if (!relativePath) {
    throw new Error(`未找到图片映射: ${tmdUrl}`)
  }

  const cleanRelativePath = relativePath.replace(/^\.\//, '')
  const lastPath = await getLastFilePath()

  let baseDir = '.'
  if (typeof lastPath === 'string') {
    const posixLastPath = lastPath.split(String.fromCharCode(92)).join('/')
    baseDir = await dirname(posixLastPath)
  } else if (lastPath && typeof lastPath === 'object' && lastPath.path) {
    const posixPath = lastPath.path.split(String.fromCharCode(92)).join('/')
    baseDir = await dirname(posixPath)
  }

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
async function readRelativePathImageToBase64(relativePath) {
  console.log('[HTML readRelativePathImageToBase64] relativePath:', relativePath)

  const lastPath = await getLastFilePath()
  if (!lastPath) {
    throw new Error('未打开文件，无法解析相对路径')
  }

  let baseDir = '.'
  if (typeof lastPath === 'string') {
    const posixLastPath = lastPath.split(String.fromCharCode(92)).join('/')
    baseDir = await dirname(posixLastPath)
  } else if (lastPath && typeof lastPath === 'object' && lastPath.path) {
    const posixPath = lastPath.path.split(String.fromCharCode(92)).join('/')
    baseDir = await dirname(posixPath)
  }

  // 拼接完整路径
  const fullPath = await join(baseDir, relativePath)
  console.log('[HTML readRelativePathImageToBase64] fullPath:', fullPath)

  const binaryData = await readFile(fullPath)
  const base64 = arrayBufferToBase64(binaryData)
  const ext = getImageExtension(relativePath)
  const mimeType = getImageMimeType(ext)

  return `data:${mimeType};base64,${base64}`
}

/**
 * 构建完整的 HTML 文档
 * @param {string} bodyContent - body 内容
 * @returns {string} 完整 HTML
 */
function buildFullHtml(bodyContent) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    /* 全局重置 */
    *, *::before, *::after {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }

    /* 标题样式 */
    h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; margin-top: 1.5em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; margin-top: 1.5em; }
    h3 { font-size: 1.25em; margin-top: 1.5em; }
    h4 { font-size: 1.1em; margin-top: 1.2em; }
    h5, h6 { font-size: 1em; margin-top: 1em; }

    /* 段落与列表 */
    p { margin: 0.8em 0; }
    ul, ol { padding-left: 2em; }
    li { margin: 0.3em 0; }

    /* 代码块 */
    pre {
      background: #f6f8fa;
      padding: 16px;
      overflow-x: auto;
      border-radius: 6px;
      border: 1px solid #e1e4e8;
      font-size: 85%;
      line-height: 1.45;
    }
    code {
      background: #f6f8fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
    }
    pre code {
      background: none;
      padding: 0;
      border-radius: 0;
    }

    /* 引用 */
    blockquote {
      border-left: 4px solid #dfe2e5;
      padding: 0 1em;
      color: #6a737d;
      margin: 1em 0;
    }

    /* 表格 */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      display: block;
      overflow-x: auto;
    }
    th, td {
      border: 1px solid #dfe2e5;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f6f8fa;
      font-weight: 600;
    }
    tr:nth-child(even) { background: #f8f9fa; }

    /* 图片 */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
      border-radius: 4px;
    }

    /* 水平线 */
    hr {
      border: none;
      border-top: 1px solid #eee;
      margin: 2em 0;
    }

    /* 链接 */
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }

    /* 任务列表 */
    input[type="checkbox"] {
      margin-right: 6px;
    }

    /* 脚注 */
    .footnote {
      font-size: 0.85em;
      color: #6a737d;
    }

    /* 响应式 */
    @media (max-width: 600px) {
      body { padding: 20px 15px; }
      pre { font-size: 80%; }
    }

    /* 打印样式 */
    @media print {
      body { max-width: none; padding: 0; }
      pre { page-break-inside: avoid; }
      img { page-break-inside: avoid; break-inside: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`
}

/**
 * 保存 HTML 文件
 * @param {string} htmlContent - 完整 HTML 内容
 * @param {Object} i18nConfig - 国际化配置
 */
async function saveHtmlFile(htmlContent, i18nConfig) {
  const now = new Date()
  const timestamp = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  const defaultName = `markdown-export-${timestamp}.html`

  const filePath = await save({
    filters: [{
      name: 'HTML',
      extensions: ['html', 'htm']
    }],
    defaultPath: defaultName
  })

  if (filePath) {
    // 将 HTML 内容编码为 UTF-8 字节数组后写入
    const encoder = new TextEncoder()
    const uint8Array = encoder.encode(htmlContent)
    await writeFile(filePath, uint8Array)

    ElNotification.closeAll()
    ElNotification.success({
      title: i18nConfig.success.title,
      message: i18nConfig.fileSaved,
      duration: 3000
    })
  } else {
    ElNotification.closeAll()
    ElNotification.info({
      title: i18nConfig.cancelled.title,
      message: i18nConfig.cancelled.message,
      duration: 2000
    })
  }
}

// ── 工具函数 ──────────────────────────────────────────

function detectImageType(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif'
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  return 'image/png'
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function arrayBufferToBase64(buffer) {
  if (buffer instanceof Uint8Array) {
    let binary = ''
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i])
    }
    return btoa(binary)
  }
  return ''
}

function getImageExtension(path) {
  const match = path.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|avif)$/i)
  return match ? match[1].toLowerCase() : 'png'
}

function getImageMimeType(ext) {
  const mimeMap = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif'
  }
  return mimeMap[ext] || 'image/png'
}

