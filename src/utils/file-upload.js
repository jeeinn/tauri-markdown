/**
 * 文件上传工具模块
 *
 * 提供文件上传的核心逻辑，支持本地存储和图床上传。
 * 从 MyVditor.vue 提取，降低组件复杂度。
 */

import { ElNotification, ElMessageBox } from 'element-plus'
import { writeFile, exists, mkdir, remove } from '@tauri-apps/plugin-fs'
import { dirname, join, normalize, tempDir } from '@tauri-apps/api/path'
import imagePathMapper from './image-path-mapper.js'
import { calculateFileHash, isImageFile } from './file-utils.js'
import { getImageHostConfig, uploadToImageHost, uploadToSMMS } from './image-host-config.js'

const DEBUG = import.meta.env.DEV

/**
 * @typedef {{ name: string, reason: string }} UploadErrorEntry
 */

/**
 * 处理文件上传（图片和非图片分离处理）
 *
 * @param {File[]} files - 待上传文件列表
 * @param {Object} context
 * @param {string|null} context.currentFilePath - 当前打开的文件路径
 * @param {Object} context.i18n - 国际化文本对象
 * @returns {Promise<Array>} [{ code, msg, data: { errFiles, succMap } }]
 */
export async function uploadFiles(files, context) {
  if (DEBUG) console.log('[Upload] 开始处理文件上传, 文件数量:', files.length)

  const uploadingNotification = ElNotification.info({
    title: context.i18n.uploading?.title || '上传中',
    message: context.i18n.uploading?.message || '正在上传文件...',
    duration: 0,
    showClose: false,
  })

  try {
    const imageHostConfig = await getImageHostConfig()

    if (imageHostConfig?.enabled && imageHostConfig.current) {
      if (DEBUG) console.log('[Upload] 使用图床上传')
      return await handleUploadToImageHost(files, imageHostConfig, context)
    }

    if (DEBUG) console.log('[Upload] 使用本地存储')
    return await handleLocalUpload(files, context)
  } catch (error) {
    console.warn('[Upload] 上传过程异常,回退到本地存储:', error)
    return await handleLocalUpload(files, context)
  } finally {
    uploadingNotification.close()
  }
}

/**
 * 替换模板中的 {key} 占位符
 * @param {string} template
 * @param {Record<string, string|number>} vars
 */
function formatTemplate(template, vars) {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

/**
 * 将异常转为用户可读的错误说明
 * @param {unknown} error
 * @param {Object} i18n
 * @param {'local'|'imageHost'} mode
 */
function describeUploadError(error, i18n, mode = 'local') {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  const lower = msg.toLowerCase()

  const networkHints = [
    'fetch', 'network', 'connection', 'timeout', 'dns', 'econnrefused',
    'enotfound', 'failed to fetch', '请求失败', '连接', '网络',
  ]
  if (networkHints.some((hint) => lower.includes(hint))) {
    return i18n.uploadErrorNetwork?.message || '网络连接失败'
  }

  if (/创建目录失败|mkdir|permission denied|access denied|权限|eacces/i.test(lower)) {
    return i18n.uploadErrorMkdir?.message || '创建目录失败'
  }

  if (/写入|write|storage|空间|disk full|enospc/i.test(lower)) {
    return i18n.uploadErrorWrite?.message || '文件写入失败'
  }

  if (mode === 'imageHost' && msg) {
    return msg
  }

  return msg || (i18n.uploadErrorUnknown?.message || '未知错误')
}

/**
 * 上传单个文件到本地 assets 目录
 * @returns {Promise<{ ok: true, entry: { url: string, isImage: boolean } } | { ok: false, error: string }>}
 */
async function uploadLocalFile(file, context) {
  const i18n = context.i18n
  const isImage = isImageFile(file)
  const maxImageSize = 10 * 1024 * 1024
  const maxFileSize = 50 * 1024 * 1024

  if (isImage && file.size > maxImageSize) {
    return {
      ok: false,
      error: formatTemplate(i18n.uploadErrorSizeLimit?.message || '文件超过大小限制（图片 10MB）', {
        name: file.name,
      }),
    }
  }
  if (!isImage && file.size > maxFileSize) {
    return {
      ok: false,
      error: formatTemplate(i18n.uploadErrorSizeLimit?.message || '文件超过大小限制（50MB）', {
        name: file.name,
      }),
    }
  }

  if (!context.currentFilePath) {
    return { ok: false, error: i18n.uploadNoFile?.title || '请先保存文件' }
  }

  try {
    const subDir = isImage ? 'assets/images' : 'assets/files'
    const currentDir = await dirname(context.currentFilePath)
    const fullAssetsPath = await normalize(await join(currentDir, subDir))
    const assetsDirExists = await exists(fullAssetsPath)

    if (!assetsDirExists) {
      try {
        await mkdir(fullAssetsPath, { parents: true })
      } catch {
        try {
          const assetsPath = await normalize(await join(currentDir, 'assets'))
          const assetsExists = await exists(assetsPath)
          if (!assetsExists) await mkdir(assetsPath, { parents: true })
          await mkdir(fullAssetsPath, { parents: true })
        } catch (secondError) {
          throw new Error(`创建目录失败: ${secondError.message || '未知错误'}`)
        }
      }
    }

    const fileHash = await calculateFileHash(file)
    const ext = file.name.split('.').pop()
    const hashFileName = `${fileHash}.${ext}`
    const destPath = await normalize(await join(fullAssetsPath, hashFileName))

    const fileExists = await exists(destPath)
    if (!fileExists) {
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      await writeFile(destPath, uint8Array)
    }

    const relativePath = `./${subDir}/${hashFileName}`
    const fileUrl = `http://tmd.localhost/${subDir}/${hashFileName}`
    imagePathMapper.addMapping(fileUrl, relativePath)

    return { ok: true, entry: { url: fileUrl, isImage } }
  } catch (error) {
    console.error('[Upload] 本地文件上传失败:', file.name, error)
    return { ok: false, error: describeUploadError(error, i18n, 'local') }
  }
}

/**
 * 本地存储上传
 * @private
 */
async function handleLocalUpload(files, context) {
  if (DEBUG) console.log('[Upload] 开始处理本地上传, 文件数量:', files.length)

  /** @type {UploadErrorEntry[]} */
  const errFiles = []
  const succMap = {}

  for (const file of files) {
    if (!context.currentFilePath) {
      console.warn('[Upload] 未打开文件,无法确定保存位置')
      const noFileTip = context.i18n.uploadNoFile || {}
      ElMessageBox.alert(
        noFileTip.message || '当前文档尚未保存到本地,无法确定存储位置。请先保存文件(Ctrl+S)后再上传。',
        noFileTip.title || '请先保存文件',
        { confirmButtonText: noFileTip.confirmButtonText || '我知道了', type: 'warning' }
      )
      return [{
        code: 1,
        msg: 'File not saved',
        data: { errFiles: files.map((f) => f.name), succMap: {} },
      }]
    }

    const result = await uploadLocalFile(file, context)
    if (result.ok) {
      succMap[file.name] = result.entry
    } else {
      errFiles.push({ name: file.name, reason: result.error })
    }
  }

  showUploadResult(errFiles, succMap, context.i18n, { mode: 'local' })

  return [{
    code: 0,
    msg: '',
    data: {
      errFiles: errFiles.map((e) => e.name),
      succMap,
    },
  }]
}

/**
 * 图床上传；失败时可选择回退到本地存储
 * @private
 */
async function handleUploadToImageHost(files, config, context) {
  /** @type {UploadErrorEntry[]} */
  const errFiles = []
  const succMap = {}
  /** @type {{ file: File, reason: string }[]} */
  const hostFailed = []

  for (const file of files) {
    if (!isImageFile(file)) {
      const localResult = await uploadLocalFile(file, context)
      if (localResult.ok) {
        succMap[file.name] = localResult.entry
      } else {
        errFiles.push({ name: file.name, reason: localResult.error })
      }
      continue
    }

    try {
      let imageUrl
      if (config.current === 'smms') {
        imageUrl = await uploadToSMMS(file, config)
      } else {
        const tempPath = await saveFileToTemp(file)
        try {
          imageUrl = await uploadToImageHost(tempPath, config)
        } finally {
          await cleanupTempFile(tempPath)
        }
      }
      succMap[file.name] = { url: imageUrl, isImage: true }
    } catch (error) {
      console.error('[Upload] 图床上传失败:', file.name, error)
      hostFailed.push({
        file,
        reason: describeUploadError(error, context.i18n, 'imageHost'),
      })
    }
  }

  if (hostFailed.length > 0) {
    await tryFallbackToLocal(hostFailed, context, errFiles, succMap)
  }

  showUploadResult(errFiles, succMap, context.i18n, { mode: 'imageHost' })

  return [{
    code: 0,
    msg: '',
    data: {
      errFiles: errFiles.map((e) => e.name),
      succMap,
    },
  }]
}

/**
 * 图床失败后询问用户是否回退到本地存储
 * @private
 */
async function tryFallbackToLocal(hostFailed, context, errFiles, succMap) {
  const i18n = context.i18n
  const prompt = i18n.uploadFallbackPrompt || {}
  const primaryReason = hostFailed[0].reason

  let confirmed = false
  try {
    await ElMessageBox.confirm(
      formatTemplate(
        prompt.message || '图床上传失败（{reason}），是否将 {count} 个文件回退保存到本地？',
        { count: hostFailed.length, reason: primaryReason }
      ),
      prompt.title || '图床上传失败',
      {
        confirmButtonText: prompt.confirmButtonText || '回退到本地',
        cancelButtonText: prompt.cancelButtonText || '取消',
        type: 'warning',
        distinguishCancelAndClose: true,
      }
    )
    confirmed = true
  } catch {
    confirmed = false
  }

  if (!confirmed) {
    errFiles.push(...hostFailed.map(({ file, reason }) => ({ name: file.name, reason })))
    return
  }

  /** @type {UploadErrorEntry[]} */
  const fallbackErrors = []
  let fallbackSuccessCount = 0

  for (const { file } of hostFailed) {
    const result = await uploadLocalFile(file, context)
    if (result.ok) {
      succMap[file.name] = result.entry
      fallbackSuccessCount++
    } else {
      fallbackErrors.push({ name: file.name, reason: result.error })
    }
  }

  if (fallbackSuccessCount > 0) {
    const fallbackTip = i18n.uploadFallbackSuccess || {}
    ElNotification.warning({
      title: fallbackTip.title || '已回退到本地存储',
      message: formatTemplate(
        fallbackTip.message || '图床上传失败，已将 {count} 个文件保存到本地 assets 目录',
        { count: fallbackSuccessCount, reason: primaryReason }
      ),
      duration: 5000,
    })
  }

  errFiles.push(...fallbackErrors)
}

/**
 * 显示上传结果通知
 * @private
 * @param {UploadErrorEntry[]} errFiles
 * @param {Record<string, { url: string, isImage: boolean }>} succMap
 * @param {Object} i18n
 * @param {{ mode?: 'local'|'imageHost' }} [options]
 */
function showUploadResult(errFiles, succMap, i18n, options = {}) {
  const mode = options.mode || 'local'

  if (errFiles.length > 0) {
    const failedConfig = mode === 'imageHost'
      ? (i18n.uploadFailedImageHost || i18n.uploadFailed)
      : i18n.uploadFailed

    const baseMsg = formatTemplate(
      failedConfig?.message || '{count} 个文件上传失败',
      { count: errFiles.length }
    )
    const detailTemplate = i18n.uploadErrorDetail?.message || '{name}: {reason}'
    const details = errFiles
      .map(({ name, reason }) => formatTemplate(detailTemplate, { name, reason }))
      .join('\n')

    ElNotification.error({
      title: failedConfig?.title || '上传失败',
      message: details ? `${baseMsg}\n${details}` : baseMsg,
      duration: 8000,
    })
  }

  if (Object.keys(succMap).length > 0) {
    ElNotification.success({
      title: i18n.uploadSuccess?.title || '上传成功',
      message: formatTemplate(
        i18n.uploadSuccess?.message || '{count} 个文件上传成功',
        { count: Object.keys(succMap).length }
      ),
      duration: 3000,
    })
  }
}

/**
 * 保存文件到临时目录
 * @private
 */
async function saveFileToTemp(file) {
  const tempDirPath = await tempDir()
  const tempFileName = `upload_${Date.now()}_${file.name}`
  const tempFilePath = await join(tempDirPath, tempFileName)
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  await writeFile(tempFilePath, uint8Array)
  return tempFilePath
}

/**
 * 清理临时文件
 * @private
 */
async function cleanupTempFile(filePath) {
  try {
    await remove(filePath)
  } catch (error) {
    console.warn('[Upload] 清理临时文件失败:', error)
  }
}
