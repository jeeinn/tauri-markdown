/**
 * 大纲侧栏增强测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  calcResizedWidth,
  applyOutlineWidth,
  syncToolbarPadding,
  enrichOutlineTitles,
  createOutlineSidebarManager,
} from '../outline-sidebar.js'
import {
  clampOutlineWidth,
  DEFAULT_OUTLINE_WIDTH,
  MIN_OUTLINE_WIDTH,
  MAX_OUTLINE_WIDTH,
} from '../store.js'

vi.mock('../store.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getOutlineWidth: vi.fn().mockResolvedValue(300),
    saveOutlineWidth: vi.fn().mockResolvedValue(undefined),
  }
})

describe('clampOutlineWidth', () => {
  it('应返回默认值当输入非法', () => {
    expect(clampOutlineWidth('bad')).toBe(DEFAULT_OUTLINE_WIDTH)
  })

  it('应限制在最小和最大范围内', () => {
    expect(clampOutlineWidth(100)).toBe(MIN_OUTLINE_WIDTH)
    expect(clampOutlineWidth(999)).toBe(MAX_OUTLINE_WIDTH)
    expect(clampOutlineWidth(320)).toBe(320)
  })
})

describe('calcResizedWidth', () => {
  it('左侧大纲应随向右拖拽变宽', () => {
    expect(calcResizedWidth(250, 30, 'left')).toBe(280)
    expect(calcResizedWidth(250, -100, 'left')).toBe(MIN_OUTLINE_WIDTH)
  })

  it('右侧大纲应反向计算宽度', () => {
    expect(calcResizedWidth(250, 30, 'right')).toBe(220)
    expect(calcResizedWidth(250, -30, 'right')).toBe(280)
  })
})

describe('applyOutlineWidth', () => {
  it('应将宽度写入元素 style', () => {
    const el = document.createElement('div')
    applyOutlineWidth(el, 320)
    expect(el.style.width).toBe('320px')
  })
})

describe('syncToolbarPadding', () => {
  it('应根据可见大纲宽度更新工具栏 paddingLeft', () => {
    const outlineEl = document.createElement('div')
    Object.defineProperty(outlineEl, 'offsetWidth', { value: 300 })
    outlineEl.style.display = 'block'

    const toolbarEl = document.createElement('div')
    const modeEl = document.createElement('div')
    modeEl.style.paddingLeft = '35px'

    const vditorInstance = {
      vditor: {
        currentMode: 'ir',
        options: { outline: { position: 'left' } },
        outline: { element: outlineEl },
        toolbar: { element: toolbarEl },
        preview: { element: { style: { display: 'none' } } },
        ir: { element: modeEl },
      },
    }

    syncToolbarPadding(vditorInstance)
    expect(toolbarEl.style.paddingLeft).toBe('335px')
  })
})

describe('enrichOutlineTitles', () => {
  it('应为标题 span 设置 title 属性', () => {
    const outlineEl = document.createElement('div')
    outlineEl.innerHTML = `
      <ul>
        <li><span><svg></svg><span>这是一个很长的标题</span></span></li>
      </ul>
    `
    enrichOutlineTitles(outlineEl)
    const span = outlineEl.querySelector('li > span > span')
    expect(span.title).toBe('这是一个很长的标题')
  })
})

describe('createOutlineSidebarManager', () => {
  let manager
  let outlineEl
  let vditorInstance

  beforeEach(() => {
    outlineEl = document.createElement('div')
    outlineEl.className = 'vditor-outline'
    outlineEl.style.display = 'block'
    outlineEl.innerHTML = `
      <div class="vditor-outline__title">大纲</div>
      <div class="vditor-outline__content">
        <ul><li><span><svg></svg><span>标题一</span></span></li></ul>
      </div>
    `
    Object.defineProperty(outlineEl, 'offsetWidth', {
      configurable: true,
      get() {
        const width = parseInt(outlineEl.style.width || '300', 10)
        return Number.isNaN(width) ? 300 : width
      },
    })

    document.body.appendChild(outlineEl)

    vditorInstance = {
      vditor: {
        currentMode: 'ir',
        options: { outline: { position: 'left' } },
        outline: {
          element: outlineEl,
          render: vi.fn(),
        },
        toolbar: { element: document.createElement('div') },
        preview: { element: { style: { display: 'none' } } },
        ir: { element: document.createElement('div') },
      },
    }

    manager = createOutlineSidebarManager({
      getVditor: () => vditorInstance,
    })
  })

  afterEach(() => {
    manager?.destroy()
    outlineEl?.remove()
  })

  it('setup 应挂载增强样式和拖拽手柄', async () => {
    await manager.setup()
    expect(outlineEl.classList.contains('outline-sidebar-enhanced')).toBe(true)
    const handle = outlineEl.querySelector('.outline-sidebar-resize-handle')
    const contentEl = outlineEl.querySelector('.vditor-outline__content')
    expect(handle).not.toBeNull()
    expect(contentEl).not.toBeNull()
    // 手柄必须在 content 之前，保证 Vditor 的 lastElementChild 仍是 content
    expect(handle.nextSibling).toBe(contentEl)
    expect(outlineEl.lastElementChild).toBe(contentEl)
    expect(outlineEl.style.width).toBe('300px')
  })

  it('destroy 应移除手柄和增强样式', async () => {
    await manager.setup()
    manager.destroy()
    expect(outlineEl.classList.contains('outline-sidebar-enhanced')).toBe(false)
    expect(outlineEl.querySelector('.outline-sidebar-resize-handle')).toBeNull()
  })
})
