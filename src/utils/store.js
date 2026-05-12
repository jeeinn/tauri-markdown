import { Store } from '@tauri-apps/plugin-store'

// 使用应用数据目录存储，确保在不同环境下都能正常工作
const STORE_PATH = 'store.json'
const LAST_FILE_KEY = 'last_opened_file'
const THEME_KEY = 'app_theme'

let storeInstance = null

async function getStore() {
  if (!storeInstance) {
    try {
      console.log('[DEBUG Store] 加载 store:', STORE_PATH)
      storeInstance = await Store.load(STORE_PATH)
      console.log('[DEBUG Store] Store 加载成功')
    } catch (error) {
      console.error('[ERROR Store] Store 加载失败:', error)
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
