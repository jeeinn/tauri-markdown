/**
 * 编辑器模式切换监听器（单例模式）
 * 
 * 提供通用的模式切换事件订阅/取消订阅机制
 * 避免多个功能重复实现轮询检测逻辑
 * 
 * 使用方式：
 *   import { modeSwitchListener } from './mode-switch-listener.js'
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
 * 创建模式切换监听器实例
 */
function createModeSwitchListener() {
  // 单例实例
  let _instance = null;
  
  /**
   * 获取单例实例
   */
  function getInstance() {
    if (!_instance) {
      _instance = createInstance();
    }
    return _instance;
  }
  
  /**
   * 创建实例
   */
  function createInstance() {
    // 状态
    let _vditorRef = null;           // Vditor 实例引用（getter 函数）
    let _subscribers = [];           // 订阅者列表
    let _lastMode = null;            // 上次编辑模式
    let _pollInterval = null;        // 轮询定时器
    let _pollIntervalMs = 300;       // 轮询间隔（毫秒）
    let _isHandlingSwitch = false;    // 防止重复处理
    
    /**
     * 设置 Vditor 实例引用
     * @param {Function} vditorRef - 获取 Vditor 实例的 getter 函数
     */
    function setVditorRef(vditorRef) {
      _vditorRef = vditorRef;
    }
    
    /**
     * 获取当前 Vditor 实例
     */
    function getVditor() {
      if (typeof _vditorRef === 'function') {
        return _vditorRef();
      }
      return null;
    }
    
    /**
     * 订阅模式切换事件
     * @param {Function} callback - 回调函数 (newMode, oldMode, vditor) => void
     * @returns {Function} 取消订阅的函数
     */
    function subscribe(callback) {
      if (typeof callback !== 'function') {
        console.warn('[ModeSwitchListener] subscribe 参数必须是函数');
        return () => {};
      }
      
      _subscribers.push(callback);
      
      // 启动轮询（如果还没启动）
      _startPolling();
      
      // 返回取消订阅函数
      return function unsubscribe() {
        _subscribers = _subscribers.filter(cb => cb !== callback);
        
        // 如果没有订阅者了，停止轮询
        if (_subscribers.length === 0) {
          _stopPolling();
        }
      };
    }
    
    /**
     * 取消订阅（兼容旧 API）
     * @param {Function} callback - 要取消的回调函数
     */
    function unsubscribe(callback) {
      if (callback) {
        _subscribers = _subscribers.filter(cb => cb !== callback);
        
        if (_subscribers.length === 0) {
          _stopPolling();
        }
      }
    }
    
    /**
     * 启动轮询检测
     * @private
     */
    function _startPolling() {
      if (_pollInterval) return; // 已经在运行
      
      // 初始化上次模式
      const vditor = getVditor();
      if (vditor && vditor.vditor) {
        _lastMode = vditor.vditor.currentMode;
      }
      
      _pollInterval = setInterval(() => {
        _checkModeChange();
      }, _pollIntervalMs);
      
      console.log('[ModeSwitchListener] 轮询已启动');
    }
    
    /**
     * 停止轮询
     * @private
     */
    function _stopPolling() {
      if (_pollInterval) {
        clearInterval(_pollInterval);
        _pollInterval = null;
        console.log('[ModeSwitchListener] 轮询已停止');
      }
    }
    
    /**
     * 检测模式变化
     * @private
     */
    function _checkModeChange() {
      const vditor = getVditor();
      if (!vditor || !vditor.vditor) return;
      
      const currentMode = vditor.vditor.currentMode;
      
      if (currentMode !== _lastMode && !_isHandlingSwitch) {
        _handleModeChange(currentMode, _lastMode, vditor);
      }
    }
    
    /**
     * 处理模式切换
     * @private
     */
    async function _handleModeChange(newMode, oldMode, vditor) {
      // 防止重复处理
      if (_isHandlingSwitch) return;
      _isHandlingSwitch = true;
      
      try {
        console.log('[ModeSwitchListener] 检测到模式切换:', oldMode, '->', newMode);
        
        // 等待新模式 DOM 渲染完成
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 通知所有订阅者
        for (const callback of _subscribers) {
          try {
            await callback(newMode, oldMode, vditor);
          } catch (error) {
            console.error('[ModeSwitchListener] 订阅者回调执行失败:', error);
          }
        }
        
        // 更新最后模式记录
        _lastMode = newMode;
        console.log('[ModeSwitchListener] 模式切换处理完成');
      } finally {
        _isHandlingSwitch = false;
      }
    }
    
    /**
     * 销毁实例（清理资源）
     */
    function destroy() {
      _stopPolling();
      _subscribers = [];
      _vditorRef = null;
      _lastMode = null;
      _instance = null;
      console.log('[ModeSwitchListener] 实例已销毁');
    }
    
    // 返回公共 API
    return {
      setVditorRef,
      getVditor,
      subscribe,
      unsubscribe,
      destroy,
    };
  }
  
  // 返回单例工厂
  return {
    getInstance,
  };
}

// 创建单例
const modeSwitchListenerFactory = createModeSwitchListener();
const modeSwitchListener = modeSwitchListenerFactory.getInstance();

export { modeSwitchListenerFactory, modeSwitchListener };
export default modeSwitchListener;
