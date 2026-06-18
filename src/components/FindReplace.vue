<template>
  <div class="find-replace-container" v-if="visible">
    <div class="find-replace-panel">
      <div class="find-row">
        <button
          class="collapse-btn"
          @click="toggleReplace"
          :title="showReplace ? t.hideReplace : t.showReplace"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline :points="showReplace ? '6 9 12 15 18 9' : '9 6 15 12 9 18'"></polyline>
          </svg>
        </button>
        <div class="input-wrapper">
          <input
            ref="findInput"
            v-model="searchText"
            :placeholder="t.findPlaceholder"
            @keydown.enter="findNext"
            @keydown.shift.enter="findPrevious"
            @keydown.escape="close"
            @input="onSearchTextChange"
          />
          <span class="match-count" v-if="searchText && totalMatches > 0">
            {{ t.matchCount.replace('{current}', currentMatchIndex + 1).replace('{total}', totalMatches) }}
          </span>
          <span class="match-count no-results" v-else-if="searchText && totalMatches === 0">
            {{ t.noResults }}
          </span>
        </div>
        <button class="action-btn" @click="findPrevious" :title="t.previous">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button class="action-btn" @click="findNext" :title="t.next">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="action-btn close-btn" @click="close" title="Escape">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="replace-row" v-if="showReplace">
        <div class="input-wrapper">
          <input
            ref="replaceInput"
            v-model="replaceText"
            :placeholder="t.replacePlaceholder"
            @keydown.enter="replaceCurrent"
            @keydown.escape="close"
          />
        </div>
        <button class="action-btn replace-btn" @click="replaceCurrent" :title="t.replaceCurrent">
          {{ t.replaceCurrent }}
        </button>
        <button class="action-btn replace-all-btn" @click="replaceAll" :title="t.replaceAll">
          {{ t.replaceAll }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { getI18nConfig } from '../utils/i18n-helper.js'

export default {
  name: 'FindReplace',
  props: {
    lang: {
      type: String,
      default: 'zh_CN'
    }
  },
  data() {
    return {
      visible: false,
      showReplace: false,
      searchText: '',
      replaceText: '',
      currentMatchIndex: -1,
      totalMatches: 0,
      matchPositions: [],
      highlightElements: [],
      vditorRef: null
    }
  },
  computed: {
    t() {
      return getI18nConfig(this.lang).findReplace
    },
    vditorInstance() {
      // 获取 vditor 实例
      if (!this.vditorRef) return null
      return this.vditorRef.vditor || null
    }
  },
  methods: {
    // 显示查找/替换面板
    show() {
      this.visible = true
      this.$nextTick(() => {
        if (this.$refs.findInput) {
          this.$refs.findInput.focus()
          // 如果有选中的文本，使用它作为搜索词
          const selectedText = this.getSelectedText()
          if (selectedText) {
            this.searchText = selectedText
            this.performSearch()
          }
        }
      })
    },

    // 关闭面板
    close() {
      this.visible = false
      this.clearHighlights()
      this.searchText = ''
      this.replaceText = ''
      this.matchPositions = []
      this.totalMatches = 0
      this.currentMatchIndex = -1
    },

    // 切换替换区域显示
    toggleReplace() {
      this.showReplace = !this.showReplace
      if (this.showReplace) {
        this.$nextTick(() => {
          if (this.$refs.replaceInput) {
            this.$refs.replaceInput.focus()
          }
        })
      }
    },

    // 获取编辑器中选中的文本
    getSelectedText() {
      try {
        // 使用 window.getSelection 获取选中文本
        const selection = window.getSelection()
        if (selection && selection.toString()) {
          return selection.toString()
        }
        return ''
      } catch (e) {
        console.error('获取选中文本失败:', e)
        return ''
      }
    },

    // 获取编辑器完整文本
    getEditorText() {
      if (!this.vditorInstance) return ''
      try {
        return this.vditorInstance.getValue() || ''
      } catch (e) {
        console.error('[FindReplace] 获取编辑器文本失败:', e)
        return ''
      }
    },

    // 获取编辑器元素
    getEditorElement() {
      try {
        // 通过 MyVditor 实例获取编辑区域元素（兼容多标签模式的动态 DOM ID）
        if (this.vditorRef?.getEditorElement) {
          return this.vditorRef.getEditorElement()
        }
        return null
      } catch (e) {
        console.error('获取编辑器元素失败:', e)
        return null
      }
    },

    // 搜索文本变化时重新搜索
    onSearchTextChange() {
      this.currentMatchIndex = -1
      this.performSearch()
    },

    // 执行搜索
    performSearch() {
      this.clearHighlights()

      if (!this.searchText) {
        this.matchPositions = []
        this.totalMatches = 0
        this.currentMatchIndex = -1
        return
      }

      const text = this.getEditorText()
      const searchLower = this.searchText.toLowerCase()
      const textLower = text.toLowerCase()

      this.matchPositions = []
      let index = 0
      while (index < textLower.length) {
        const foundIndex = textLower.indexOf(searchLower, index)
        if (foundIndex === -1) break
        this.matchPositions.push({
          start: foundIndex,
          end: foundIndex + this.searchText.length
        })
        index = foundIndex + 1
      }

      this.totalMatches = this.matchPositions.length

      if (this.totalMatches > 0) {
        this.currentMatchIndex = 0
        this.highlightAllMatches()
        this.scrollToCurrentMatch()
      } else {
        this.currentMatchIndex = -1
      }
    },

    // 高亮所有匹配项
    highlightAllMatches() {
      const editorEl = this.getEditorElement()
      if (!editorEl || this.matchPositions.length === 0) return

      // 使用 CSS 高亮而不是修改 DOM
      // 创建高亮样式
      const style = document.createElement('style')
      style.id = 'find-replace-highlight-style'
      style.textContent = `
        .find-highlight {
          background-color: #fff3cd;
          border-radius: 2px;
          padding: 1px 0;
        }
        .find-highlight-current {
          background-color: #ffc107;
          border-radius: 2px;
          padding: 1px 0;
        }
        html.dark .find-highlight,
        .dark .find-highlight {
          background-color: #665c00;
        }
        html.dark .find-highlight-current,
        .dark .find-highlight-current {
          background-color: #d4a017;
        }
      `
      document.head.appendChild(style)

      // 使用文本节点遍历高亮
      this.highlightTextNodes(editorEl)
    },

    // 遍历文本节点并高亮
    highlightTextNodes(element) {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
      )

      const textNodes = []
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode)
      }

      let matchIndex = 0
      const searchLower = this.searchText.toLowerCase()

      textNodes.forEach(textNode => {
        const text = textNode.textContent
        const textLower = text.toLowerCase()
        let lastIndex = 0
        let matchFound = false

        while (lastIndex < textLower.length) {
          const foundIndex = textLower.indexOf(searchLower, lastIndex)
          if (foundIndex === -1) break

          matchFound = true

          // 创建高亮 span
          const span = document.createElement('span')
          span.className = matchIndex === this.currentMatchIndex ? 'find-highlight-current' : 'find-highlight'
          span.textContent = text.substring(foundIndex, foundIndex + this.searchText.length)
          span.dataset.matchIndex = matchIndex

          // 分割文本节点
          const before = text.substring(lastIndex, foundIndex)
          const after = text.substring(foundIndex + this.searchText.length)

          const parent = textNode.parentNode
          if (before) {
            parent.insertBefore(document.createTextNode(before), textNode)
          }
          parent.insertBefore(span, textNode)
          if (after) {
            const afterNode = document.createTextNode(after)
            parent.insertBefore(afterNode, textNode)
            // 继续处理剩余文本
            textNode.textContent = ''
            textNode = afterNode
          } else {
            textNode.textContent = ''
          }

          this.highlightElements.push(span)
          matchIndex++
          lastIndex = foundIndex + this.searchText.length
        }
      })
    },

    // 清除高亮
    clearHighlights() {
      // 移除高亮样式
      const style = document.getElementById('find-replace-highlight-style')
      if (style) {
        style.remove()
      }

      // 移除高亮元素，恢复原始文本
      this.highlightElements.forEach(el => {
        if (el.parentNode) {
          const text = document.createTextNode(el.textContent)
          el.parentNode.replaceChild(text, el)
        }
      })
      this.highlightElements = []

      // 合并相邻的文本节点
      const editorEl = this.getEditorElement()
      if (editorEl) {
        editorEl.normalize()
      }
    },

    // 查找下一个
    findNext() {
      if (this.totalMatches === 0) return

      this.currentMatchIndex = (this.currentMatchIndex + 1) % this.totalMatches
      this.updateCurrentHighlight()
      this.scrollToCurrentMatch()
    },

    // 查找上一个
    findPrevious() {
      if (this.totalMatches === 0) return

      this.currentMatchIndex = (this.currentMatchIndex - 1 + this.totalMatches) % this.totalMatches
      this.updateCurrentHighlight()
      this.scrollToCurrentMatch()
    },

    // 更新当前高亮项
    updateCurrentHighlight() {
      // 移除所有当前高亮
      document.querySelectorAll('.find-highlight-current').forEach(el => {
        el.className = 'find-highlight'
      })

      // 设置新的当前高亮
      const currentEl = document.querySelector(`.find-highlight[data-match-index="${this.currentMatchIndex}"]`)
      if (currentEl) {
        currentEl.className = 'find-highlight-current'
      }
    },

    // 滚动到当前匹配项
    scrollToCurrentMatch() {
      const currentEl = document.querySelector('.find-highlight-current')
      if (currentEl) {
        currentEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    },

    // 替换当前匹配项
    replaceCurrent() {
      if (this.totalMatches === 0 || this.currentMatchIndex < 0) return

      try {
        // 清除高亮（避免 DOM 修改影响替换）
        this.clearHighlights()

        const text = this.getEditorText()
        const position = this.matchPositions[this.currentMatchIndex]

        // 构建新文本
        const newText = text.substring(0, position.start) +
          this.replaceText +
          text.substring(position.end)

        // 设置新内容
        this.vditorInstance.setValue(newText)

        // 通知父组件内容已修改
        this.$emit('content-changed')

        // 重新搜索
        this.$nextTick(() => {
          this.performSearch()
        })
      } catch (e) {
        console.error('替换失败:', e)
      }
    },

    // 替换所有匹配项
    replaceAll() {
      if (this.totalMatches === 0) return

      try {
        // 清除高亮（避免 DOM 修改影响替换）
        this.clearHighlights()

        const text = this.getEditorText()
        const searchRegex = new RegExp(this.escapeRegExp(this.searchText), 'gi')
        const newText = text.replace(searchRegex, this.replaceText)

        this.vditorInstance.setValue(newText)

        // 通知父组件内容已修改
        this.$emit('content-changed')

        // 重新搜索
        this.$nextTick(() => {
          this.performSearch()
        })
      } catch (e) {
        console.error('全部替换失败:', e)
      }
    },

    // 转义正则表达式特殊字符
    escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    },

    // 处理键盘快捷键
    handleKeydown(event) {
      // Ctrl+F 或 Cmd+F 打开查找
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault()
        this.show()
        return
      }

      // Escape 关闭
      if (event.key === 'Escape' && this.visible) {
        event.preventDefault()
        this.close()
        return
      }
    }
  },

  mounted() {
    // 添加全局键盘快捷键监听
    window.addEventListener('keydown', this.handleKeydown)
  },

  beforeUnmount() {
    // 移除键盘快捷键监听
    window.removeEventListener('keydown', this.handleKeydown)
    // 清除高亮
    this.clearHighlights()
  }
}
</script>

<style scoped>
.find-replace-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1000;
}

.find-replace-panel {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 8px;
  min-width: 360px;
}

.find-row,
.replace-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.replace-row {
  margin-top: 8px;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  border-radius: 3px;
  flex-shrink: 0;
}

.collapse-btn:hover {
  background: #f0f0f0;
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 14px;
  outline: none;
  background: #fff;
  color: #333;
}

.input-wrapper input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.match-count {
  position: absolute;
  right: 8px;
  font-size: 12px;
  color: #999;
  pointer-events: none;
  white-space: nowrap;
}

.match-count.no-results {
  color: #f56c6c;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.action-btn:hover {
  background: #f0f0f0;
}

.close-btn {
  margin-left: 4px;
}

.replace-btn {
  padding: 6px 12px;
  background: #409eff;
  color: #fff;
  border-radius: 3px;
}

.replace-btn:hover {
  background: #66b1ff;
}

.replace-all-btn {
  padding: 6px 12px;
  background: #67c23a;
  color: #fff;
  border-radius: 3px;
}

.replace-all-btn:hover {
  background: #85ce61;
}

/* 暗色主题适配 */
html.dark .find-replace-panel,
.dark .find-replace-panel {
  background: #2d2d2d;
  border-color: #444;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

html.dark .collapse-btn,
.dark .collapse-btn,
html.dark .action-btn,
.dark .action-btn {
  color: #ccc;
}

html.dark .collapse-btn:hover,
.dark .collapse-btn:hover,
html.dark .action-btn:hover,
.dark .action-btn:hover {
  background: #444;
}

html.dark .input-wrapper input,
.dark .input-wrapper input {
  background: #3d3d3d;
  border-color: #555;
  color: #fff;
}

html.dark .input-wrapper input:focus,
.dark .input-wrapper input:focus {
  border-color: #409eff;
}

html.dark .match-count,
.dark .match-count {
  color: #888;
}

html.dark .match-count.no-results,
.dark .match-count.no-results {
  color: #f56c6c;
}

html.dark .replace-btn,
.dark .replace-btn {
  background: #409eff;
}

html.dark .replace-btn:hover,
.dark .replace-btn:hover {
  background: #66b1ff;
}

html.dark .replace-all-btn,
.dark .replace-all-btn {
  background: #67c23a;
}

html.dark .replace-all-btn:hover,
.dark .replace-all-btn:hover {
  background: #85ce61;
}
</style>
