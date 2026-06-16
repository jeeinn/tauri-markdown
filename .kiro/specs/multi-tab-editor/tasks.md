# Implementation Plan: 多标签页编辑器

## Overview

This spec outlines the implementation plan for adding multi-tab editor functionality to Tauri Markdown. The feature will allow users to edit multiple Markdown documents simultaneously in separate tabs, similar to modern editors like VS Code and Typora.

## Tasks

### 1.1 安装依赖 (P0)

- **Status**: TODO
- **Type**: code
- **Dependencies**: []
- **Retry History**: []
- **Wave**: 1

**Task**:
- Install `uuid` package for generating Tab IDs

**Acceptance Criteria**:
- `uuid` dependency is present in `package.json`
- `npm install` completes successfully

---

### 1.2 创建 Tab 相关工具函数 (P1)

- **Status**: TODO
- **Type**: code
- **Dependencies**: ["1.1"]
- **Retry History**: []
- **Wave**: 2

**Task**:
- Create `src/utils/tab-utils.js`
- Implement the following functions:
  - `generateTabId()`: Generate UUID for tab identification
  - `getTabTitle(tab)`: Get tab title with unsaved changes marker
  - `saveTabScrollPosition(tab, vditorRef)`: Save tab scroll position
  - `restoreTabScrollPosition(tab, vditorRef)`: Restore tab scroll position

**Acceptance Criteria**:
- Utility functions pass unit tests

---

### 2.1 创建 TabBar 组件 (P0)

- **Status**: TODO
- **Type**: code
- **Dependencies**: ["1.2"]
- **Retry History**: []
- **Wave**: 3

**Task**:
- Create `src/components/TabBar.vue`
- Implement the following functionality:
  - Tab list rendering (supports v-for)
  - Click to switch tabs
  - "×" close tab (with event propagation prevention)
  - "+" create new tab
  - Drag and drop files onto tab bar to open
  - Right-click menu (optional)

**Acceptance Criteria**:
- AC-001: Tab display is correct (filename/unsaved marker)
- AC-002: Tab switching is smooth
- AC-003: Confirmation dialog shows when closing tabs with unsaved changes

---

### 2.2 创建 TabContent 组件 (P0)

- **Status**: TODO
- **Type**: code
- **Dependencies**: ["1.2"]
- **Retry History**: []
- **Wave**: 3

**Task**:
- Create `src/components/TabContent.vue`
- Implement the following functionality:
  - Wrap with `<KeepAlive>`
  - Use `<component :is>` for dynamic rendering
  - Pass tab and isActive props
  - Integrate MyVditor component

**Acceptance Criteria**:
- AC-004: Tab state is correctly restored when switching tabs

---

### 2.3 创建 Pinia Tab Store (P0)

- **Status**: TODO
- **Type**: code
- **Dependencies**: ["1.2"]
- **Retry History**: []
- **Wave**: 3

**Task**:
- Create `src/stores/tabStore.js`
- Implement the following functionality:
  - State: tabs, activeTabId
  - Actions: addTab, switchTab, closeTab, updateTab
  - Persistence: saveTabs, loadTabs

**Acceptance Criteria**:
- AC-005: Tab state is correctly saved and restored

---

### 2.4 修改 MyVditor 组件 (P0)

- **Status**: TODO
- **Type**: code
- **Dependencies**: ["1.2"]
- **Retry History**: []
- **Wave**: 3

**Task**:
- Modify `src/components/MyVditor.vue`
- Add new props:
  - `tabId: String` (required): Dynamic DOM id
  - `initialFile: String` (optional): Initial file path
- Modify:
  - `id="vditorEle"` → `:id="vditor-${tabId}"`
  - `mounted()` should decide whether to load or create based on `initialFile`

**Acceptance Criteria**:
- AC-006: Multiple MyVditor instances work independently

---

### 3.1 集成 Tab 到 App (P0)

- **Status**: TODO
- **Type**: code
- **Dependencies**: ["2.1", "2.2", "2.3", "2.4"]
- **Retry History**: []
- **Wave**: 4

**Task**:
- Modify `src/App.vue`
- Integrate:
  - TabBar component
  - KeepAlive + TabContent
  - Pinia Tab Store
- Event handling:
  - New tab (Ctrl+T)
  - Switch tabs (Ctrl+Tab)
  - Close tab (Ctrl+W)
  - Save (Ctrl+S)
  - Open (Ctrl+O)

**Acceptance Criteria**:
- AC-007: All menu items and keyboard shortcuts work correctly
- AC-008: Tabs are restored when App starts

---

### 3.2 集成到 store.js (P1)

- **Status**: TODO
- **Type**: code
- **Dependencies**: ["3.1"]
- **Retry History**: []
- **Wave**: 5

**Task**:
- Modify `src/utils/store.js`
- Add new functions:
  - `saveTabs()`: Save tabs array
  - `loadTabs()`: Load tabs array
  - `clearAllTabs()`: Clear all tabs

**Acceptance Criteria**:
- AC-009: Persistence save/restore works correctly

---

### 4.1 添加国际化文本 (P1)

- **Status**: TODO
- **Type**: code
- **Dependencies**: ["3.1"]
- **Retry History**: []
- **Wave**: 5

**Task**:
- Modify `src/config/menu-i18n.js`
- Add translations for the following languages:
  - tabs.newTab.unsavedChanges
  - tabs.closeTab.unsavedChanges
  - tabs.closeAllTabs.unsavedChanges
  - windowTitle.tabSeparator (new)

**Acceptance Criteria**:
- All languages support multi-tab related text

---

### 5.1 单元测试 (P1)

- **Status**: TODO
- **Type**: test
- **Dependencies**: ["1.2", "2.3"]
- **Retry History**: []
- **Wave**: 6

**Task**:
- Create `src/stores/__tests__/tabStore.test.js`
- Create `src/utils/__tests__/tab-utils.test.js`
- Test all core functions

**Acceptance Criteria**:
- Test pass rate is 100%

---

### 5.2 集成测试 (P1)

- **Status**: TODO
- **Type**: test
- **Dependencies**: ["3.1"]
- **Retry History**: []
- **Wave**: 6

**Task**:
- Create `src/components/__tests__/TabBar.test.js`
- Create `src/components/__tests__/TabContent.test.js`
- Test UI interaction flows

**Acceptance Criteria**:
- All user stories can be manually verified

---

### 6.1 更新 README (P2)

- **Status**: TODO
- **Type**: doc
- **Dependencies**: ["3.1"]
- **Retry History**: []
- **Wave**: 7

**Task**:
- Update `README.md` and `README.zh.md`
- Add multi-tab editor feature documentation
- Add keyboard shortcut list

**Acceptance Criteria**:
- Documentation is clear and easy to understand

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 1,
      "tasks": ["1.1"],
      "description": "Install uuid dependency"
    },
    {
      "id": 2,
      "tasks": ["1.2"],
      "description": "Create tab utility functions"
    },
    {
      "id": 3,
      "tasks": ["2.1", "2.2", "2.3", "2.4"],
      "description": "Core components (TabBar, TabContent, TabStore, MyVditor)"
    },
    {
      "id": 4,
      "tasks": ["3.1"],
      "description": "Integrate tabs into App"
    },
    {
      "id": 5,
      "tasks": ["3.2", "4.1"],
      "description": "Integration and internationalization"
    },
    {
      "id": 6,
      "tasks": ["5.1", "5.2"],
      "description": "Unit and integration tests"
    },
    {
      "id": 7,
      "tasks": ["6.1"],
      "description": "Documentation updates"
    }
  ]
}
```

## Notes

- All P0 tasks must be completed before the feature can be considered ready for testing
- P1 tasks are important but can be completed after P0 tasks
- P2 tasks are nice-to-have improvements
- Tasks in the same wave can be executed in parallel

## Task Dependency Graph

```json
{
  "waves": [
    ["task-1.1"],
    ["task-1.2"],
    ["task-2.1", "task-2.2", "task-2.3", "task-2.4"],
    ["task-3.1"],
    ["task-3.2", "task-4.1"],
    ["task-5.1", "task-5.2"],
    ["task-6.1"]
  ]
}
```