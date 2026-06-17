# Implementation Plan: 多标签页编辑器

## Tasks

- [x] 1. 安装依赖
  - Install `uuid` package for generating Tab IDs: run `npm install uuid`
  - Verify `uuid` dependency is present in `package.json`
  - _Requirements: 1.1_

- [x] 2. 创建 Tab 相关工具函数
  - Create `src/utils/tab-utils.js`
  - Implement `generateTabId()`: generate UUID for tab identification using the `uuid` package
  - Implement `getTabTitle(tab)`: return tab title with "●" marker when `contentModified` is true, and "未命名" when `filePath` is null
  - Implement `saveTabScrollPosition(tab, vditorRef)`: save current scroll position (0-1 percentage) into `tab.scrollPosition`
  - Implement `restoreTabScrollPosition(tab, vditorRef)`: scroll the vditor element to the saved percentage position
  - _Requirements: 1.2_

- [x] 3. 创建 Pinia Tab Store
  - Install `pinia` if not already in `package.json` and configure it in `src/main.js`
  - Create `src/stores/tabStore.js` using the Pinia `defineStore` composition API
  - Define state: `tabs` (array) and `activeTabId` (string | null)
  - Define computed: `activeTab` (derived from `tabs` and `activeTabId`), `hasUnsavedChanges`
  - Implement `addTab(filePath?)`: create a new Tab object with UUID id, set as active, push to `tabs`
  - Implement `switchTab(tabId)`: save current tab scroll position, update `activeTabId`, set `active` flags
  - Implement `closeTab(tabId)`: check unsaved changes, remove from array, switch to adjacent tab
  - Implement `updateTab(tabId, patch)`: merge patch object into the matching tab
  - Implement `saveTabs()`: persist `tabs` and `activeTabId` via `src/utils/store.js`
  - Implement `loadTabs()`: restore tabs from store, skip tabs whose files no longer exist
  - _Requirements: 2.3_

- [x] 4. 创建 TabBar 组件
  - Create `src/components/TabBar.vue`
  - Accept props: `tabs: Array`, `activeTabId: String`, `lang: String`
  - Emit events: `switch-tab`, `close-tab`, `new-tab`, `open-file`
  - Render tab list with `v-for`; display `getTabTitle(tab)` for each tab
  - Highlight the active tab using a CSS class bound to `tab.id === activeTabId`
  - Add "×" close button per tab that calls `$emit('close-tab', tab.id)` and stops event propagation
  - Add "+" button that calls `$emit('new-tab')`
  - Handle `dragover` and `drop` events on the tab bar to extract file paths and emit `open-file`
  - Style: 40px fixed height, active tab highlight, "×" turns red on hover
  - _Requirements: 2.1_

- [x] 5. 修改 MyVditor 组件以支持多实例
  - Open `src/components/MyVditor.vue`
  - Add prop `tabId: { type: String, required: true }` for dynamic DOM id
  - Add prop `initialFile: { type: String, default: null }` for initial file path
  - Change `<div id="vditorEle"` to `<div :id="\`vditor-\${tabId}\`"`
  - Update all internal references from the literal `'vditorEle'` to the dynamic id
  - In `mounted()`, call `loadFileByPath(initialFile)` when `initialFile` is set, otherwise call `newFile()`
  - _Requirements: 2.4_

- [x] 6. 创建 TabContent 组件
  - Create `src/components/TabContent.vue`
  - Accept props: `tab: { type: Object, required: true }`, `isActive: { type: Boolean, default: false }`
  - Render `<div v-show="isActive">` wrapping `<MyVditor :key="tab.id" :tab-id="tab.id" :initial-file="tab.filePath" />`
  - _Requirements: 2.2_

- [x] 7. 集成 Tab 到 App.vue
  - Open `src/App.vue`
  - Import and register `TabBar`, `TabContent`, and `useTabStore`
  - Replace the single `<MyVditor>` with `<TabBar>` + a `<KeepAlive>` block iterating `<TabContent>` for each tab
  - Wire `TabBar` events to store actions: `switch-tab → tabStore.switchTab`, `close-tab → tabStore.closeTab`, `new-tab → tabStore.addTab`, `open-file → tabStore.addTab(path)`
  - Route existing menu handlers (新建, 打开, 保存, 导出, 查找替换) to operate on `tabStore.activeTab`
  - Add keyboard shortcut handlers: Ctrl+T (new tab), Ctrl+W (close tab), Ctrl+Tab (next tab)
  - In `onMounted`: call `tabStore.loadTabs()`; if no tabs restored, call `tabStore.addTab()`
  - In `onBeforeUnmount`: call `tabStore.saveTabs()`
  - _Requirements: 3.1_

- [x] 8. 集成持久化到 store.js
  - Open `src/utils/store.js`
  - Add `saveTabs(tabsArray)`: serialize and store under key `'tabs'`
  - Add `loadTabs()`: retrieve and deserialize from key `'tabs'`; return empty array if missing
  - Add `saveActiveTabId(id)`: store under key `'activeTabId'`
  - Add `loadActiveTabId()`: retrieve from key `'activeTabId'`
  - Add `clearAllTabs()`: remove `'tabs'` and `'activeTabId'` from store
  - _Requirements: 3.2_

- [x] 9. 添加国际化文本
  - Open `src/config/menu-i18n.js`
  - Add `notifications.tabs.newTab.unsavedChanges` with `title`, `message`, `confirmButtonText`, `cancelButtonText`, `thirdButtonText` for all 4 languages (zh_CN, en_US, ja_JP, ko_KR)
  - Add `notifications.tabs.closeTab.unsavedChanges` with the same fields for all 4 languages
  - Add `notifications.tabs.closeAllTabs.unsavedChanges` with the same fields for all 4 languages
  - Add `windowTitle.tabSeparator` (`' - '`) for all 4 languages
  - _Requirements: 4.1_

- [x] 10. 单元测试
  - Create `src/stores/__tests__/tabStore.test.js`: test `addTab`, `switchTab`, `closeTab`, `updateTab`, `saveTabs`, `loadTabs` with mock store
  - Create `src/utils/__tests__/tab-utils.test.js`: test `generateTabId`, `getTabTitle`, `saveTabScrollPosition`, `restoreTabScrollPosition`
  - Run tests and confirm 100% pass rate
  - _Requirements: 5.1_

- [x] 11. 集成测试
  - Create `src/components/__tests__/TabBar.test.js`: test tab rendering, click-to-switch, close button, new-tab button, drag-and-drop
  - Create `src/components/__tests__/TabContent.test.js`: test `v-show` toggling with `isActive` prop
  - Run tests and confirm all pass
  - _Requirements: 5.2_

- [x] 12. 更新 README 文档
  - Update `README.md`: add multi-tab editor section describing the feature and keyboard shortcuts (Ctrl+T, Ctrl+W, Ctrl+Tab)
  - Update `README.zh.md`: add the same section in Chinese
  - _Requirements: 6.1_
