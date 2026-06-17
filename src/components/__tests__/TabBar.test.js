/**
 * TabBar 组件集成测试
 *
 * 覆盖：
 * - 标签渲染（数量、标题、激活样式）
 * - 点击切换标签
 * - 点击关闭按钮
 * - 点击新建按钮
 * - 拖放文件事件
 *
 * Requirements: 5.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TabBar from '../TabBar.vue'

// Mock tab-utils，避免依赖 uuid
vi.mock('../../utils/tab-utils.js', () => ({
  getTabTitle: vi.fn((tab) => {
    if (!tab.filePath) return '未命名'
    const parts = tab.filePath.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || '未命名'
  })
}))

// 测试用的标签数据
function makeTabs() {
  return [
    { id: 'tab-1', filePath: '/home/user/note1.md', contentModified: false },
    { id: 'tab-2', filePath: '/home/user/note2.md', contentModified: false },
    { id: 'tab-3', filePath: null, contentModified: false },
  ]
}

describe('TabBar', () => {
  describe('标签渲染', () => {
    it('应渲染与 tabs 数组等量的标签项', () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-1' }
      })

      const items = wrapper.findAll('.tab-item')
      expect(items).toHaveLength(3)
    })

    it('应在没有标签时渲染空列表', () => {
      const wrapper = mount(TabBar, {
        props: { tabs: [], activeTabId: null }
      })

      expect(wrapper.findAll('.tab-item')).toHaveLength(0)
    })

    it('激活标签应带有 tab-active CSS 类', () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-2' }
      })

      const items = wrapper.findAll('.tab-item')
      expect(items[0].classes()).not.toContain('tab-active')
      expect(items[1].classes()).toContain('tab-active')
      expect(items[2].classes()).not.toContain('tab-active')
    })

    it('非激活标签不应带有 tab-active CSS 类', () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-1' }
      })

      const items = wrapper.findAll('.tab-item')
      expect(items[1].classes()).not.toContain('tab-active')
      expect(items[2].classes()).not.toContain('tab-active')
    })

    it('filePath 为 null 的标签应显示"未命名"', () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-1' }
      })

      const titles = wrapper.findAll('.tab-title')
      expect(titles[2].text()).toBe('未命名')
    })

    it('应渲染新建标签按钮', () => {
      const wrapper = mount(TabBar, {
        props: { tabs: [], activeTabId: null }
      })

      expect(wrapper.find('.tab-new').exists()).toBe(true)
    })

    it('每个标签项应包含关闭按钮', () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-1' }
      })

      const closeButtons = wrapper.findAll('.tab-close')
      expect(closeButtons).toHaveLength(3)
    })
  })

  describe('点击切换标签', () => {
    it('点击标签应发出 switch-tab 事件并携带该 tab 的 id', async () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-1' }
      })

      await wrapper.findAll('.tab-item')[1].trigger('click')

      expect(wrapper.emitted('switch-tab')).toBeTruthy()
      expect(wrapper.emitted('switch-tab')[0]).toEqual(['tab-2'])
    })

    it('点击第一个标签应发出正确的 tab id', async () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-2' }
      })

      await wrapper.findAll('.tab-item')[0].trigger('click')

      expect(wrapper.emitted('switch-tab')[0]).toEqual(['tab-1'])
    })
  })

  describe('关闭按钮', () => {
    it('点击关闭按钮应发出 close-tab 事件并携带该 tab 的 id', async () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-1' }
      })

      await wrapper.findAll('.tab-close')[1].trigger('click')

      expect(wrapper.emitted('close-tab')).toBeTruthy()
      expect(wrapper.emitted('close-tab')[0]).toEqual(['tab-2'])
    })

    it('点击关闭按钮不应触发父级的 switch-tab 事件（事件不冒泡）', async () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-1' }
      })

      await wrapper.findAll('.tab-close')[0].trigger('click')

      // close-tab 应触发，switch-tab 不应触发
      expect(wrapper.emitted('close-tab')).toBeTruthy()
      expect(wrapper.emitted('switch-tab')).toBeFalsy()
    })
  })

  describe('新建标签按钮', () => {
    it('点击 "+" 按钮应发出 new-tab 事件', async () => {
      const tabs = makeTabs()
      const wrapper = mount(TabBar, {
        props: { tabs, activeTabId: 'tab-1' }
      })

      await wrapper.find('.tab-new').trigger('click')

      expect(wrapper.emitted('new-tab')).toBeTruthy()
    })

    it('new-tab 事件不应携带参数', async () => {
      const wrapper = mount(TabBar, {
        props: { tabs: [], activeTabId: null }
      })

      await wrapper.find('.tab-new').trigger('click')

      expect(wrapper.emitted('new-tab')[0]).toEqual([])
    })
  })

  describe('拖放文件', () => {
    /**
     * 辅助函数：构建并派发自定义 DragEvent 到 .tab-bar 元素
     * @vue/test-utils 的 trigger(event, options) 会覆盖 options 中的属性；
     * 对于 dataTransfer 需要直接操作原生 DOM 事件。
     */
    function dispatchDrop(wrapper, dataTransfer) {
      const el = wrapper.find('.tab-bar').element
      const event = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'dataTransfer', {
        value: dataTransfer,
        writable: false
      })
      el.dispatchEvent(event)
    }

    it('拖放含 .md 文件时应发出 open-file 事件', async () => {
      const wrapper = mount(TabBar, {
        props: { tabs: [], activeTabId: null }
      })

      const mockFile = Object.assign(
        new File(['content'], 'test.md', { type: 'text/markdown' }),
        { path: '/home/user/test.md' }
      )

      dispatchDrop(wrapper, {
        files: [mockFile],
        getData: vi.fn().mockReturnValue(''),
        dropEffect: ''
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('open-file')).toBeTruthy()
      expect(wrapper.emitted('open-file')[0][0]).toBe('/home/user/test.md')
    })

    it('拖放 text/plain 路径（.md 扩展名）时应发出 open-file 事件', async () => {
      const wrapper = mount(TabBar, {
        props: { tabs: [], activeTabId: null }
      })

      dispatchDrop(wrapper, {
        files: [],
        getData: vi.fn((type) => type === 'text/plain' ? '/path/to/file.md' : ''),
        dropEffect: ''
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('open-file')).toBeTruthy()
      expect(wrapper.emitted('open-file')[0][0]).toBe('/path/to/file.md')
    })

    it('没有可识别文件时不应触发 open-file 事件', async () => {
      const wrapper = mount(TabBar, {
        props: { tabs: [], activeTabId: null }
      })

      dispatchDrop(wrapper, {
        files: [],
        getData: vi.fn().mockReturnValue(''),
        dropEffect: ''
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('open-file')).toBeFalsy()
    })
  })
})
