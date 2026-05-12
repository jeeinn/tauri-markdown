/**
 * 国际化辅助工具函数
 * 提供安全的国际化文本访问方式，避免硬编码和重复的容错逻辑
 */

import menuI18nConfig from '../config/menu-i18n.js';

/**
 * 获取国际化文本
 * @param {string} lang - 当前语言代码 (如: 'zh_CN', 'en_US')
 * @param {string} path - 配置路径 (如: 'notifications.openFile.success.title')
 * @param {string} [fallbackLang='zh_CN'] - 回退语言，默认为中文
 * @returns {string} 国际化文本，如果找不到则返回路径本身作为最后兜底
 * 
 * @example
 * // 获取简单路径
 * getI18nText('en_US', 'menu.file') // 'File'
 * 
 * // 获取嵌套路径
 * getI18nText('en_US', 'notifications.openFile.success.title') // 'File Opened Successfully'
 * 
 * // 自动回退到中文
 * getI18nText('fr_FR', 'menu.file') // '文件' (因为法语不存在，回退到中文)
 */
export function getI18nText(lang, path, fallbackLang = 'zh_CN') {
  if (!lang || !path) {
    console.warn('[i18n] Invalid parameters:', { lang, path });
    return path || '';
  }

  // 将路径字符串转换为数组，如 'notifications.openFile.success.title' -> ['notifications', 'openFile', 'success', 'title']
  const keys = path.split('.');
  
  // 尝试从当前语言获取
  let value = menuI18nConfig[lang];
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      value = undefined;
      break;
    }
  }
  
  // 如果找到了值且是字符串，直接返回
  if (typeof value === 'string') {
    return value;
  }
  
  // 如果当前语言没有找到，尝试从回退语言获取
  if (fallbackLang && fallbackLang !== lang) {
    let fallbackValue = menuI18nConfig[fallbackLang];
    for (const key of keys) {
      if (fallbackValue && typeof fallbackValue === 'object' && key in fallbackValue) {
        fallbackValue = fallbackValue[key];
      } else {
        fallbackValue = undefined;
        break;
      }
    }
    
    if (typeof fallbackValue === 'string') {
      return fallbackValue;
    }
  }
  
  // 如果都没找到，返回路径作为最后的兜底（便于调试）
  console.warn(`[i18n] Translation not found for path: "${path}" in languages: ${lang}, ${fallbackLang}`);
  return path;
}

/**
 * 批量获取国际化文本
 * @param {string} lang - 当前语言代码
 * @param {string[]} paths - 配置路径数组
 * @param {string} [fallbackLang='zh_CN'] - 回退语言
 * @returns {Object} 键值对对象，键为路径的最后一段，值为翻译文本
 * 
 * @example
 * const texts = getI18nTexts('en_US', [
 *   'menu.file',
 *   'menu.save',
 *   'notifications.openFile.success.title'
 * ]);
 * // { file: 'File', save: 'Save', title: 'File Opened Successfully' }
 */
export function getI18nTexts(lang, paths, fallbackLang = 'zh_CN') {
  const result = {};
  for (const path of paths) {
    const keys = path.split('.');
    const lastKey = keys[keys.length - 1];
    result[lastKey] = getI18nText(lang, path, fallbackLang);
  }
  return result;
}

/**
 * 深合并两个对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的对象
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        // 递归深合并嵌套对象
        result[key] = deepMerge(target[key], source[key]);
      } else {
        // 直接赋值（包括数组、基本类型等）
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * 获取整个国际化配置对象（用于需要完整对象的场景）
 * @param {string} lang - 当前语言代码
 * @param {string} [fallbackLang='zh_CN'] - 回退语言
 * @returns {Object} 合并后的配置对象
 * 
 * @example
 * const config = getI18nConfig('en_US');
 * config.menu.file // 'File'
 */
export function getI18nConfig(lang, fallbackLang = 'zh_CN') {
  const currentConfig = menuI18nConfig[lang];
  const fallbackConfig = menuI18nConfig[fallbackLang];
  
  if (!currentConfig) {
    console.warn(`[i18n] Language config not found: ${lang}, using fallback: ${fallbackLang}`);
    return fallbackConfig || menuI18nConfig.zh_CN;
  }
  
  // 深合并，当前语言的配置优先
  return deepMerge(fallbackConfig, currentConfig);
}

/**
 * 检查语言配置是否存在
 * @param {string} lang - 语言代码
 * @returns {boolean}
 */
export function hasLanguage(lang) {
  return lang in menuI18nConfig;
}

/**
 * 获取所有支持的语言列表
 * @returns {string[]} 语言代码数组
 */
export function getSupportedLanguages() {
  return Object.keys(menuI18nConfig);
}

// 默认导出，方便使用
export default {
  getI18nText,
  getI18nTexts,
  getI18nConfig,
  hasLanguage,
  getSupportedLanguages,
};
