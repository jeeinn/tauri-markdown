import { Store } from '@tauri-apps/plugin-store'
import { invoke } from '@tauri-apps/api/core'

// 使用应用数据目录存储，确保在不同环境下都能正常工作
const STORE_PATH = 'store.json'
const LAST_FILE_KEY = 'last_opened_file'
const THEME_KEY = 'app_theme'
const ZEN_MODE_KEY = 'is_zen_mode'
const LANGUAGE_KEY = 'app_language'
const MULTI_TAB_MODE_KEY = 'multi_tab_mode'

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
const EDITOR_FONT_SIZE_KEY = 'editor_font_size'
const OUTLINE_WIDTH_KEY = 'outline_sidebar_width'

export const DEFAULT_EDITOR_FONT_SIZE = 16
export const MIN_EDITOR_FONT_SIZE = 10
export const MAX_EDITOR_FONT_SIZE = 100

export const DEFAULT_OUTLINE_WIDTH = 250
export const MIN_OUTLINE_WIDTH = 180
export const MAX_OUTLINE_WIDTH = 500

/** 将大纲侧栏宽度限制在合法范围内并取整 */
export function clampOutlineWidth(width) {
  const n = Number(width)
  if (Number.isNaN(n)) return DEFAULT_OUTLINE_WIDTH
  return Math.min(MAX_OUTLINE_WIDTH, Math.max(MIN_OUTLINE_WIDTH, Math.round(n)))
}

/** 将字号限制在合法范围内并取整 */
export function clampEditorFontSize(size) {
  const n = Number(size)
  if (Number.isNaN(n)) return DEFAULT_EDITOR_FONT_SIZE
  return Math.min(MAX_EDITOR_FONT_SIZE, Math.max(MIN_EDITOR_FONT_SIZE, Math.round(n)))
}

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

export async function saveEditorFontSize(size) {
  try {
    const store = await getStore()
    await store.set(EDITOR_FONT_SIZE_KEY, clampEditorFontSize(size))
    await store.save()
  } catch (error) {
    console.error('[Store] 保存编辑器字号失败:', error)
  }
}

export async function getEditorFontSize() {
  try {
    const store = await getStore()
    const size = await store.get(EDITOR_FONT_SIZE_KEY)
    if (size === null || size === undefined) return DEFAULT_EDITOR_FONT_SIZE
    return clampEditorFontSize(size)
  } catch (error) {
    console.error('[Store] 获取编辑器字号失败:', error)
    return DEFAULT_EDITOR_FONT_SIZE
  }
}

export async function saveOutlineWidth(width) {
  try {
    const store = await getStore()
    await store.set(OUTLINE_WIDTH_KEY, clampOutlineWidth(width))
    await store.save()
  } catch (error) {
    console.error('[Store] 保存大纲侧栏宽度失败:', error)
  }
}

export async function getOutlineWidth() {
  try {
    const store = await getStore()
    const width = await store.get(OUTLINE_WIDTH_KEY)
    if (width === null || width === undefined) return DEFAULT_OUTLINE_WIDTH
    return clampOutlineWidth(width)
  } catch (error) {
    console.error('[Store] 获取大纲侧栏宽度失败:', error)
    return DEFAULT_OUTLINE_WIDTH
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

// ─── 多标签页持久化 ───────────────────────────────────────────────────────────

const TABS_KEY = 'tabs'
const ACTIVE_TAB_ID_KEY = 'activeTabId'

/**
 * 序列化并保存标签页数组
 * @param {Array} tabsArray - Tab 对象数组
 */
export async function saveTabs(tabsArray) {
  try {
    const store = await getStore()
    await store.set(TABS_KEY, tabsArray)
    await store.save()
  } catch (error) {
    console.error('[Store] 保存标签页数组失败:', error)
  }
}

/**
 * 读取并返回标签页数组；若无记录则返回空数组
 * @returns {Promise<Array>} Tab 对象数组
 */
export async function loadTabs() {
  try {
    const store = await getStore()
    const tabs = await store.get(TABS_KEY)
    return Array.isArray(tabs) ? tabs : []
  } catch (error) {
    console.error('[Store] 读取标签页数组失败:', error)
    return []
  }
}

/**
 * 保存当前活跃标签页 ID
 * @param {string|null} id - 活跃标签 ID
 */
export async function saveActiveTabId(id) {
  try {
    const store = await getStore()
    await store.set(ACTIVE_TAB_ID_KEY, id)
    await store.save()
  } catch (error) {
    console.error('[Store] 保存活跃标签 ID 失败:', error)
  }
}

/**
 * 读取并返回活跃标签页 ID；若无记录则返回 null
 * @returns {Promise<string|null>} 活跃标签 ID 或 null
 */
export async function loadActiveTabId() {
  try {
    const store = await getStore()
    const id = await store.get(ACTIVE_TAB_ID_KEY)
    return id ?? null
  } catch (error) {
    console.error('[Store] 读取活跃标签 ID 失败:', error)
    return null
  }
}

/**
 * 清除所有标签页持久化数据
 */
export async function clearAllTabs() {
  try {
    const store = await getStore()
    await store.delete(TABS_KEY)
    await store.delete(ACTIVE_TAB_ID_KEY)
    await store.save()
  } catch (error) {
    console.error('[Store] 清除标签页数据失败:', error)
  }
}

/**
 * 保存多标签模式开关状态
 * @param {boolean} enabled - 是否启用多标签模式
 */
export async function saveMultiTabMode(enabled) {
  try {
    const store = await getStore()
    await store.set(MULTI_TAB_MODE_KEY, enabled)
    await store.save()
  } catch (error) {
    console.error('[Store] 保存多标签模式设置失败:', error)
  }
}

/**
 * 读取多标签模式开关状态；默认为 true（启用）
 * @returns {Promise<boolean>}
 */
export async function getMultiTabMode() {
  try {
    const store = await getStore()
    const value = await store.get(MULTI_TAB_MODE_KEY)
    return value !== false
  } catch (error) {
    console.error('[Store] 读取多标签模式设置失败:', error)
    return true
  }
}
