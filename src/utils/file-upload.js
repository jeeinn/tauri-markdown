/**
 * 文件上传工具模块
 *
 * 提供文件上传的核心逻辑，支持本地存储和图床上传。
 * 从 MyVditor.vue 提取，降低组件复杂度。
 */

import { ElNotification, ElMessageBox } from 'element-plus'
import { readTextFile, writeTextFile, writeFile, exists, mkdir, remove } from '@tauri-apps/plugin-fs'
import { dirname, join, normalize, tempDir } from '@tauri-apps/api/path'
import imagePathMapper from './image-path-mapper.js'
import { calculateFileHash, isImageFile } from './file-utils.js'
import { getImageHostConfig, uploadToImageHost, uploadToSMMS } from './image-host-config.js'

const DEBUG = import.meta.env.DEV

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

    if (imageHostConfig && imageHostConfig.enabled && imageHostConfig.current) {
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
 * 本地存储上传
 * @private
 */
async function handleLocalUpload(files, context) {
  if (DEBUG) console.log('[Upload] 开始处理本地上传, 文件数量:', files.length)

  const errFiles = []
  const succMap = {}

  for (const file of files) {
    try {
      if (DEBUG) console.log('[Upload] 处理文件:', file.name)

      const isImage = isImageFile(file)
      const maxImageSize = 10 * 1024 * 1024
      const maxFileSize = 50 * 1024 * 1024

      if (isImage && file.size > maxImageSize) {
        console.warn('[Upload] 图片超过 10MB 限制:', file.name)
        errFiles.push(file.name)
        continue
      }
      if (!isImage && file.size > maxFileSize) {
        console.warn('[Upload] 文件超过 50MB 限制:', file.name)
        errFiles.push(file.name)
        continue
      }

      if (!context.currentFilePath) {
        console.warn('[Upload] 未打开文件,无法确定保存位置')
        const noFileTip = context.i18n.uploadNoFile || {}
        ElMessageBox.alert(
          noFileTip.message || '当前文档尚未保存到本地,无法确定存储位置。请先保存文件(Ctrl+S)后再上传。',
          noFileTip.title || '请先保存文件',
          { confirmButtonText: noFileTip.confirmButtonText || '我知道了', type: 'warning' }
        )
        return [{ code: 1, msg: 'File not saved', data: { errFiles: files.map(f => f.name), succMap: {} } }]
      }

      const subDir = isImage ? 'assets/images' : 'assets/files'
      const currentDir = await dirname(context.currentFilePath)
      const fullAssetsPath = await normalize(await join(currentDir, subDir))
      const assetsDirExists = await exists(fullAssetsPath)

      if (!assetsDirExists) {
        try {
          await mkdir(fullAssetsPath, { parents: true })
        } catch (mkdirError) {
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

      await file.arrayBuffer()
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
      succMap[file.name] = { url: fileUrl, isImage }
      imagePathMapper.addMapping(fileUrl, relativePath)
    } catch (error) {
      console.error('[Upload] 文件上传失败:', file.name, error)
      errFiles.push(file.name)
    }
  }

  showUploadResult(errFiles, succMap, context.i18n)

  return [{
    code: 0,
    msg: '',
    data: { errFiles, succMap }
  }]
}

/**
 * 图床上传
 * @private
 */
async function handleUploadToImageHost(files, config, context) {
  const errFiles = []
  const succMap = {}

  for (const file of files) {
    try {
      const isImage = isImageFile(file)

      if (!isImage) {
        if (DEBUG) console.log('[Upload] 非图片文件,使用本地存储')
        errFiles.push(file.name)
        continue
      }

      let imageUrl
      if (config.current === 'smms') {
        imageUrl = await uploadToSMMS(file, config)
      } else {
        const tempPath = await saveFileToTemp(file)
        imageUrl = await uploadToImageHost(tempPath, config)
        await cleanupTempFile(tempPath)
      }

      succMap[file.name] = { url: imageUrl, isImage: true }
    } catch (error) {
      console.error('[Upload] 图床上传失败:', file.name, error)
      errFiles.push(file.name)
    }
  }

  showUploadResult(errFiles, succMap, context.i18n)

  return [{
    code: 0,
    msg: '',
    data: { errFiles, succMap }
  }]
}

/**
 * 显示上传结果通知
 * @private
 */
function showUploadResult(errFiles, succMap, i18n) {
  if (errFiles.length > 0) {
    ElNotification.error({
      title: i18n.uploadFailed?.title || '上传失败',
      message: i18n.uploadFailed?.message?.replace('{count}', errFiles.length) || `${errFiles.length} 个文件上传失败`,
      duration: 5000
    })
  }
  if (Object.keys(succMap).length > 0) {
    ElNotification.success({
      title: i18n.uploadSuccess?.title || '上传成功',
      message: i18n.uploadSuccess?.message?.replace('{count}', Object.keys(succMap).length) || `${Object.keys(succMap).length} 个文件上传成功`,
      duration: 3000
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
