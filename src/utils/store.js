import { Store } from '@tauri-apps/plugin-store'

// 使用应用数据目录存储，确保在不同环境下都能正常工作
const STORE_PATH = 'store.json'
const LAST_FILE_KEY = 'last_opened_file'

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
