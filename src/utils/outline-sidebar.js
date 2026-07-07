/**
 * 大纲侧栏增强：拖拽调宽、长标题横向滚动、悬停显示完整标题。
 * 通过 DOM + CSS 与 Vditor 协作，不修改 Vditor 源码。
 */

import {
  DEFAULT_OUTLINE_WIDTH,
  getOutlineWidth,
  saveOutlineWidth,
  clampOutlineWidth,
} from './store.js'

const ENHANCED_CLASS = 'outline-sidebar-enhanced'
const HANDLE_CLASS = 'outline-sidebar-resize-handle'
const DRAGGING_CLASS = 'outline-sidebar-dragging'

/** 根据拖拽位移计算新宽度 */
export function calcResizedWidth(startWidth, deltaX, position = 'left') {
  const signedDelta = position === 'right' ? -deltaX : deltaX
  return clampOutlineWidth(startWidth + signedDelta)
}

/** 将宽度应用到侧栏元素 */
export function applyOutlineWidth(outlineEl, width) {
  if (!outlineEl) return
  outlineEl.style.width = `${clampOutlineWidth(width)}px`
}

/**
 * 同步工具栏左侧留白，避免大纲变宽后工具栏与内容错位。
 * 逻辑与 Vditor 内部 setPadding 中 toolbar 部分保持一致。
 */
export function syncToolbarPadding(vditorInstance) {
  const inner = vditorInstance?.vditor
  const outlineEl = inner?.outline?.element
  const toolbarEl = inner?.toolbar?.element
  if (!inner || !outlineEl || !toolbarEl) return

  const isVisible = outlineEl.style.display !== 'none' && outlineEl.offsetWidth > 0
  const isLeft = inner.options?.outline?.position === 'left'
  const outlineWidth = isVisible && isLeft ? outlineEl.offsetWidth : 0

  if (inner.preview?.element?.style?.display === 'block') {
    toolbarEl.style.paddingLeft = `${5 + outlineWidth}px`
    return
  }

  const modeEl = inner[inner.currentMode]?.element
  const contentPadding = parseInt(modeEl?.style?.paddingLeft || '0', 10)
  toolbarEl.style.paddingLeft = `${Math.max(5, contentPadding + outlineWidth)}px`
}

/** 为标题节点补充 title，悬停可查看被截断的完整文本 */
export function enrichOutlineTitles(outlineEl) {
  if (!outlineEl) return
  outlineEl.querySelectorAll('li > span > span').forEach((span) => {
    const text = span.textContent?.trim()
    if (text) {
      span.title = text
    }
  })
}

function getOutlinePosition(vditorInstance) {
  return vditorInstance?.vditor?.options?.outline?.position || 'left'
}

function isOutlineVisible(outlineEl) {
  return outlineEl && outlineEl.style.display !== 'none'
}

/**
 * @param {object} options
 * @param {() => import('vditor').default | null | undefined} options.getVditor
 * @returns {{ setup: () => Promise<void>, destroy: () => void }}
 */
export function createOutlineSidebarManager({ getVditor }) {
  let resizeHandle = null
  let titleObserver = null
  let isDragging = false
  let dragStartX = 0
  let dragStartWidth = 0
  let currentWidth = DEFAULT_OUTLINE_WIDTH
  let boundOutlineEl = null

  const onMouseMove = (event) => {
    if (!isDragging || !boundOutlineEl) return
    const position = getOutlinePosition(getVditor())
    const nextWidth = calcResizedWidth(
      dragStartWidth,
      event.clientX - dragStartX,
      position
    )
    applyOutlineWidth(boundOutlineEl, nextWidth)
    syncToolbarPadding(getVditor())
  }

  const stopDragging = () => {
    if (!isDragging) return
    isDragging = false
    document.documentElement.classList.remove(DRAGGING_CLASS)
    resizeHandle?.classList.remove('is-dragging')
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopDragging)

    if (boundOutlineEl) {
      currentWidth = boundOutlineEl.offsetWidth
      saveOutlineWidth(currentWidth)
    }
  }

  const onMouseDown = (event) => {
    if (!boundOutlineEl || event.button !== 0) return
    event.preventDefault()
    isDragging = true
    dragStartX = event.clientX
    dragStartWidth = boundOutlineEl.offsetWidth
    document.documentElement.classList.add(DRAGGING_CLASS)
    resizeHandle?.classList.add('is-dragging')
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stopDragging)
  }

  const ensureResizeHandle = (outlineEl, position) => {
    const contentEl = outlineEl.querySelector('.vditor-outline__content')
    if (!contentEl) return

    if (!resizeHandle) {
      resizeHandle = document.createElement('div')
      resizeHandle.setAttribute('role', 'separator')
      resizeHandle.setAttribute('aria-orientation', 'vertical')
      resizeHandle.setAttribute('aria-label', 'Resize outline sidebar')
      resizeHandle.addEventListener('mousedown', onMouseDown)
    }

    resizeHandle.className = `${HANDLE_CLASS} ${position === 'right' ? `${HANDLE_CLASS}--left` : `${HANDLE_CLASS}--right`}`

    // Vditor 将大纲 HTML 写入 lastElementChild（即 .vditor-outline__content），
    // 手柄必须插在该节点之前，不能 append 到容器末尾。
    if (resizeHandle.parentElement !== outlineEl || resizeHandle.nextSibling !== contentEl) {
      resizeHandle.remove()
      outlineEl.insertBefore(resizeHandle, contentEl)
    }
  }

  const observeTitleUpdates = (outlineEl) => {
    titleObserver?.disconnect()
    const contentEl = outlineEl.querySelector('.vditor-outline__content') || outlineEl
    enrichOutlineTitles(outlineEl)

    titleObserver = new MutationObserver(() => {
      enrichOutlineTitles(outlineEl)
    })
    titleObserver.observe(contentEl, { childList: true, subtree: true, characterData: true })
  }

  const bindOutline = (outlineEl, width) => {
    boundOutlineEl = outlineEl
    outlineEl.classList.add(ENHANCED_CLASS)
    applyOutlineWidth(outlineEl, width)
    ensureResizeHandle(outlineEl, getOutlinePosition(getVditor()))
    observeTitleUpdates(outlineEl)
    syncToolbarPadding(getVditor())
  }

  const setup = async () => {
    const vditorInstance = getVditor()
    const outlineEl = vditorInstance?.vditor?.outline?.element
    if (!outlineEl) return

    currentWidth = await getOutlineWidth()
    bindOutline(outlineEl, currentWidth)

    // 若大纲已显示，重新渲染以恢复内容（避免手柄曾占位导致空白）
    const inner = vditorInstance.vditor
    if (inner?.outline && isOutlineVisible(outlineEl)) {
      inner.outline.render(inner)
      enrichOutlineTitles(outlineEl)
    }
  }

  const destroy = () => {
    stopDragging()
    titleObserver?.disconnect()
    titleObserver = null

    if (resizeHandle) {
      resizeHandle.removeEventListener('mousedown', onMouseDown)
      resizeHandle.remove()
      resizeHandle = null
    }

    boundOutlineEl?.classList.remove(ENHANCED_CLASS)
    boundOutlineEl = null
  }

  return { setup, destroy }
}
