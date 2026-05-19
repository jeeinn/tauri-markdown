/**
 * 统一导出模块
 * 支持 print / pdf / html 三种格式，共享渲染管道和样式
 */

import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, readFile } from '@tauri-apps/plugin-fs'
import imagePathMapper from './image-path-mapper.js'
import { getLastFilePath } from './store.js'
import { dirname, join } from '@tauri-apps/api/path'

// ── 图片工具函数 ──────────────────────────────────────

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

async function readLocalImageToBase64(tmdUrl) {
  const relativePath = imagePathMapper.getRelativePath(tmdUrl)
  if (!relativePath) throw new Error(`未找到图片映射: ${tmdUrl}`)

  const cleanRelativePath = relativePath.replace(/^\.\//, '')
  const lastPath = await getLastFilePath()
  if (!lastPath) throw new Error('未打开文件，无法解析图片路径')

  const baseDir = await resolveBaseDir(lastPath)
  const fullPath = await join(baseDir, cleanRelativePath)
  const binaryData = await readFile(fullPath)
  const base64 = arrayBufferToBase64(binaryData)
  const ext = getImageExtension(cleanRelativePath)
  const mimeType = getImageMimeType(ext)

  return `data:${mimeType};base64,${base64}`
}

async function readRelativePathImageToBase64(relativePath) {
  const lastPath = await getLastFilePath()
  if (!lastPath) throw new Error('未打开文件，无法解析相对路径')

  const baseDir = await resolveBaseDir(lastPath)
  const fullPath = await join(baseDir, relativePath)
  const binaryData = await readFile(fullPath)
  const base64 = arrayBufferToBase64(binaryData)
  const ext = getImageExtension(relativePath)
  const mimeType = getImageMimeType(ext)

  return `data:${mimeType};base64,${base64}`
}

// ── 共享管道 ──────────────────────────────────────────

/**
 * 预处理 HTML 中的媒体资源（非图片链接转为纯文本）
 */
function preprocessMedia(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const allElements = doc.querySelectorAll('[src], [href]')

  allElements.forEach(element => {
    if (element.tagName === 'IMG') return

    const src = element.getAttribute('src') || element.getAttribute('href')
    if (!src) return

    const isLocalResource =
      src.includes('tmd.localhost') ||
      src.includes('localhost:1420') ||
      src.startsWith('./assets/') ||
      src.startsWith('../assets/')

    if (!isLocalResource) return

    if (element.tagName === 'A') {
      const text = element.textContent || element.getAttribute('href') || src
      const span = doc.createElement('span')
      span.textContent = text
      span.style.color = '#0366d6'
      span.style.textDecoration = 'underline'
      element.parentNode.replaceChild(span, element)
    } else {
      if (element.hasAttribute('src')) element.removeAttribute('src')
      if (element.hasAttribute('href')) element.removeAttribute('href')
    }
  })

  return doc.body.innerHTML
}

/**
 * 将 HTML 中的图片转换为 base64
 * @param {string} html
 * @param {Function} [onProgress] - (current, total) 进度回调
 */
async function convertImagesToBase64(html, onProgress = null) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const images = Array.from(doc.querySelectorAll('img'))

  const imagesToProcess = images.filter(img => {
    const src = img.getAttribute('src')
    if (!src || src.startsWith('data:')) return false
    if (!src.includes('/')) return false
    return true
  })

  if (imagesToProcess.length === 0) return html

  const total = imagesToProcess.length
  let current = 0

  if (onProgress) onProgress(0, total)

  const batchSize = 5
  for (let i = 0; i < imagesToProcess.length; i += batchSize) {
    const batch = imagesToProcess.slice(i, i + batchSize)
    await Promise.all(batch.map(async (img) => {
      const src = img.getAttribute('src')
      if (!src) return

      try {
        if (src.includes('tmd.localhost') || src.includes('localhost:1420')) {
          img.setAttribute('src', await readLocalImageToBase64(src))
        } else if (src.startsWith('./') || src.startsWith('../')) {
          img.setAttribute('src', await readRelativePathImageToBase64(src))
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
          try {
            const { fetch } = await import('@tauri-apps/plugin-http')
            const response = await fetch(src)
            const arrayBuffer = await response.arrayBuffer()
            const bytes = new Uint8Array(arrayBuffer)
            const mimeType = detectImageType(bytes)
            const blob = new Blob([arrayBuffer], { type: mimeType })
            img.setAttribute('src', await blobToBase64(blob))
          } catch {
            // 远程图片获取失败，跳过
          }
        }
      } catch {
        // 图片转换失败，跳过
      } finally {
        current++
        if (onProgress) onProgress(current, total)
      }
    }))
  }

  return doc.body.innerHTML
}

// ── 样式 ──────────────────────────────────────────────

const sharedStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 20px;
    background: #fff;
    overflow-x: hidden;
  }
  h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; margin-top: 1.5em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; margin-top: 1.5em; }
  h3 { font-size: 1.25em; margin-top: 1.5em; }
  h4 { font-size: 1.1em; margin-top: 1.2em; }
  h5, h6 { font-size: 1em; margin-top: 1em; }
  p { margin: 0.8em 0; }
  ul, ol { padding-left: 2em; }
  li { margin: 0.3em 0; }
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
  pre code { background: none; padding: 0; border-radius: 0; }
  blockquote {
    border-left: 4px solid #dfe2e5;
    padding: 0 1em;
    color: #6a737d;
    margin: 1em 0;
  }
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
  th { background: #f6f8fa; font-weight: 600; }
  tr:nth-child(even) { background: #f8f9fa; }
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
    border-radius: 4px;
  }
  hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
  a { color: #0366d6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  input[type="checkbox"] { margin-right: 6px; }
`

const printPdfExtraStyles = `
  @media print {
    body { max-width: none; padding: 0; }
    h1 { page-break-before: always; break-before: page; page-break-after: avoid; break-after: avoid-page; }
    h2, h3, h4 { page-break-after: avoid; break-after: avoid-page; }
    pre, code, table, blockquote, img { page-break-inside: avoid; break-inside: avoid; }
    p, li { orphans: 3; widows: 3; }
  }
`

/**
 * 构建完整 HTML 文档
 * @param {string} bodyContent
 * @param {boolean} [includePrintStyles=false] - 是否包含打印/分页样式
 */
function buildFullHtml(bodyContent, includePrintStyles = false) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    ${sharedStyles}
    ${includePrintStyles ? printPdfExtraStyles : ''}
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`
}

// ── iframe 渲染 ───────────────────────────────────────

/**
 * 创建隐藏 iframe 并渲染 HTML
 * @returns {Promise<{iframe: HTMLIFrameElement, doc: Document}>}
 */
async function renderToIframe(fullHtml) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'absolute'
  iframe.style.left = '-9999px'
  iframe.style.top = '0'
  iframe.style.width = '680px'
  iframe.style.border = 'none'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(fullHtml)
  doc.close()

  await new Promise(resolve => {
    iframe.onload = resolve
    if (iframe.contentDocument.readyState === 'complete') resolve()
  })

  return { iframe, doc }
}

function cleanupIframe(iframe) {
  if (iframe && iframe.parentNode) {
    iframe.parentNode.removeChild(iframe)
  }
}

// ── 格式处理器 ────────────────────────────────────────

/**
 * 打印：iframe 渲染后调用浏览器打印
 */
async function doPrint(processedHtml, component) {
  const fullHtml = buildFullHtml(processedHtml, true)
  const { iframe, doc } = await renderToIframe(fullHtml)

  // 设置打印标题
  const originalTitle = document.title
  const filePath = component.currentFilePath
  if (filePath) {
    document.title = filePath.split('/').pop().split('\\').pop().replace(/\.md$/i, '')
  } else {
    document.title = 'TauriMarkdown'
  }

  return new Promise(resolve => {
    const cleanup = () => {
      document.title = originalTitle
      cleanupIframe(iframe)
    }

    iframe.contentWindow.onafterprint = () => {
      cleanup()
      resolve({ success: true, format: 'print' })
    }

    try {
      iframe.contentWindow.print()
    } catch (error) {
      cleanup()
      resolve({ success: false, format: 'print', error })
    }
  })
}

/**
 * PDF：iframe 渲染后用 html2pdf.js 生成
 */
async function doPdf(processedHtml, component, options = {}) {
  const fullHtml = buildFullHtml(processedHtml, true)
  const { iframe, doc } = await renderToIframe(fullHtml)

  try {
    // 等待图片加载
    const images = doc.body.querySelectorAll('img')
    images.forEach(img => {
      if (img.naturalWidth > 680) {
        const ratio = 680 / img.naturalWidth
        img.style.width = '680px'
        img.style.height = Math.round(img.naturalHeight * ratio) + 'px'
      }
    })
    await Promise.all(Array.from(images).map(img =>
      img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })
    ))

    await new Promise(r => setTimeout(r, 300))

    const { default: html2pdf } = await import('html2pdf.js')

    const opt = {
      margin: [15, 15, 20, 15],
      filename: options.filename || 'markdown-export.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'avoid-all'], avoid: ['img', 'pre', 'table', 'blockquote'] },
      ...options.pdfOptions,
    }

    const pdfBlob = await html2pdf().set(opt).from(doc.body).outputPdf('blob')
    cleanupIframe(iframe)

    // 保存文件
    const now = new Date()
    const ts = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')

    const filePath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: options.filename || `markdown-export-${ts}.pdf`
    })

    if (!filePath) return { success: false, format: 'pdf' }

    const arrayBuffer = await pdfBlob.arrayBuffer()
    await writeFile(filePath, new Uint8Array(arrayBuffer))

    return { success: true, format: 'pdf', filePath }
  } catch (error) {
    cleanupIframe(iframe)
    return { success: false, format: 'pdf', error }
  }
}

/**
 * HTML：直接保存为独立 HTML 文件
 */
async function doHtml(processedHtml, component, options = {}) {
  const fullHtml = buildFullHtml(processedHtml, false)

  const now = new Date()
  const ts = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')

  try {
    const filePath = await save({
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
      defaultPath: options.filename || `markdown-export-${ts}.html`
    })

    if (!filePath) return { success: false, format: 'html' }

    const encoder = new TextEncoder()
    await writeFile(filePath, encoder.encode(fullHtml))

    return { success: true, format: 'html', filePath }
  } catch (error) {
    return { success: false, format: 'html', error }
  }
}

// ── 格式处理器映射 ────────────────────────────────────

const handlers = { print: doPrint, pdf: doPdf, html: doHtml }

// ── 统一入口 ──────────────────────────────────────────

/**
 * 统一导出入口
 * @param {'print'|'pdf'|'html'} format - 导出格式
 * @param {Object} component - MyVditor 组件实例
 * @param {Object} [options] - 可选配置
 * @param {Function} [options.onStart] - 导出开始回调
 * @param {Function} [options.onProgress] - 图片处理进度 (current, total)
 * @param {Function} [options.onSuccess] - 导出成功回调 (result)
 * @param {Function} [options.onError] - 导出失败回调 (error)
 * @param {Function} [options.onFinish] - 导出完成回调（无论成败）
 * @param {Object} [options.pdfOptions] - html2pdf.js 配置覆盖
 * @param {string} [options.filename] - 自定义文件名
 * @returns {Promise<{success: boolean, format: string, filePath?: string, error?: Error}>}
 */
export async function exportTo(format, component, options = {}) {
  const { onStart, onProgress, onSuccess, onError, onFinish } = options

  try {
    onStart?.()

    const vditor = component?.vditor
    if (!vditor) throw new Error('Vditor 未初始化')

    const html = vditor.getHTML()
    if (!html.trim()) throw new Error('内容为空')

    const processed = await preprocessMedia(html)
    const base64Html = await convertImagesToBase64(processed, onProgress)

    const result = await handlers[format](base64Html, component, options)

    if (result.success) {
      onSuccess?.(result)
    } else if (result.error) {
      onError?.(result.error)
    }

    return result
  } catch (error) {
    onError?.(error)
    return { success: false, format, error }
  } finally {
    onFinish?.()
  }
}
