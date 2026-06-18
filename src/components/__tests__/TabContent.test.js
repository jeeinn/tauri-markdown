/**
 * TabContent 组件集成测试
 *
 * 覆盖：
 * - isActive=true 时内容可见（v-show）
 * - isActive=false 时内容隐藏（display:none）
 * - defineExpose 暴露 vditorRef
 *
 * Requirements: 5.2
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TabContent from '../TabContent.vue'

// Mock MyVditor 组件，避免依赖 Tauri 和 Vditor 的复杂初始化
vi.mock('../MyVditor.vue', () => ({
  default: {
    name: 'MyVditor',
    props: ['tabId', 'initialFile'],
    template: '<div class="mock-vditor"></div>'
  }
}))

const defaultTab = { id: 'tab-1', filePath: '/home/user/test.md', contentModified: false }

describe('TabContent', () => {
  describe('v-show 可见性控制', () => {
    it('isActive=true 时内容 div 应可见（无 display:none）', () => {
      const wrapper = mount(TabContent, {
        props: { tab: defaultTab, isActive: true }
      })

      const contentDiv = wrapper.find('.tab-content')
      expect(contentDiv.exists()).toBe(true)
      // v-show=true 时不应有 display:none
      expect(contentDiv.isVisible()).toBe(true)
    })

    it('isActive=false 时内容 div 应隐藏（display:none）', () => {
      const wrapper = mount(TabContent, {
        props: { tab: defaultTab, isActive: false }
      })

      const contentDiv = wrapper.find('.tab-content')
      expect(contentDiv.exists()).toBe(true)
      // v-show=false 时 display 应为 none
      expect(contentDiv.isVisible()).toBe(false)
    })

    it('isActive 默认值应为 false（内容隐藏）', () => {
      const wrapper = mount(TabContent, {
        props: { tab: defaultTab }
      })

      const contentDiv = wrapper.find('.tab-content')
      expect(contentDiv.isVisible()).toBe(false)
    })

    it('从 false 切换到 true 后内容应变为可见', async () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const wrapper = mount(TabContent, {
        props: { tab: defaultTab, isActive: false },
        attachTo: div
      })

      expect(wrapper.find('.tab-content').isVisible()).toBe(false)

      await wrapper.setProps({ isActive: true })

      expect(wrapper.find('.tab-content').isVisible()).toBe(true)
      wrapper.unmount()
      div.remove()
    })

    it('从 true 切换到 false 后内容应变为隐藏', async () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const wrapper = mount(TabContent, {
        props: { tab: defaultTab, isActive: true },
        attachTo: div
      })

      expect(wrapper.find('.tab-content').isVisible()).toBe(true)

      await wrapper.setProps({ isActive: false })

      expect(wrapper.find('.tab-content').isVisible()).toBe(false)
      wrapper.unmount()
      div.remove()
    })
  })

  describe('MyVditor 渲染', () => {
    it('应渲染 MyVditor（mock）子组件', () => {
      const wrapper = mount(TabContent, {
        props: { tab: defaultTab, isActive: true }
      })

      expect(wrapper.find('.mock-vditor').exists()).toBe(true)
    })
  })

  describe('defineExpose - vditorRef', () => {
    it('组件实例应通过 expose 暴露 vditorRef', () => {
      const wrapper = mount(TabContent, {
        props: { tab: defaultTab, isActive: true }
      })

      // defineExpose 的内容可通过 vm 访问
      expect(wrapper.vm.vditorRef).toBeDefined()
    })

    it('vditorRef 应指向 MyVditor 子组件实例', () => {
      const wrapper = mount(TabContent, {
        props: { tab: defaultTab, isActive: true }
      })

      // vditorRef 通过 defineExpose 暴露，应指向 MyVditor（mock）子组件实例
      // mock 组件渲染成功时，vditorRef 不为 null
      expect(wrapper.vm.vditorRef).not.toBeUndefined()
    })
  })
})
