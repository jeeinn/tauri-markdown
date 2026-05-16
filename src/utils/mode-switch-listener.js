/**
 * 编辑器模式切换监听器（单例模式）
 * 
 * 提供通用的模式切换事件订阅/取消订阅机制
 * 避免多个功能重复实现轮询检测逻辑
 * 
 * 使用方式：
 *   import modeSwitchListener from './mode-switch-listener.js'
 *   
 *   // 订阅模式切换事件
 *   const unsubscribe = modeSwitchListener.subscribe((newMode, oldMode, vditor) => {
 *     console.log('模式切换:', oldMode, '->', newMode)
 *   })
 *   
 *   // 取消订阅
 *   unsubscribe()
 */

/**
 * 模式切换监听器类
 */
class ModeSwitchListener {
  constructor(options = {}) {
    // 状态
    this._vditorRef = null;           // Vditor 实例引用（getter 函数）
    this._subscribers = [];           // 订阅者列表
    this._lastMode = null;            // 上次编辑模式
    this._pollInterval = null;        // 轮询定时器
    this._pollIntervalMs = options.pollIntervalMs ?? 300;       // 轮询间隔（毫秒）
    this._domReadyWaitMs = options.domReadyWaitMs ?? 150;       // DOM 渲染等待时间（毫秒）
    this._isHandlingSwitch = false;   // 防止重复处理
  }
  
  /**
   * 设置 Vditor 实例引用
   * @param {Function} vditorRef - 获取 Vditor 实例的 getter 函数
   */
  setVditorRef(vditorRef) {
    this._vditorRef = vditorRef;
    // 重置上次模式，确保能检测到首次模式切换
    this._lastMode = null;
  }
  
  /**
   * 获取当前 Vditor 实例
   */
  getVditor() {
    if (typeof this._vditorRef === 'function') {
      return this._vditorRef();
    }
    return null;
  }
  
  /**
   * 订阅模式切换事件
   * @param {Function} callback - 回调函数 (newMode, oldMode, vditor) => void
   * @returns {Function} 取消订阅的函数
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.warn('[ModeSwitchListener] subscribe 参数必须是函数');
      return () => {};
    }
    
    this._subscribers.push(callback);
    
    // 启动轮询（如果还没启动）
    this._startPolling();
    
    // 返回取消订阅函数
    return () => {
      this._subscribers = this._subscribers.filter(cb => cb !== callback);
      
      // 如果没有订阅者了，停止轮询
      if (this._subscribers.length === 0) {
        this._stopPolling();
      }
    };
  }
  
  /**
   * 取消订阅（兼容旧 API）
   * @param {Function} callback - 要取消的回调函数
   */
  unsubscribe(callback) {
    if (callback) {
      this._subscribers = this._subscribers.filter(cb => cb !== callback);
      
      if (this._subscribers.length === 0) {
        this._stopPolling();
      }
    }
  }
  
  /**
   * 启动轮询检测
   * @private
   */
  _startPolling() {
    if (this._pollInterval) return; // 已经在运行
    
    // 初始化上次模式
    const vditor = this.getVditor();
    if (vditor && vditor.vditor) {
      this._lastMode = vditor.vditor.currentMode;
    }
    
    this._pollInterval = setInterval(() => {
      this._checkModeChange();
    }, this._pollIntervalMs);
    
    console.log('[ModeSwitchListener] 轮询已启动');
  }
  
  /**
   * 停止轮询
   * @private
   */
  _stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
      console.log('[ModeSwitchListener] 轮询已停止');
    }
  }
  
  /**
   * 检测模式变化
   * @private
   */
  _checkModeChange() {
    const vditor = this.getVditor();
    if (!vditor || !vditor.vditor) return;
    
    const currentMode = vditor.vditor.currentMode;
    
    if (currentMode !== this._lastMode && !this._isHandlingSwitch) {
      this._handleModeChange(currentMode, this._lastMode, vditor);
    }
  }
  
  /**
   * 处理模式切换
   * @private
   */
  async _handleModeChange(newMode, oldMode, vditor) {
    // 防止重复处理
    if (this._isHandlingSwitch) return;
    this._isHandlingSwitch = true;
    
    try {
      console.log('[ModeSwitchListener] 检测到模式切换:', oldMode, '->', newMode);
      
      // 等待新模式 DOM 渲染完成（可配置）
      await new Promise(resolve => setTimeout(resolve, this._domReadyWaitMs));
      
      // 通知所有订阅者
      for (const callback of this._subscribers) {
        try {
          await callback(newMode, oldMode, vditor);
        } catch (error) {
          console.error('[ModeSwitchListener] 订阅者回调执行失败:', error);
        }
      }
      
      // 更新最后模式记录
      this._lastMode = newMode;
      console.log('[ModeSwitchListener] 模式切换处理完成');
    } finally {
      this._isHandlingSwitch = false;
    }
  }
  
  /**
   * 销毁实例（清理资源）
   */
  destroy() {
    this._stopPolling();
    this._subscribers = [];
    this._vditorRef = null;
    this._lastMode = null;
    console.log('[ModeSwitchListener] 实例已销毁');
  }
  
  /**
   * 获取当前订阅者数量（用于调试）
   * @returns {number} 订阅者数量
   */
  getSubscriberCount() {
    return this._subscribers.length;
  }
}

// 创建单例实例
const modeSwitchListener = new ModeSwitchListener();

export default modeSwitchListener;
