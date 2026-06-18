# 多标签页编辑器 - 技术设计文档

## 1. 系统架构

### 1.1 整体架构
```
┌─────────────────────────────────────────────────────────┐
│                     App.vue (根组件)                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │      TabBar.vue (标签栏 UI)                         │  │
│  │  [Tab1] [Tab2] [Tab3] [+]                         │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │      KeepAlive (缓存非活跃 Tab)                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  <TabContent :tab="activeTab" />           │  │  │
│  │  │    └── MyVditor.vue (动态 id: vditor-{id})  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │      Pinia Store (tabState)                         │  │
│  │  - tabs: Tab[]                                     │  │
│  │  - activeTabId: string                             │  │
│  │  - saveTabs() / loadTabs()                         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 数据流
```
用户操作 (菜单/快捷键/拖拽)
    ↓
App.vue (事件处理)
    ↓
tabStore.updateTabState()
    ↓
TabBar.vue (UI 更新)
    ↓
KeepAlive + TabContent (组件实例管理)
    ↓
MyVditor.vue (动态 id 渲染)
```

---

## 2. 组件设计

### 2.1 TabBar.vue (新建)

#### 2.1.1 Props
```typescript
interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  lang: Ref<string>
}
```

#### 2.1.2 Emits
```typescript
const emit = defineEmits<{
  (e: 'switch-tab', tabId: string): void
  (e: 'close-tab', tabId: string): void
  (e: 'new-tab'): void
  (e: 'open-file', filePath?: string): void
}>()
```

#### 2.1.3 方法
| 方法 | 说明 |
|------|------|
| `handleTabClick(tab)` | 切换标签页 |
| `handleCloseTab(tab, event)` | 关闭标签页（带事件阻止） |
| `handleNewTab()` | 新建标签页 |
| `handleDragOver(event)` | 拖拽进入标签栏 |
| `handleDrop(event)` | 文件拖放到标签栏 |
| `getTabTitle(tab)` | 获取标签标题（带未保存标记） |

#### 2.1.4 样式要点
- 标签栏固定高度 40px
- 激活标签高亮显示
- "×" 按钮 hover 红色
- 支持右键菜单

---

### 2.2 TabContent.vue (新建)

#### 2.2.1 Props
```typescript
interface TabContentProps {
  tab: Tab
  isActive: boolean
}
```

#### 2.2.2 实现
```vue
<template>
  <div v-show="isActive" class="tab-content">
    <MyVditor 
      :key="tab.id"
      :tab-id="tab.id"
      :initial-file="tab.filePath"
    />
  </div>
</template>

<script setup>
import MyVditor from '../components/MyVditor.vue'

const props = defineProps({
  tab: { type: Object, required: true },
  isActive: { type: Boolean, default: false }
})
</script>
```

---

### 2.3 MyVditor.vue (修改)

#### 2.3.1 新增 Props
```typescript
defineProps({
  tabId: { type: String, required: true },  // 新增：Tab 唯一标识
  initialFile: { type: String, default: null }  // 新增：初始文件路径
})
```

#### 2.3.2 修改 DOM ID
```vue
<!-- 修改前 -->
<div id="vditorEle" class="vditor"></div>

<!-- 修改后 -->
<div :id="`vditor-${tabId}`" class="vditor"></div>
```

#### 2.3.3 初始化逻辑
```javascript
mounted() {
  // 1. 检查 initialFile，如果有则加载
  // 2. 否则新建空白文档
  if (this.initialFile) {
    this.loadFileByPath(this.initialFile)
  } else {
    this.newFile()
  }
}
```

---

## 3. Pinia Store 设计 (tabStore.js)

### 3.1 状态
```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTabStore = defineStore('tab', () => {
  // 核心状态
  const tabs = ref<Tab[]>([])
  const activeTabId = ref<string | null>(null)
  
  // 派生状态
  const activeTab = computed(() => 
    tabs.value.find(t => t.id === activeTabId.value) || null
  )
  
  const hasUnsavedChanges = computed(() => 
    tabs.value.some(t => t.contentModified)
  )
  
  return {
    tabs,
    activeTabId,
    activeTab,
    hasUnsavedChanges,
    
    // Action
    addTab,
    switchTab,
    closeTab,
    updateTab,
    saveTabs,
    loadTabs
  }
})
```

### 3.2 Actions

#### 3.2.1 `addTab(filePath?: string)`
```javascript
function addTab(filePath = null) {
  const newTab = {
    id: uuidv4(),
    title: filePath ? getFileName(filePath) : '未命名',
    filePath,
    contentModified: false,
    active: true,
    scrollPosition: 0,
    editMode: 'ir'
  }
  tabs.value.push(newTab)
  activeTabId.value = newTab.id
}
```

#### 3.2.2 `switchTab(tabId)`
```javascript
function switchTab(tabId) {
  // 保存当前活跃标签的滚动位置
  if (activeTabId.value) {
    const currentTab = tabs.value.find(t => t.id === activeTabId.value)
    if (currentTab && currentTab.vditorRef?.vditor) {
      const vditor = currentTab.vditorRef.vditor
      const el = getScrollElement(vditor)
      if (el) {
        const pct = el.scrollTop / (el.scrollHeight - el.clientHeight)
        currentTab.scrollPosition = pct
      }
    }
  }
  
  // 切换到新标签
  activeTabId.value = tabId
  tabs.value.forEach(t => t.active = (t.id === tabId))
}
```

#### 3.2.3 `closeTab(tabId)`
```javascript
async function closeTab(tabId) {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return false
  
  // 检查未保存修改
  if (tab.contentModified) {
    const result = await checkUnsavedChanges(
      tab.contentModified,
      getI18nConfig(lang.value).notifications.closeTab.unsavedChanges
    )
    if (result === 'cancel') return false
    if (result === 'save' && tab.filePath) {
      await saveTabFile(tab)
    }
  }
  
  // 移除标签
  const index = tabs.value.findIndex(t => t.id === tabId)
  tabs.value.splice(index, 1)
  
  // 如果关闭的是活跃标签，切换到下一个
  if (activeTabId.value === tabId) {
    activeTabId.value = tabs.value[index] ? tabs.value[index].id : 
                        tabs.value[index - 1] ? tabs.value[index - 1].id : null
  }
  
  return true
}
```

#### 3.2.4 `saveTabs()` / `loadTabs()`
```javascript
async function saveTabs() {
  const store = await getStore()
  await store.set('tabs', tabs.value)
  await store.set('activeTabId', activeTabId.value)
  await store.save()
}

async function loadTabs() {
  const store = await getStore()
  const savedTabs = await store.get('tabs') || []
  const savedActiveId = await store.get('activeTabId')
  
  // 过滤不存在的文件
  tabs.value = savedTabs.filter(async tab => {
    if (!tab.filePath) return true  // 未保存文档保留
    const exists = await exists(tab.filePath)
    return exists
  })
  
  activeTabId.value = savedActiveId
}
```

---

## 4. 状态管理流程图

```
┌─────────────────────────────────────────────────────────────┐
│  App.vue mounted()                                          │
│  ├─ loadTabs() → 从 Store 恢复标签                         │
│  └─ setupWindowCloseHandler() → 保存所有标签               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  用户操作 (菜单/快捷键/拖拽)                                 │
│  ├─ 新建标签                                                 │
│  │   └─ addTab() → 创建新 Tab → 更新 Store                 │
│  ├─ 打开文件                                                 │
│  │   └─ addTab(filePath) → 创建新 Tab 并加载文件           │
│  ├─ 切换标签                                                 │
│  │   └─ switchTab(tabId) → 保存当前滚动 → 切换活跃         │
│  ├─ 关闭标签                                                 │
│  │   └─ closeTab(tabId) → 检查修改 → 移除 Tab              │
│  └─ 保存文件                                                 │
│      └─ updateTabState(tabId, { contentModified: false })  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  App.vue unmounted() / beforeUnmount()                      │
│  └─ saveTabs() → 保存所有标签到 Store                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 修改点清单

### 5.1 新建文件
| 文件 | 说明 |
|------|------|
| `src/components/TabBar.vue` | 标签栏 UI 组件 |
| `src/components/TabContent.vue` | 标签页内容容器 |
| `src/stores/tabStore.js` | Pinia Tab 状态管理 |
| `src/utils/tab-utils.js` | Tab 相关工具函数 |

### 5.2 修改文件
| 文件 | 修改内容 |
|------|---------|
| `src/App.vue` | 集成 TabBar + KeepAlive + TabContent |
| `src/components/MyVditor.vue` | 支持动态 DOM id，支持 initialFile prop |
| `src/utils/store.js` | 新增 `saveTabs()` / `loadTabs()` |
| `src/utils/i18n-helper.js` | 新增 tabs 相关国际化文本 |

---

## 6. 国际化文本

### 6.1 新增 key 结构
```javascript
notifications: {
  tabs: {
    newTab: { unsavedChanges: { ... } },
    closeTab: { unsavedChanges: { ... } },
    closeAllTabs: { unsavedChanges: { ... } },
    switchTab: { unsavedChanges: { ... } }
  }
}
```

### 6.2 窗口标题修改
```javascript
windowTitle: {
  appName: 'Tauri Markdown',
  untitled: '未命名',
  modifiedMarker: '●',
  tabSeparator: ' - '  // 新增
}
```

---

## 7. 错误处理

### 7.1 文件不存在
- 加载标签时文件不存在 → 显示通知，从标签列表移除

### 7.2 保存失败
- 保存标签页失败 → 显示错误通知，保留 `contentModified: true`

### 7.3 UUID 冲突
- 理论上不可能，但加日志监控

---

## 8. 性能优化

### 8.1 懒加载
- TabContent 仅在活跃时渲染

### 8.2 节流
- 滚动位置保存使用节流（200ms）

### 8.3 懒初始化
- 非活跃 Tab 的 Vditor 不初始化拖拽监听

---

## 9. 测试策略

### 9.1 单元测试
- `tabStore.test.js`: Store actions
- `tab-utils.test.js`: 工具函数

### 9.2 集成测试
- 标签页创建/切换/关闭流程
- 持久化恢复流程

### 9.3 手动测试
- 所有用户故事 AC

---

## 10. 后续扩展

### 10.1 拖拽交换标签
- 支持拖拽交换标签顺序

### 10.2 标签分组
- 支持文件夹分组标签

### 10.3 标签搜索
- 快速搜索打开的标签
