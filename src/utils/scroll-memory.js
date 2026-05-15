/**
 * 滚动位置记忆管理器
 * 
 * 负责管理 Vditor 编辑器的滚动位置保存和恢复功能
 * 支持三种编辑模式（IR/SV/WYSIWYG）的独立位置记忆
 * 提供开关控制、节流防抖、渲染稳定检测等功能
 */

import { saveScrollPosition, getScrollPosition } from './store.js'

export class ScrollMemoryManager {
  constructor(vditorRef, options = {}) {
    // Vditor 实例引用（通过 getter 获取最新值）
    this._getVditor = vditorRef
    
    // 配置选项
    this.config = {
      throttleMs: options.throttleMs ?? 200,        // 滚动事件节流时间
      debounceMs: options.debounceMs ?? 500,        // Store 写入防抖时间
      pollMaxTimes: options.pollMaxTimes ?? 50,     // 渲染稳定检测最大轮询次数
      pollIntervalMs: options.pollIntervalMs ?? 50, // 轮询间隔
      stableCheckCount: options.stableCheckCount ?? 3, // 连续稳定检测次数
      modeCheckIntervalMs: options.modeCheckIntervalMs ?? 300, // 模式切换检测间隔
    }
    
    // 状态
    this.enabled = options.enabled ?? true          // 功能开关
    this.scrollPositionsCache = {}                  // 内存缓存 { [filePath]: percentage }
    this._scrollEl = null                           // 当前绑定的滚动元素
    this._scrollThrottleTimer = null                // 滚动节流定时器
    this._storeSaveTimer = null                     // Store 写入防抖定时器
    this._modeCheckInterval = null                  // 模式切换轮询定时器
    this._lastMode = null                           // 上次编辑模式
    this._isHandlingModeChange = false              // 防止重复处理模式切换
    
    // 回调函数（由外部传入）
    this._onFilePathChange = options.onFilePathChange || (() => null)
    this._getCurrentFilePath = options.getCurrentFilePath || (() => null)
    this._onAfterModeChange = options.onAfterModeChange || null  // 模式切换完成后的回调
  }
  
  /**
   * 初始化滚动记忆功能
   * @param {Function} getCurrentFilePath - 获取当前文件路径的函数
   */
  init(getCurrentFilePath) {
    if (getCurrentFilePath) {
      this._getCurrentFilePath = getCurrentFilePath
    }
  }
  
  /**
   * 设置功能开关状态
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.enabled = enabled
    
    if (!enabled) {
      // 禁用时清除当前文件的缓存
      const filePath = this._getCurrentFilePath()
      if (filePath && this.scrollPositionsCache[filePath]) {
        delete this.scrollPositionsCache[filePath]
      }
      // 停止滚动监听
      this._unbindScrollListener()
    } else {
      // 重新启用时绑定监听
      this.setupScrollListener()
    }
  }
  
  /**
   * 获取当前模式下的滚动容器
   * @returns {HTMLElement|null}
   */
  getScrollElement() {
    const vditor = this._getVditor()
    if (!vditor || !vditor.vditor) return null
    
    const vditorInstance = vditor.vditor
    const mode = vditorInstance.currentMode
    
    if (mode === 'ir' && vditorInstance.ir) return vditorInstance.ir.element
    if (mode === 'sv' && vditorInstance.sv) return vditorInstance.sv.element
    if (mode === 'wysiwyg' && vditorInstance.wysiwyg) return vditorInstance.wysiwyg.element
    
    return null
  }
  
  /**
   * 设置滚动监听（节流）
   */
  setupScrollListener() {
    if (!this.enabled) return
    
    const el = this.getScrollElement()
    if (!el) return
    
    // 移除旧监听
    this._unbindScrollListener()
    
    this._scrollEl = el
    this._onScroll = () => {
      if (this._scrollThrottleTimer) return
      this._scrollThrottleTimer = setTimeout(() => {
        this._scrollThrottleTimer = null
        this.saveCurrentScrollPosition()
      }, this.config.throttleMs)
    }
    el.addEventListener('scroll', this._onScroll)
  }
  
  /**
   * 解绑滚动监听
   * @private
   */
  _unbindScrollListener() {
    if (this._scrollEl && this._onScroll) {
      this._scrollEl.removeEventListener('scroll', this._onScroll)
      this._scrollEl = null
      this._onScroll = null
    }
  }
  
  /**
   * 设置模式切换监听器（通过轮询检测 currentMode 变化）
   */
  setupEditModeListener() {
    const vditor = this._getVditor()
    if (!vditor || !vditor.vditor) {
      console.warn('[ScrollMemory] Vditor 未初始化，无法设置模式监听器')
      return
    }
    
    // 初始化最后模式记录
    this._lastMode = vditor.vditor.currentMode
    
    // 使用轮询方式检测模式变化
    this._modeCheckInterval = setInterval(() => {
      const vditor = this._getVditor()
      if (!vditor || !vditor.vditor) return
      
      const currentMode = vditor.vditor.currentMode
      if (currentMode !== this._lastMode && !this._isHandlingModeChange) {
        this.handleModeChange()
      }
    }, this.config.modeCheckIntervalMs)
  }
  
  /**
   * 处理模式切换
   */
  async handleModeChange() {
    if (!this.enabled) return
    
    // 防止重复处理
    if (this._isHandlingModeChange) return
    this._isHandlingModeChange = true
    
    try {
      const filePath = this._getCurrentFilePath()
      if (!filePath) return
      
      const vditor = this._getVditor()
      const oldMode = this._lastMode
      const newMode = vditor?.vditor?.currentMode
      
      // 如果模式没有变化，忽略
      if (oldMode === newMode) {
        this._isHandlingModeChange = false
        return
      }
      
      console.log('[ScrollMemory] 检测到模式切换:', oldMode, '->', newMode)
      
      // 保存当前模式的滚动位置（在 DOM 销毁前）
      this.saveCurrentScrollPosition()
      
      // 等待新模式 DOM 渲染完成
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // 重新绑定滚动监听器到新模式的元素
      this.setupScrollListener()
      
      // 恢复滚动位置
      await this.restoreScrollPosition(filePath)
      
      // 触发模式切换完成回调（用于重新应用主题等）
      if (typeof this._onAfterModeChange === 'function') {
        await this._onAfterModeChange(newMode, oldMode)
      }
      
      // 更新最后模式记录
      this._lastMode = newMode
      console.log('[ScrollMemory] 模式切换完成')
    } finally {
      // 确保标志位被重置
      this._isHandlingModeChange = false
    }
  }
  
  /**
   * 保存当前滚动位置到内存缓存（节流回调）
   */
  saveCurrentScrollPosition() {
    if (!this.enabled) return
    
    const el = this.getScrollElement()
    const filePath = this._getCurrentFilePath()
    
    if (!el || !filePath) return
    
    const sh = el.scrollHeight
    const ch = el.clientHeight
    if (sh <= ch) return // 内容未溢出，无需保存
    
    const pct = el.scrollTop / (sh - ch)
    if (!isFinite(pct)) return
    
    this.scrollPositionsCache[filePath] = pct
    
    // 防抖写入 Store
    if (this._storeSaveTimer) clearTimeout(this._storeSaveTimer)
    this._storeSaveTimer = setTimeout(() => {
      this._storeSaveTimer = null
      this.flushScrollPosition()
    }, this.config.debounceMs)
  }
  
  /**
   * 立即将当前文件的滚动位置写入 Store
   */
  async flushScrollPosition() {
    if (!this.enabled) return
    
    const filePath = this._getCurrentFilePath()
    if (!filePath) return
    
    const pct = this.scrollPositionsCache[filePath]
    if (pct == null) return
    
    await saveScrollPosition(filePath, pct)
  }
  
  /**
   * 加载文件后恢复滚动位置
   * @param {string} filePath - 文件路径
   */
  async restoreScrollPosition(filePath) {
    if (!this.enabled) return
    
    const el = this.getScrollElement()
    if (!el) return
    
    const pct = await getScrollPosition(filePath)
    if (pct == null || pct <= 0) return
    
    // 轮询等待 Vditor 渲染稳定（scrollHeight 连续 3 次不变）
    let prevHeight = 0
    let stableCount = 0
    
    for (let i = 0; i < this.config.pollMaxTimes; i++) {
      await new Promise(r => setTimeout(r, this.config.pollIntervalMs))
      const sh = el.scrollHeight
      
      if (sh === prevHeight && sh > 0) {
        stableCount++
        if (stableCount >= this.config.stableCheckCount) {
          const scrollTop = Math.round(pct * (sh - el.clientHeight))
          el.scrollTop = Math.min(scrollTop, sh - el.clientHeight)
          console.log('[ScrollMemory] 滚动位置已恢复:', filePath, '百分比:', pct.toFixed(4))
          return
        }
      } else {
        stableCount = 0
        prevHeight = sh
      }
    }
    
    // 超时后备：直接尝试一次
    console.warn('[ScrollMemory] 渲染稳定检测超时，使用后备方案恢复滚动位置')
    const scrollTop = Math.round(pct * (el.scrollHeight - el.clientHeight))
    el.scrollTop = Math.min(scrollTop, el.scrollHeight - el.clientHeight)
  }
  
  /**
   * 清理资源（组件卸载时调用）
   */
  destroy() {
    // 保存当前滚动位置
    if (this.enabled) {
      this.flushScrollPosition()
    }
    
    // 清理定时器
    if (this._scrollThrottleTimer) {
      clearTimeout(this._scrollThrottleTimer)
      this._scrollThrottleTimer = null
    }
    
    if (this._storeSaveTimer) {
      clearTimeout(this._storeSaveTimer)
      this._storeSaveTimer = null
    }
    
    if (this._modeCheckInterval) {
      clearInterval(this._modeCheckInterval)
      this._modeCheckInterval = null
    }
    
    // 解绑滚动监听
    this._unbindScrollListener()
    
    // 清空缓存
    this.scrollPositionsCache = {}
  }
}

/**
 * 创建滚动记忆管理器实例的工厂函数
 * @param {object} vditorRef - Vditor 实例的引用对象 { value: vditor }
 * @param {object} options - 配置选项
 * @returns {ScrollMemoryManager}
 */
export function createScrollMemoryManager(vditorRef, options = {}) {
  return new ScrollMemoryManager(vditorRef, options)
}
