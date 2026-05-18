/**
 * i18n-helper 工具函数单元测试
 * 使用 Vitest 测试框架
 */

import { describe, it, expect } from 'vitest'
import { getI18nText, getI18nTexts, getI18nConfig, hasLanguage, getSupportedLanguages } from '../i18n-helper.js'

describe('i18n-helper', () => {
  describe('getI18nText', () => {
    it('应该正确获取中文文本', () => {
      expect(getI18nText('zh_CN', 'menu.file')).toBe('文件')
    })

    it('应该正确获取英文文本', () => {
      expect(getI18nText('en_US', 'menu.file')).toBe('File')
    })

    it('应该正确获取日文文本', () => {
      expect(getI18nText('ja_JP', 'menu.file')).toBe('ファイル')
    })

    it('应该正确获取韩文文本', () => {
      expect(getI18nText('ko_KR', 'menu.file')).toBe('파일')
    })

    it('应该正确处理嵌套路径', () => {
      expect(getI18nText('zh_CN', 'notifications.openFile.success.title')).toBe('文件打开成功')
      expect(getI18nText('en_US', 'notifications.openFile.success.title')).toBe('File Opened Successfully')
    })

    it('应该在语言不存在时回退到中文', () => {
      expect(getI18nText('fr_FR', 'menu.file')).toBe('文件')
      expect(getI18nText('de_DE', 'menu.save')).toBe('保存')
    })

    it('应该支持自定义回退语言', () => {
      expect(getI18nText('fr_FR', 'menu.file', 'en_US')).toBe('File')
    })

    it('应该处理空路径', () => {
      expect(getI18nText('zh_CN', '')).toBe('')
    })

    it('应该处理空语言', () => {
      expect(getI18nText('', 'menu.file')).toBe('menu.file')
    })

    it('应该处理不存在的路径并返回路径本身', () => {
      expect(getI18nText('zh_CN', 'nonexistent.path')).toBe('nonexistent.path')
    })
  })

  describe('getI18nTexts', () => {
    it('应该批量获取多个国际化文本', () => {
      const texts = getI18nTexts('en_US', [
        'menu.file',
        'menu.save',
        'notifications.openFile.success.title'
      ])
      
      expect(texts).toEqual({
        file: 'File',
        save: 'Save',
        title: 'File Opened Successfully'
      })
    })

    it('应该处理空数组', () => {
      const texts = getI18nTexts('zh_CN', [])
      expect(texts).toEqual({})
    })
  })

  describe('getI18nConfig', () => {
    it('应该获取完整的英文配置', () => {
      const config = getI18nConfig('en_US')
      expect(config.menu.file).toBe('File')
      expect(config.windowTitle.appName).toBe('Tauri Markdown')
    })

    it('应该通过深合并保留所有嵌套字段', () => {
      const config = getI18nConfig('en_US')
      
      // 验证顶层字段存在
      expect(config.menu).toBeDefined()
      expect(config.notifications).toBeDefined()
      expect(config.windowTitle).toBeDefined()
      expect(config.dragDrop).toBeDefined()
      
      // 验证深层字段存在（深合并的关键）
      expect(config.notifications.openFile.success.title).toBe('File Opened Successfully')
      expect(config.dragDrop.hint).toBe('Drop to open Markdown file')
    })

    it('应该在语言不存在时回退到中文', () => {
      const config = getI18nConfig('fr_FR')
      expect(config.menu.file).toBe('文件')
    })

    it('应该支持自定义回退语言', () => {
      const config = getI18nConfig('fr_FR', 'en_US')
      expect(config.menu.file).toBe('File')
    })

    it('应该优先使用当前语言的翻译', () => {
      const config = getI18nConfig('en_US')
      // 英文有自己的翻译，不应该使用中文
      expect(config.menu.file).toBe('File')
      expect(config.menu.file).not.toBe('文件')
    })
  })

  describe('hasLanguage', () => {
    it('应该正确检测存在的语言', () => {
      expect(hasLanguage('zh_CN')).toBe(true)
      expect(hasLanguage('en_US')).toBe(true)
      expect(hasLanguage('ja_JP')).toBe(true)
      expect(hasLanguage('ko_KR')).toBe(true)
    })

    it('应该正确检测不存在的语言', () => {
      expect(hasLanguage('fr_FR')).toBe(false)
      expect(hasLanguage('de_DE')).toBe(false)
      expect(hasLanguage('')).toBe(false)
    })
  })

  describe('getSupportedLanguages', () => {
    it('应该返回所有支持的语言列表', () => {
      const languages = getSupportedLanguages()
      expect(languages).toContain('zh_CN')
      expect(languages).toContain('en_US')
      expect(languages).toContain('ja_JP')
      expect(languages).toContain('ko_KR')
      expect(languages.length).toBe(4)
    })

    it('应该返回数组类型', () => {
      expect(Array.isArray(getSupportedLanguages())).toBe(true)
    })
  })

  describe('深合并功能', () => {
    it('应该深度合并嵌套对象而不是浅覆盖', () => {
      const enConfig = getI18nConfig('en_US')
      
      // 验证英文配置包含所有中文配置的字段
      expect(enConfig.menu).toHaveProperty('file')
      expect(enConfig.menu).toHaveProperty('new')
      expect(enConfig.menu).toHaveProperty('open')
      expect(enConfig.menu).toHaveProperty('save')
      
      // 验证深层嵌套也被合并
      expect(enConfig.notifications).toHaveProperty('openFile')
      expect(enConfig.notifications.openFile).toHaveProperty('success')
      expect(enConfig.notifications.openFile.success).toHaveProperty('title')
      
      // 验证拖拽相关字段也存在
      expect(enConfig.dragDrop).toHaveProperty('hint')
      expect(enConfig.dragDrop).toHaveProperty('title')
      expect(enConfig.dragDrop).toHaveProperty('unsupported')
    })

    it('应该在部分翻译时保留回退语言的字段', () => {
      // 假设未来添加了一个只翻译了部分字段的语言
      // 深合并应该确保未翻译的字段从回退语言继承
      const config = getI18nConfig('en_US')
      
      // 即使英文配置可能没有某些深层字段
      // 深合并也应该从中文配置中继承
      expect(config.windowTitle).toHaveProperty('appName')
      expect(config.windowTitle).toHaveProperty('untitled')
      expect(config.windowTitle).toHaveProperty('modifiedMarker')
    })
  })
})
