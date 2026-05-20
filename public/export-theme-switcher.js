/**
 * PDF 导出专用 - 强制应用浅色主题
 * 
 * 此脚本在 iframe 中执行，确保导出的 PDF 始终使用浅色主题
 * 即使父页面处于暗色模式，也不会影响导出结果
 */
(function() {
  'use strict';
  
  console.log('[Export Theme Switcher] 脚本开始执行');
  console.log('[Export Theme Switcher] document.readyState:', document.readyState);
  
  /**
   * 应用浅色主题到文档
   */
  function applyLightTheme() {
    console.log('[Export Theme] 强制应用浅色主题 - 开始');
    
    try {
      // 1. 设置 color-scheme
      document.documentElement.style.colorScheme = 'light';
      document.body.style.colorScheme = 'light';
      console.log('[Export Theme] ✓ color-scheme 已设置为 light');
      
      // 2. 移除可能的暗色类名
      const darkClasses = ['dark', 'vditor--dark', 'theme-dark', 'dark-theme'];
      darkClasses.forEach(className => {
        document.documentElement.classList.remove(className);
        document.body.classList.remove(className);
        
        // 也移除所有子元素中的暗色类名
        const elements = document.querySelectorAll('.' + className);
        elements.forEach(el => el.classList.remove(className));
      });
      console.log('[Export Theme] ✓ 暗色类名已移除');
      
      // 3. 强制设置根元素和 body 的背景和文字颜色
      document.documentElement.style.setProperty('background-color', '#ffffff', 'important');
      document.documentElement.style.setProperty('color', '#1a1a1a', 'important');
      document.body.style.setProperty('background-color', '#ffffff', 'important');
      document.body.style.setProperty('color', '#1a1a1a', 'important');
      console.log('[Export Theme] ✓ 根元素和 body 样式已设置');
      
      // 4. 处理 vditor-reset 容器
      const vditorReset = document.querySelector('.vditor-reset');
      if (vditorReset) {
        vditorReset.style.setProperty('background-color', '#ffffff', 'important');
        vditorReset.style.setProperty('color', '#1a1a1a', 'important');
        vditorReset.classList.remove('vditor-reset--dark');
        console.log('[Export Theme] ✓ vditor-reset 容器已处理');
      } else {
        console.warn('[Export Theme] ⚠ 未找到 .vditor-reset 容器');
      }
      
      // 5. 强制所有代码块使用浅色背景
      const codeElements = document.querySelectorAll('pre, code, .hljs');
      console.log('[Export Theme] 处理代码块数量:', codeElements.length);
      codeElements.forEach(el => {
        el.style.setProperty('background-color', '#f6f8fa', 'important');
        el.style.setProperty('color', '#24292e', 'important');
      });
      console.log('[Export Theme] ✓ 代码块已处理');
      
      // 6. 强制表格使用浅色背景
      const tableElements = document.querySelectorAll('table, th, td');
      console.log('[Export Theme] 处理表格元素数量:', tableElements.length);
      tableElements.forEach(el => {
        if (el.tagName === 'TH') {
          el.style.setProperty('background-color', '#f6f8fa', 'important');
        } else {
          el.style.setProperty('background-color', '#ffffff', 'important');
        }
        el.style.setProperty('color', '#1a1a1a', 'important');
      });
      console.log('[Export Theme] ✓ 表格已处理');
      
      // 7. 处理引用块
      const blockquotes = document.querySelectorAll('blockquote');
      console.log('[Export Theme] 处理引用块数量:', blockquotes.length);
      blockquotes.forEach(el => {
        el.style.setProperty('background-color', '#f6f8fa', 'important');
        el.style.setProperty('color', '#1a1a1a', 'important');
        el.style.setProperty('border-left-color', '#dfe2e5', 'important');
      });
      console.log('[Export Theme] ✓ 引用块已处理');
      
      // 8. 处理链接
      const links = document.querySelectorAll('a');
      links.forEach(el => {
        el.style.setProperty('color', '#0366d6', 'important');
      });
      console.log('[Export Theme] ✓ 链接颜色已设置');
      
      console.log('[Export Theme] ✓✓✓ 浅色主题应用完成 ✓✓✓');
      
      // 最终检查 - 输出计算后的样式
      const computedStyle = window.getComputedStyle(document.body);
      console.log('[Export Theme] 最终计算样式:');
      console.log('[Export Theme]   - backgroundColor:', computedStyle.backgroundColor);
      console.log('[Export Theme]   - color:', computedStyle.color);
      console.log('[Export Theme]   - colorScheme:', computedStyle.colorScheme);
      
    } catch (error) {
      console.error('[Export Theme] ✗ 应用浅色主题时出错:', error);
      console.error('[Export Theme] 错误堆栈:', error.stack);
    }
  }
  
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    console.log('[Export Theme Switcher] 等待 DOMContentLoaded 事件');
    document.addEventListener('DOMContentLoaded', applyLightTheme);
  } else {
    console.log('[Export Theme Switcher] DOM 已就绪，立即执行');
    // 使用 setTimeout 确保 CSS 已加载
    setTimeout(applyLightTheme, 50);
  }
  
  // 暴露全局函数供外部调用（可选）
  window.__exportApplyLightTheme = applyLightTheme;
  
})();
