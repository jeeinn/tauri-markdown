/**
 * 图床配置管理工具模块
 * 提供配置的保存、读取和测试连接功能
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * 保存图床配置
 * @param {Object} config - 图床配置对象
 * @param {string} storageType - 存储方式: 'tauri_store' | 'picgo_native'
 * @returns {Promise<void>}
 */
export async function saveImageHostConfig(config, storageType = 'tauri_store') {
  try {
    console.log('[ImageHost Config] 保存配置:', config, '存储方式:', storageType)
    await invoke('save_image_host_config', { 
      config, 
      storageType 
    })
    console.log('[ImageHost Config] 配置保存成功')
  } catch (error) {
    console.error('[ImageHost Config] 保存配置失败:', error)
    throw error
  }
}

/**
 * 获取图床配置
 * @returns {Promise<Object|null>} 配置对象,如果不存在则返回 null
 */
export async function getImageHostConfig() {
  try {
    console.log('[ImageHost Config] 获取配置...')
    const config = await invoke('get_image_host_config')
    console.log('[ImageHost Config] 获取到的配置:', config)
    return config
  } catch (error) {
    console.error('[ImageHost Config] 获取配置失败:', error)
    return null
  }
}

/**
 * 测试图床连接
 * @param {Object} config - 图床配置对象
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function testImageHostConnection(config) {
  try {
    console.log('[ImageHost Config] 测试连接...')
    const result = await invoke('test_image_host_connection', { config })
    console.log('[ImageHost Config] 测试结果:', result)
    return result
  } catch (error) {
    console.error('[ImageHost Config] 测试连接失败:', error)
    return {
      success: false,
      message: error.message || '连接测试失败'
    }
  }
}

/**
 * 上传图片到图床
 * @param {string} filePath - 文件路径
 * @param {Object} config - 图床配置对象
 * @returns {Promise<string>} 图片 URL
 */
export async function uploadToImageHost(filePath, config) {
  try {
    console.log('[ImageHost Upload] 开始上传:', filePath)
    const imageUrl = await invoke('upload_to_image_host', {
      filePath,
      config
    })
    console.log('[ImageHost Upload] 上传成功, URL:', imageUrl)
    return imageUrl
  } catch (error) {
    console.error('[ImageHost Upload] 上传失败:', error)
    throw error
  }
}

/**
 * 上传图片到 SM.MS (JavaScript 端实现)
 * @param {File} file - File 对象
 * @param {Object} config - SM.MS 配置对象
 * @returns {Promise<string>} 图片 URL
 */
export async function uploadToSMMS(file, config) {
  try {
    console.log('[SM.MS Upload] 开始上传:', file.name)
    
    const formData = new FormData()
    formData.append('smfile', file)
    
    const headers = {}
    if (config.smms && config.smms.token) {
      headers['Authorization'] = config.smms.token
    }
    
    // 使用 Tauri HTTP 插件的 fetch
    const { fetch } = await import('@tauri-apps/plugin-http')
    
    const response = await fetch('https://sm.ms/api/v2/upload', {
      method: 'POST',
      headers,
      body: formData
      // 注意: 不要手动设置 Content-Type，让 fetch 自动处理 multipart boundary
    })
    
    const result = await response.json()
    
    // SM.MS 返回结构: { "code": "success", "data": { "url": "..." } }
    if (result.code === 'success') {
      const url = result.data?.url
      if (url) {
        console.log('[SM.MS Upload] 上传成功, URL:', url)
        return url
      } else {
        throw new Error('上传成功但未返回图片链接')
      }
    } else {
      const message = result.msg || result.message || '未知错误'
      throw new Error(`上传失败: ${message}`)
    }
  } catch (error) {
    console.error('[SM.MS Upload] 上传失败:', error)
    throw error
  }
}
