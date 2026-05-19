import { Store } from '@tauri-apps/plugin-store'
import { invoke } from '@tauri-apps/api/core'

// 使用应用数据目录存储，确保在不同环境下都能正常工作
const STORE_PATH = 'store.json'
const LAST_FILE_KEY = 'last_opened_file'
const THEME_KEY = 'app_theme'
const ZEN_MODE_KEY = 'is_zen_mode'
const LANGUAGE_KEY = 'app_language'

let storeInstance = null
let isPortableMode = null

// 检测是否为便携模式
async function checkPortableMode() {
  if (isPortableMode === null) {
    try {
      isPortableMode = await invoke('get_portable_mode')
      console.log('[DEBUG Store] Portable mode:', isPortableMode)
    } catch (error) {
      console.error('[ERROR Store] Failed to detect portable mode:', error)
      isPortableMode = false
    }
  }
  return isPortableMode
}

async function getStore() {
  if (!storeInstance) {
    try {
      const portable = await checkPortableMode()
      
      let storePath = STORE_PATH
      if (portable) {
        // 在便携模式下，从后端获取正确的绝对路径
        try {
          storePath = await invoke('get_store_path')
          console.log('[DEBUG Store] Portable mode: using path from backend:', storePath)
        } catch (error) {
          console.error('[ERROR Store] Failed to get store path from backend, falling back to relative path:', error)
          storePath = STORE_PATH
        }
      } else {
        console.log('[DEBUG Store] Normal mode: using default path:', storePath)
      }
      
      console.log('[DEBUG Store] Loading store with path:', storePath)
      storeInstance = await Store.load(storePath)
      console.log('[DEBUG Store] Store loaded successfully')
    } catch (error) {
      console.error('[ERROR Store] Failed to load store:', error)
      console.error('[ERROR Store] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      })
      throw error
    }
  }
  return storeInstance
}

export async function saveLastFilePath(filePath) {
  try {
    console.log('[DEBUG Store] 保存文件路径:', filePath)
    const store = await getStore()
    await store.set(LAST_FILE_KEY, filePath)
    await store.save()
    console.log('[DEBUG Store] 文件路径保存成功')
  } catch (error) {
    console.error('[ERROR Store] 保存文件路径失败:', error)
  }
}

export async function getLastFilePath() {
  try {
    console.log('[DEBUG Store] 开始获取上次文件路径...')
    const store = await getStore()
    const path = await store.get(LAST_FILE_KEY)
    console.log('[DEBUG Store] 获取到的路径:', path)
    return path
  } catch (error) {
    console.error('[ERROR Store] 获取文件路径失败:', error)
    return null
  }
}

export async function clearLastFilePath() {
  try {
    const store = await getStore()
    await store.delete(LAST_FILE_KEY)
    await store.save()
  } catch (error) {
    console.error('清除文件路径失败:', error)
  }
}

export async function saveTheme(theme) {
  try {
    const store = await getStore()
    await store.set(THEME_KEY, theme)
    await store.save()
  } catch (error) {
    console.error('[Store] 保存主题偏好失败:', error)
  }
}

export async function getTheme() {
  try {
    const store = await getStore()
    const theme = await store.get(THEME_KEY)
    return theme || 'auto'
  } catch (error) {
    console.error('[Store] 获取主题偏好失败:', error)
    return 'auto'
  }
}

const SCROLL_POSITIONS_KEY = 'last_scroll_positions'
const SCROLL_POSITION_EXPIRY_DAYS = 30 // 滚动位置过期天数
const SCROLL_REMEMBER_ENABLED_KEY = 'scroll_remember_enabled' // 滚动记忆开关

export async function saveScrollPosition(filePath, percentage) {
  try {
    const store = await getStore()
    const positions = await store.get(SCROLL_POSITIONS_KEY) || {}
    
    // 存储带时间戳的数据结构
    positions[filePath] = {
      percentage,
      lastAccessed: Date.now()
    }
    
    // 清理过期数据（超过 30 天未访问）
    const expiryTime = Date.now() - SCROLL_POSITION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    Object.keys(positions).forEach(key => {
      const record = positions[key]
      // 兼容旧格式（直接存数字）和新格式（对象）
      const lastAccessed = typeof record === 'object' ? record.lastAccessed : 0
      if (lastAccessed < expiryTime) {
        delete positions[key]
      }
    })
    
    await store.set(SCROLL_POSITIONS_KEY, positions)
    await store.save()
  } catch (error) {
    console.error('[Store] 保存滚动位置失败:', error)
  }
}

export async function getScrollPosition(filePath) {
  try {
    const store = await getStore()
    const positions = await store.get(SCROLL_POSITIONS_KEY) || {}
    const record = positions[filePath]
    
    if (!record) return null
    
    // 兼容旧格式（直接存数字）和新格式（对象）
    if (typeof record === 'object') {
      // 更新最后访问时间
      record.lastAccessed = Date.now()
      await store.set(SCROLL_POSITIONS_KEY, positions)
      await store.save()
      return record.percentage
    }
    
    return record
  } catch (error) {
    console.error('[Store] 获取滚动位置失败:', error)
    return null
  }
}

export async function clearScrollPosition(filePath) {
  try {
    const store = await getStore()
    const positions = await store.get(SCROLL_POSITIONS_KEY) || {}
    delete positions[filePath]
    await store.set(SCROLL_POSITIONS_KEY, positions)
    await store.save()
  } catch (error) {
    console.error('[Store] 清除滚动位置失败:', error)
  }
}

// 滚动记忆开关相关函数
export async function saveScrollRememberEnabled(enabled) {
  try {
    const store = await getStore()
    await store.set(SCROLL_REMEMBER_ENABLED_KEY, enabled)
    await store.save()
  } catch (error) {
    console.error('[Store] 保存滚动记忆开关失败:', error)
  }
}

export async function getScrollRememberEnabled() {
  try {
    const store = await getStore()
    const enabled = await store.get(SCROLL_REMEMBER_ENABLED_KEY)
    return enabled !== false // 默认启用
  } catch (error) {
    console.error('[Store] 获取滚动记忆开关失败:', error)
    return true // 默认启用
  }
}

// 语言设置相关函数
export async function saveLanguage(language) {
  try {
    const store = await getStore()
    await store.set(LANGUAGE_KEY, language)
    await store.save()
  } catch (error) {
    console.error('[Store] 保存语言设置失败:', error)
  }
}

export async function getLanguage() {
  try {
    const store = await getStore()
    const language = await store.get(LANGUAGE_KEY)
    return language || 'zh_CN'
  } catch (error) {
    console.error('[Store] 获取语言设置失败:', error)
    return 'zh_CN'
  }
}

// Zen 模式相关函数
export async function saveZenMode(enabled) {
  try {
    const store = await getStore()
    await store.set(ZEN_MODE_KEY, enabled)
    await store.save()
  } catch (error) {
    console.error('[Store] 保存 Zen 模式状态失败:', error)
  }
}

export async function getZenMode() {
  try {
    const store = await getStore()
    const enabled = await store.get(ZEN_MODE_KEY)
    return enabled === true // 默认关闭
  } catch (error) {
    console.error('[Store] 获取 Zen 模式状态失败:', error)
    return false
  }
}
