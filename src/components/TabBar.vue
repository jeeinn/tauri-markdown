<template>
  <div
    class="tab-bar"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
    @dragleave="handleDragLeave"
    @mousemove="handleTabMouseMove"
    @mouseup="handleTabMouseUp"
    :class="{ 'drag-over': isDragOver, 'tab-dragging': isDragging }"
  >
    <!-- 标签列表 -->
    <div class="tab-list" ref="tabListRef">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :data-tab-id="tab.id"
        :class="{
          'tab-active': tab.id === activeTabId,
          'tab-drag-over': dragOverTabId === tab.id && dragOverTabId !== draggingTabId
        }"
        :title="tab.filePath || getTabTitle(tab, lang)"
        :aria-label="getTabTitle(tab, lang)"
        :aria-selected="tab.id === activeTabId"
        role="tab"
        @click="handleTabClick($event, tab.id)"
        @mousedown="handleTabMouseDown($event, tab.id)"
      >
        <!-- 标签标题 -->
        <span class="tab-title">{{ getTabTitle(tab, lang) }}</span>

        <!-- 关闭按钮 -->
        <button
          class="tab-close"
          :aria-label="closeLabel"
          @click.stop="$emit('close-tab', tab.id)"
        >×</button>
      </div>

      <!-- 新建标签按钮（sticky：无滚动时紧跟最后一个标签，滚动时固定右侧） -->
      <button
        class="tab-new"
        :aria-label="newTabLabel"
        :title="newTabLabel"
        @click="$emit('new-tab')"
      >+</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getTabTitle } from '../utils/tab-utils.js'

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
    default: () => []
  },
  activeTabId: {
    type: String,
    default: null
  },
  lang: {
    type: String,
    default: 'zh_CN'
  }
})

const emit = defineEmits(['switch-tab', 'close-tab', 'new-tab', 'open-file', 'reorder-tab', 'tab-drag-start', 'tab-drag-end'])

// 文件拖拽状态
const isDragOver = ref(false)
const tabListRef = ref(null)

// 标签拖拽排序状态（基于鼠标事件）
const draggingTabId = ref(null)
const dragOverTabId = ref(null)
let dragStartX = 0
let dragStartY = 0
const DRAG_THRESHOLD = 5 // 拖拽启动阈值（像素）
let isDragging = false

// 国际化标签
const closeLabel = computed(() => {
  const labels = {
    zh_CN: '关闭标签页',
    en_US: 'Close tab',
    ja_JP: 'タブを閉じる',
    ko_KR: '탭 닫기'
  }
  return labels[props.lang] || labels.zh_CN
})

const newTabLabel = computed(() => {
  const labels = {
    zh_CN: '新建标签页',
    en_US: 'New tab',
    ja_JP: '新しいタブ',
    ko_KR: '새 탭'
  }
  return labels[props.lang] || labels.zh_CN
})

/**
 * 处理拖拽悬停事件
 */
function handleDragOver(event) {
  if (draggingTabId.value) {
    // 标签拖动排序：允许放置 + 设置 dropEffect（防止禁止图标）
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    return
  }
  isDragOver.value = true
  event.dataTransfer.dropEffect = 'copy'
}

/**
 * 处理拖拽离开事件
 */
function handleDragLeave(event) {
  // 确保鼠标真正离开了 tab-bar 区域（而非进入子元素）
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false
  }
}

/**
 * 处理文件拖放事件
 * 支持 HTML5 DataTransfer（浏览器拖放）和 Tauri 文件路径拖放
 */
function handleDrop(event) {
  isDragOver.value = false
  // 标签拖动排序时不处理文件拖放
  if (draggingTabId.value) return
  // 阻止事件冒泡到全局 useDragDrop 处理器，避免 handleOpenFile 被调用两次
  event.stopPropagation()

  let filePath = null

  // 尝试从 DataTransfer 中提取文件路径
  if (event.dataTransfer) {
    // 方式 1：标准 HTML5 files API
    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      const file = Array.from(files).find(f =>
        f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.name.endsWith('.txt')
      )
      if (file) {
        // Tauri 环境中，File 对象的 path 属性包含完整路径
        filePath = file.path || null
      }
    }

    // 方式 2：text/plain 类型（某些拖放场景会携带路径字符串）
    if (!filePath) {
      const text = event.dataTransfer.getData('text/plain')
      if (text && (text.endsWith('.md') || text.endsWith('.markdown') || text.endsWith('.txt'))) {
        filePath = text.trim()
      }
    }

    // 方式 3：text/uri-list（拖放 URI 列表）
    if (!filePath) {
      const uriList = event.dataTransfer.getData('text/uri-list')
      if (uriList) {
        const uris = uriList.split('\n').map(u => u.trim()).filter(u => u && !u.startsWith('#'))
        const mdUri = uris.find(u =>
          u.endsWith('.md') || u.endsWith('.markdown') || u.endsWith('.txt')
        )
        if (mdUri) {
          // 将 file:// URI 转换为本地路径
          if (mdUri.startsWith('file://')) {
            try {
              // 使用 URL 构造函数正确处理 Windows 路径（file:///C:/...）
              filePath = decodeURIComponent(new URL(mdUri).pathname)
              // Windows: 去除开头的 /（/C:/... → C:/...）
              if (/^\/[a-zA-Z]:/.test(filePath)) {
                filePath = filePath.slice(1)
              }
            } catch {
              // 回退：简单去除 file:// 前缀
              filePath = decodeURIComponent(mdUri.replace('file://', ''))
            }
          } else {
            filePath = mdUri
          }
        }
      }
    }
  }

  // 仅在找到有效文件路径时才发出 open-file 事件
  if (filePath) {
    emit('open-file', filePath)
  }
}

// ─── 标签拖拽排序（基于鼠标事件，兼容 Tauri WebView）───────────────────────

/**
 * 鼠标按下：记录起始位置和待拖动的标签 ID
 */
function handleTabMouseDown(event, tabId) {
  // 只响应左键
  if (event.button !== 0) return
  dragStartX = event.clientX
  dragStartY = event.clientY
  draggingTabId.value = tabId
  isDragging = false
  console.log('[TabDrag] mousedown:', tabId)
}

/**
 * 鼠标移动：超过阈值后开始拖拽，实时计算目标标签
 */
function handleTabMouseMove(event) {
  if (!draggingTabId.value) return

  const dx = event.clientX - dragStartX
  const dy = event.clientY - dragStartY

  // 未超过阈值，不算拖拽
  if (!isDragging) {
    if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
    isDragging = true
    console.log('[TabDrag] drag started')
    emit('tab-drag-start')
  }

  // 通过鼠标位置找到目标标签元素
  const tabList = tabListRef.value
  if (!tabList) return

  // 临时隐藏被拖动的元素，用 elementFromPoint 找到下面的真实目标
  const draggedEl = tabList.querySelector(`[data-tab-id="${draggingTabId.value}"]`)
  if (draggedEl) draggedEl.style.pointerEvents = 'none'
  const targetEl = document.elementFromPoint(event.clientX, event.clientY)
  if (draggedEl) draggedEl.style.pointerEvents = ''

  const tabEl = targetEl?.closest('.tab-item')
  const targetId = tabEl?.dataset?.tabId || null
  if (targetId && dragOverTabId.value !== targetId) {
    console.log('[TabDrag] over:', targetId)
  }
  dragOverTabId.value = targetId
}

/**
 * 鼠标抬起：完成拖拽，发出 reorder 事件
 */
function handleTabMouseUp(event) {
  if (!draggingTabId.value) return

  if (isDragging && dragOverTabId.value && dragOverTabId.value !== draggingTabId.value) {
    console.log('[TabDrag] reorder:', draggingTabId.value, '->', dragOverTabId.value)
    emit('reorder-tab', draggingTabId.value, dragOverTabId.value)
  }

  // 清理状态
  const wasDragging = isDragging
  draggingTabId.value = null
  dragOverTabId.value = null
  isDragging = false
  if (wasDragging) {
    emit('tab-drag-end')
  }
}

/**
 * 标签点击：仅在非拖拽状态下触发切换
 */
function handleTabClick(event, tabId) {
  if (isDragging) {
    event.preventDefault()
    return
  }
  emit('switch-tab', tabId)
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  height: 40px;
  background: #f0f2f5;
  border-bottom: 1px solid #e4e7ed;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
  transition: background 0.2s;
}

/* 文件拖拽悬停高亮 */
.tab-bar.drag-over {
  background: #e8f4fd;
  border-bottom-color: #409eff;
}

.tab-bar.drag-over .tab-new {
  background: #e8f4fd;
}

/* 标签拖拽排序：目标标签左侧显示蓝色插入线 */
.tab-item.tab-drag-over {
  box-shadow: inset 3px 0 0 #409eff;
}

/* 拖拽中：防止文字选中 */
.tab-bar.tab-dragging {
  cursor: grabbing;
  user-select: none;
}

.tab-bar.tab-dragging .tab-item {
  cursor: grabbing;
}

/* 标签列表区域（可水平滚动） */
.tab-list {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  min-width: 0;
}

/* 隐藏滚动条但保留滚动功能 */
.tab-list::-webkit-scrollbar {
  height: 3px;
}

.tab-list::-webkit-scrollbar-track {
  background: transparent;
}

.tab-list::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 2px;
}

/* 单个标签项 */
.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  min-width: 80px;
  max-width: 200px;
  height: 100%;
  cursor: pointer;
  border-right: 1px solid #e4e7ed;
  color: #606266;
  font-size: 13px;
  transition: background 0.2s, color 0.2s;
  position: relative;
  white-space: nowrap;
  flex-shrink: 0;
}

.tab-item:hover {
  background: #e4e7ed;
  color: #303133;
}

/* 激活标签样式 */
.tab-item.tab-active {
  background: #fff;
  color: #303133;
  font-weight: 500;
  border-bottom: 2px solid #409eff;
}

/* 标签标题（超长截断） */
.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* 关闭按钮 */
.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: none;
  cursor: pointer;
  color: #909399;
  font-size: 14px;
  line-height: 1;
  border-radius: 3px;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.tab-close:hover {
  background: #fde2e2;
  color: #f56c6c;
}

/* 新建标签按钮（sticky：无滚动时紧跟标签，滚动时固定右侧） */
.tab-new {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  border: none;
  background: #f0f2f5;
  cursor: pointer;
  color: #909399;
  font-size: 20px;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
  position: sticky;
  right: 0;
  z-index: 1;
  transition: background 0.2s, color 0.2s;
}

.tab-new:hover {
  background: #e4e7ed;
  color: #409eff;
}

/* ===== 暗色主题 ===== */
html.dark .tab-bar {
  background: #1a1b1c;
  border-bottom-color: #363637;
}

html.dark .tab-bar.drag-over {
  background: #1a2a3a;
  border-bottom-color: #409eff;
}

html.dark .tab-list::-webkit-scrollbar-thumb {
  background: #4a4a4a;
}

html.dark .tab-item {
  color: #a0a3a8;
  border-right-color: #363637;
}

html.dark .tab-item:hover {
  background: #2c2d2e;
  color: #cfd3dc;
}

html.dark .tab-item.tab-active {
  background: #141414;
  color: #e5eaf3;
  border-bottom-color: #409eff;
}

html.dark .tab-close {
  color: #606266;
}

html.dark .tab-close:hover {
  background: #5a2020;
  color: #f89898;
}

html.dark .tab-new {
  color: #606266;
  background: #1a1b1c;
}

html.dark .tab-new:hover {
  background: #2c2d2e;
  color: #409eff;
}
</style>
