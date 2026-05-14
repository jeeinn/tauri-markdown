/**
 * PDF 导出工具模块
 * 负责将 Vditor 渲染的 HTML 内容转换为 PDF 文件
 */

import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { ElNotification } from 'element-plus'
import {
  detectImageType,
  blobToBase64,
  arrayBufferToBase64,
  getImageExtension,
  getImageMimeType,
  readLocalImageToBase64,
  readRelativePathImageToBase64
} from './export-common.js'

/**
 * 导出 Markdown 为 PDF
 * @param {Object} vditor - Vditor 实例
 * @param {Object} i18nConfig - 国际化配置
 * @returns {Promise<boolean>} 是否成功
 */
export async function exportPdf(vditor, i18nConfig) {
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
    
    // 预处理媒体资源（处理非图片资源，转换 tmd.localhost 路径）
    console.log('[PDF Export] 预处理媒体资源...')
    let processedHtml = preprocessMediaForPDF(htmlContent)
    
    // 统计需要处理的图片数量
    const imgCount = (processedHtml.match(/<img[^>]+src=["']((?!data:)[^"']+)["']/gi) || []).length
    
    if (imgCount > 0) {
      // 显示图片处理进度提示
      progressNotification = ElNotification.info({
        title: i18nConfig.processingImages.title,
        message: i18nConfig.processingImages.message.replace('{count}', imgCount),
        duration: 0,
      })
      
      // 将图片转换为 base64 以解决 CORS 问题，带进度回调
      console.log('[PDF Export] 开始处理图片...')
      processedHtml = await convertImagesToBase64(
        processedHtml,
        (current, total) => {
          // 更新进度提示
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
      
      // 关闭进度提示
      if (progressNotification) {
        progressNotification.close()
        progressNotification = null
      }
      
      console.log('[PDF Export] 图片处理完成')
    }
    
    // 显示转换中提示
    ElNotification.info({
      title: i18nConfig.converting.title,
      message: i18nConfig.converting.message,
      duration: 0,
    })
    
    // 构建完整的 HTML 文档
    const fullHtml = buildFullHtml(processedHtml)
    
    // 懒加载 html2pdf.js
    console.log('[PDF Export] 加载 html2pdf.js...')
    const { default: html2pdf } = await import('html2pdf.js')
    
    // 创建 iframe 并渲染 HTML
    const { container, iframe } = await createRenderContainer(fullHtml)
    
    // 等待所有图片加载完成并处理宽图片
    await waitForImagesAndScale(container)
    
    // 额外等待一小段时间确保渲染完成
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 生成 PDF
    console.log('[PDF Export] 生成 PDF...')
    const pdfBlob = await generatePdfBlob(html2pdf, container)
    
    // 清理临时 iframe
    document.body.removeChild(iframe)
    console.log('[PDF Export] 临时元素已清理')
    
    // 保存 PDF 文件
    await savePdfFile(pdfBlob, i18nConfig)
    
    return true
  } catch (error) {
    console.error('[ERROR] PDF导出失败:', error)
    ElNotification.closeAll()
    ElNotification.error({
      title: i18nConfig.exportError?.title || 'PDF导出失败',
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
function preprocessMediaForPDF(html) {
  console.log('[PDF Preprocess] 开始预处理 HTML 内容')
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // 处理所有包含本地路径的链接（tmd.localhost 或 localhost:1420 或相对路径）
  const allElements = doc.querySelectorAll('[src], [href]')
  console.log(`[PDF Preprocess] 找到 ${allElements.length} 个带有 src 或 href 属性的元素`)
  
  let convertedCount = 0
  allElements.forEach((element, index) => {
    // 跳过 img 标签，图片将在 convertImagesToBase64 中处理
    if (element.tagName === 'IMG') {
      console.log(`[PDF Preprocess] [${index}] 跳过 IMG 标签:`, element.getAttribute('src'))
      return
    }
    
    const src = element.getAttribute('src') || element.getAttribute('href')
    if (!src) {
      console.log(`[PDF Preprocess] [${index}] 跳过空 src/href`)
      return
    }
    
    console.log(`[PDF Preprocess] [${index}] 检查元素:`, element.tagName, src)
    
    // 检测是否为本地资源路径
    const isLocalResource = 
      src.includes('tmd.localhost') || 
      src.includes('localhost:1420') ||
      src.startsWith('./assets/') ||
      src.startsWith('../assets/')
    
    if (!isLocalResource) {
      console.log(`[PDF Preprocess] [${index}] 跳过非本地资源:`, src)
      return
    }
    
    console.log(`[PDF Preprocess] [${index}] 检测到本地资源，开始转换:`, src)
    
    if (element.tagName === 'A') {
      // 对于 <a> 标签，保留文本内容，移除 href 属性
      const text = element.textContent || element.getAttribute('href') || src
      console.log(`[PDF Preprocess] [${index}] 链接文本:`, text)
      
      const span = doc.createElement('span')
      span.textContent = text
      span.style.color = '#0366d6'
      span.style.textDecoration = 'underline'
      span.style.cursor = 'default'
      
      element.parentNode.replaceChild(span, element)
      console.log(`[PDF Preprocess] [${index}] 已将链接转换为纯文本`)
      convertedCount++
    } else {
      // 其他元素（如 video, audio 等），移除 src/href
      if (element.hasAttribute('src')) {
        element.removeAttribute('src')
        console.log(`[PDF Preprocess] [${index}] 已移除 src`)
      }
      if (element.hasAttribute('href')) {
        element.removeAttribute('href')
        console.log(`[PDF Preprocess] [${index}] 已移除 href`)
      }
      convertedCount++
    }
  })
  
  console.log(`[PDF Preprocess] 预处理完成，共转换 ${convertedCount} 个链接`)
  
  return doc.body.innerHTML
}

/**
 * 将 HTML 中的图片转换为 base64
 * @param {string} html - 原始 HTML
 * @param {Function} onProgress - 进度回调函数 (current, total)
 * @returns {Promise<string>} 处理后的 HTML
 */
async function convertImagesToBase64(html, onProgress = null) {
  console.log('[PDF ImageConvert] 开始处理图片')
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const images = Array.from(doc.querySelectorAll('img'))
  console.log(`[PDF ImageConvert] 找到 ${images.length} 张图片`)
  
  if (images.length === 0) return html
  
  // 过滤出需要处理的图片
  const imagesToProcess = images.filter(img => {
    const src = img.getAttribute('src')
    if (!src || src.startsWith('data:')) {
      console.log('[PDF ImageConvert] 跳过空或 base64 图片:', src)
      return false
    }
    // 只跳过不包含任何路径分隔符的纯文件名（可能是 base64 或无效路径）
    if (!src.includes('/')) {
      console.log('[PDF ImageConvert] 跳过无路径的图片:', src)
      return false
    }
    console.log('[PDF ImageConvert] 将处理图片:', src)
    return true
  })
  
  console.log(`[PDF ImageConvert] 需要处理 ${imagesToProcess.length} 张图片`)
  if (imagesToProcess.length === 0) return html
  
  const total = imagesToProcess.length
  let current = 0
  let successCount = 0
  let failCount = 0
  
  if (onProgress) {
    onProgress(0, total)
  }
  
  // 分批处理图片，每批 5 张
  const batchSize = 5
  for (let i = 0; i < imagesToProcess.length; i += batchSize) {
    const batch = imagesToProcess.slice(i, i + batchSize)
    console.log(`[PDF ImageConvert] 处理批次 ${Math.floor(i / batchSize) + 1}，共 ${batch.length} 张图片`)
    
    await Promise.all(batch.map(async (img) => {
      const src = img.getAttribute('src')
      if (!src) return
      
      try {
        console.log(`[PDF ImageConvert] 处理图片 [${current + 1}/${total}]:`, src)
        
        if (src.includes('tmd.localhost') || src.includes('localhost:1420')) {
          console.log('[PDF ImageConvert] 本地图片，使用 readLocalImageToBase64')
          const base64 = await readLocalImageToBase64(src)
          img.setAttribute('src', base64)
          successCount++
          console.log('[PDF ImageConvert] 本地图片转换成功')
        } else if (src.startsWith('./') || src.startsWith('../')) {
          // 处理相对路径图片
          console.log('[PDF ImageConvert] 处理相对路径图片:', src)
          const base64 = await readRelativePathImageToBase64(src)
          img.setAttribute('src', base64)
          successCount++
          console.log('[PDF ImageConvert] 相对路径图片转换成功')
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
          console.log('[PDF ImageConvert] 远程图片，使用 HTTP 插件获取')
          try {
            const { fetch } = await import('@tauri-apps/plugin-http')
            console.log('[PDF ImageConvert] 发起 HTTP 请求:', src)
            const response = await fetch(src)
            console.log('[PDF ImageConvert] HTTP 响应状态:', response.status)
            
            const arrayBuffer = await response.arrayBuffer()
            console.log('[PDF ImageConvert] ArrayBuffer 大小:', arrayBuffer.byteLength, 'bytes')
            
            // 通过 magic bytes 检测图片类型
            const bytes = new Uint8Array(arrayBuffer)
            const mimeType = detectImageType(bytes)
            console.log('[PDF ImageConvert] 检测到图片格式:', mimeType)
            
            const blob = new Blob([arrayBuffer], { type: mimeType })
            const base64 = await blobToBase64(blob)
            
            console.log('[PDF ImageConvert] Base64 前缀:', base64.substring(0, 40))
            img.setAttribute('src', base64)
            successCount++
            console.log('[PDF ImageConvert] 远程图片转换成功')
          } catch (fetchError) {
            failCount++
            console.error('[PDF ImageConvert] 远程图片获取失败:', src, fetchError)
          }
        } else {
          console.log('[PDF ImageConvert] 跳过非 http/https 路径:', src)
        }
      } catch (error) {
        failCount++
        console.error('[PDF ImageConvert] 图片转换失败:', src, error)
      } finally {
        current++
        if (onProgress) {
          onProgress(current, total)
        }
      }
    }))
  }
  
  console.log(`[PDF ImageConvert] 图片处理完成：成功 ${successCount} 张，失败 ${failCount} 张`)
  
  return doc.body.innerHTML
}

/**
 * 构建完整的 HTML 文档
 * @param {string} bodyContent - body 内容
 * @returns {string} 完整 HTML
 */
function buildFullHtml(bodyContent) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown PDF Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 680px;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; page-break-before: always; break-before: page; page-break-after: avoid; break-after: avoid-page; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; page-break-after: avoid; break-after: avoid-page; }
    h3 { font-size: 1.25em; page-break-after: avoid; break-after: avoid-page; }
    h4 { page-break-after: avoid; break-after: avoid-page; }
    pre, code, table, blockquote, img { page-break-inside: avoid; break-inside: avoid; }
    pre { background: #f6f8fa; padding: 16px; overflow-x: auto; border-radius: 6px; }
    code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin: 16px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; }
    th { background: #f6f8fa; }
    p, li { orphans: 3; widows: 3; }
    img { max-width: 100%; max-height: none; height: auto; display: block; }
    hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .html2pdf__page-break { page-break-after: always; break-after: page; }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`
}

/**
 * 创建渲染容器（iframe）
 * @param {string} fullHtml - 完整 HTML
 * @returns {Promise<{container: HTMLElement, iframe: HTMLIFrameElement}>} 容器元素和 iframe 引用
 */
async function createRenderContainer(fullHtml) {
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
  
  console.log('[PDF Export] 使用 iframe 渲染完整 HTML（含样式）')
  
  await new Promise((resolve) => {
    iframe.onload = resolve
    if (iframe.contentDocument.readyState === 'complete') {
      resolve()
    }
  })
  
  const container = iframe.contentDocument.body
  container.style.width = '680px'
  
  console.log('[PDF Export] 容器宽度:', container.offsetWidth, 'px')
  console.log('[PDF Export] 图片数量:', container.querySelectorAll('img').length)
  
  return { container, iframe }
}

/**
 * 等待所有图片加载并处理宽图片缩放
 * @param {HTMLElement} container - 渲染容器
 */
async function waitForImagesAndScale(container) {
  console.log('[PDF Export] 等待图片加载...')
  const images = container.querySelectorAll('img')
  
  // 处理宽图片：手动缩小到容器宽度
  console.log('[PDF Export] 开始处理图片缩放...')
  images.forEach((img, index) => {
    if (img.naturalWidth > 680) {
      const ratio = 680 / img.naturalWidth
      const scaledHeight = Math.round(img.naturalHeight * ratio)
      img.style.width = '680px'
      img.style.height = scaledHeight + 'px'
      console.log(`[PDF Export] 缩放图片 [${index}]: ${img.naturalWidth}x${img.naturalHeight} -> 680x${scaledHeight}`)
    }
  })
  
  const imagePromises = Array.from(images).map(img => {
    return new Promise((resolve) => {
      if (img.complete) {
        console.log(`[PDF Export] 图片已加载: ${img.src.substring(0, 50)}...`)
        resolve()
      } else {
        img.onload = () => {
          console.log(`[PDF Export] 图片加载完成: ${img.src.substring(0, 50)}...`)
          resolve()
        }
        img.onerror = () => {
          console.warn(`[PDF Export] 图片加载失败: ${img.src.substring(0, 50)}...`)
          resolve()
        }
      }
    })
  })
  
  await Promise.all(imagePromises)
  console.log(`[PDF Export] 所有 ${images.length} 张图片处理完成`)
}

/**
 * 生成 PDF Blob
 * @param {Object} html2pdf - html2pdf 实例
 * @param {HTMLElement} container - 渲染容器
 * @returns {Promise<Blob>} PDF Blob
 */
async function generatePdfBlob(html2pdf, container) {
  const opt = {
    margin: [15, 15, 20, 15],
    filename: 'markdown-export.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: {
      mode: ['css', 'avoid-all'],
      avoid: ['img', 'pre', 'table', 'blockquote'],
    },
  }
  
  return await html2pdf().set(opt).from(container).outputPdf('blob')
}

/**
 * 保存 PDF 文件
 * @param {Blob} pdfBlob - PDF Blob
 * @param {Object} i18nConfig - 国际化配置
 */
async function savePdfFile(pdfBlob, i18nConfig) {
  const now = new Date()
  const timestamp = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  const defaultName = `markdown-export-${timestamp}.pdf`
  
  const filePath = await save({
    filters: [{
      name: 'PDF',
      extensions: ['pdf']
    }],
    defaultPath: defaultName
  })
  
  if (filePath) {
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
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
