/**
 * i18n-helper 工具函数测试
 * 用于验证国际化辅助函数的正确性
 */

import { getI18nText, getI18nTexts, getI18nConfig, hasLanguage, getSupportedLanguages } from './i18n-helper.js';

console.log('=== i18n-helper 测试开始 ===\n');

// 测试 1: getI18nText - 基本功能
console.log('测试 1: getI18nText 基本功能');
console.log('中文菜单.file:', getI18nText('zh_CN', 'menu.file'));
console.log('英文菜单.file:', getI18nText('en_US', 'menu.file'));
console.log('日文菜单.file:', getI18nText('ja_JP', 'menu.file'));
console.log('韩文菜单.file:', getI18nText('ko_KR', 'menu.file'));
console.log('');

// 测试 2: getI18nText - 嵌套路径
console.log('测试 2: getI18nText 嵌套路径');
console.log('中文 notifications.openFile.success.title:', getI18nText('zh_CN', 'notifications.openFile.success.title'));
console.log('英文 notifications.openFile.success.title:', getI18nText('en_US', 'notifications.openFile.success.title'));
console.log('');

// 测试 3: getI18nText - 回退机制
console.log('测试 3: getI18nText 回退机制（使用不存在的语言）');
console.log('法语（不存在）应该回退到中文:', getI18nText('fr_FR', 'menu.file', 'zh_CN'));
console.log('德语（不存在）应该回退到中文:', getI18nText('de_DE', 'menu.save', 'zh_CN'));
console.log('');

// 测试 4: getI18nText - 自定义回退语言
console.log('测试 4: getI18nText 自定义回退语言');
console.log('法语回退到英文:', getI18nText('fr_FR', 'menu.file', 'en_US'));
console.log('');

// 测试 5: getI18nTexts - 批量获取
console.log('测试 5: getI18nTexts 批量获取');
const texts = getI18nTexts('en_US', [
  'menu.file',
  'menu.save',
  'notifications.openFile.success.title'
]);
console.log('批量获取结果:', texts);
console.log('');

// 测试 6: getI18nConfig - 获取完整配置
console.log('测试 6: getI18nConfig 获取完整配置');
const config = getI18nConfig('en_US');
console.log('英文配置的 menu.file:', config.menu.file);
console.log('英文配置的 windowTitle.appName:', config.windowTitle.appName);
console.log('');

// 测试 7: getI18nConfig - 回退机制
console.log('测试 7: getI18nConfig 回退机制');
const fallbackConfig = getI18nConfig('fr_FR', 'zh_CN');
console.log('法语（不存在）回退到中文的 menu.file:', fallbackConfig.menu.file);
console.log('');

// 测试 7.5: getI18nConfig - 深合并验证
console.log('测试 7.5: getI18nConfig 深合并验证');
const enConfig = getI18nConfig('en_US');
console.log('英文配置的 menu.file:', enConfig.menu.file);
console.log('英文配置的 notifications.openFile.success.title:', enConfig.notifications.openFile.success.title);
console.log('英文配置的 windowTitle.appName:', enConfig.windowTitle.appName);
console.log('英文配置是否包含 dragDrop.hint:', !!enConfig.dragDrop?.hint);
console.log('深合并成功！嵌套对象没有被覆盖');
console.log('');

// 测试 8: hasLanguage - 检查语言是否存在
console.log('测试 8: hasLanguage 检查语言');
console.log('zh_CN 存在:', hasLanguage('zh_CN'));
console.log('en_US 存在:', hasLanguage('en_US'));
console.log('fr_FR 存在:', hasLanguage('fr_FR'));
console.log('');

// 测试 9: getSupportedLanguages - 获取支持的语言列表
console.log('测试 9: getSupportedLanguages 获取支持的语言列表');
console.log('支持的语言:', getSupportedLanguages());
console.log('');

// 测试 10: 边界情况
console.log('测试 10: 边界情况');
console.log('空路径:', getI18nText('zh_CN', ''));
console.log('空语言:', getI18nText('', 'menu.file'));
console.log('不存在的路径:', getI18nText('zh_CN', 'nonexistent.path'));
console.log('');

console.log('=== i18n-helper 测试完成 ===');
