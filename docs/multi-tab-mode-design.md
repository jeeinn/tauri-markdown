# Multi-Tab Mode Design Document

> Feature: Multi-Tab Editor with Toggle Support
> Branch: `feature/multi-tab`
> Date: 2026-06-17

## Overview

The multi-tab editor allows users to open and edit multiple Markdown files simultaneously in separate tabs. A "Multi-Tab Mode" toggle in the Settings menu lets users switch between multi-tab and single-document modes.

## Architecture

### Component Structure

```
App.vue
├── [multiTabMode=true]
│   ├── TabBar          — tab list, drag-drop, new/close buttons
│   └── TabContent[]    — v-for over tabStore.tabs
│       └── MyVditor    — one Vditor instance per tab
└── [multiTabMode=false]
    └── MyVditor        — single global Vditor instance
```

### Key Files

| File | Role |
|------|------|
| `src/stores/tabStore.js` | Pinia store: tabs array, activeTabId, addTab/switchTab/closeTab |
| `src/components/TabBar.vue` | Tab bar UI with drag-drop file opening |
| `src/components/TabContent.vue` | Wrapper exposing MyVditor ref to parent |
| `src/utils/tab-utils.js` | UUID generation, i18n tab titles, scroll position |
| `src/utils/store.js` | Tauri persistence: saveTabs, loadTabs, getMultiTabMode |
| `src/utils/unsaved-check.js` | Three-button unsaved changes dialog |
| `src/config/menu-i18n.js` | i18n for tab operations (4 locales) |

## Mode Toggle

### Setting Persistence

```
store.json
├── multi_tab_mode: true/false     ← new
├── tabs: [{id, filePath, ...}]    ← multi-tab only
├── activeTabId: "uuid"            ← multi-tab only
├── last_opened_file: "/path"      ← single-doc only
├── app_theme, app_language, ...   ← shared
```

The `multi_tab_mode` key defaults to `true` when not present (`value !== false`).

### Mode Switch Flow

**Multi-Tab → Single-Document:**

1. User clicks "多标签模式" in Settings → `handleSettingsMenu('multi-tab-mode')`
2. `this.multiTabMode = false` → `saveMultiTabMode(false)`
3. Vue reactivity triggers template re-render
4. `v-if="multiTabMode"` becomes false → TabBar + all TabContent/MyVditor destroyed
5. `v-else` becomes true → single MyVditor mounted → `autoLoadLastFile()`

**Single-Document → Multi-Tab:**

1. User clicks toggle → `this.multiTabMode = true` → `saveMultiTabMode(true)`
2. Vue re-render: single MyVditor destroyed, TabBar + TabContent created
3. `tabStore.loadTabs()` restores previous tabs from store.json
4. Each TabContent mounts its MyVditor with `initialFile=tab.filePath`

### Vditor Instance Resolution

All code paths use `getActiveVditor()` which branches on `multiTabMode`:

```javascript
getActiveVditor() {
  if (!this.multiTabMode) {
    return this.$refs.vditor ?? null       // single-doc: direct ref
  }
  const tabContent = this.tabContentRefs.get(activeTabId)
  return tabContent?.vditorRef ?? null     // multi-tab: from Map
}
```

This means menu handlers (`handleFileMenu`, `handleKeyboardShortcut`, etc.) are **mode-agnostic** — they always call `getActiveVditor()?.someMethod()`.

## Multi-Tab Specifics

### Tab State Object

```javascript
{
  id: "uuid-v4",           // immutable identifier
  filePath: "/path/to.md", // null for new/blank tabs
  contentModified: false,  // synced from Vditor via checkContentModified
  active: true,            // which tab is active (redundant with activeTabId)
  scrollPosition: 0,       // 0-1 percentage for scroll memory
  editMode: 'ir'           // Vditor editing mode: ir/sv/wysiwyg
}
```

### Drag-Drop File Opening

Two entry points, both calling `handleOpenFile(path)`:

1. **TabBar drop** — `@drop` on tab bar, emits `open-file` event (with `stopPropagation`)
2. **Global drop** — `useDragDrop` composable on window level

Strategy in `handleOpenFile`:

| Current Tab State | Action |
|---|---|
| Empty (no filePath, no changes) | Load file directly into current tab via `vditor.loadFileByPath(path)` |
| Has content or changes | Create new empty tab, then load file via `_loadFileInNewTab(path, targetTabId)` |

`_loadFileInNewTab` captures the target tab ID at call time (not on each retry) to prevent loading into the wrong tab if the user switches tabs during the retry loop.

### Content Modification Sync

`checkContentModified()` in MyVditor syncs to the Pinia store on every call:

```javascript
checkContentModified() {
  // ... compare getValue() vs originalContent ...
  const tabStore = useTabStore()
  tabStore.updateTab(this.tabId, { contentModified: this.isContentModified })
}
```

`syncFilePathToTab(filePath, contentModified)` is called after:
- `loadFileByPath` — updates filePath and resets contentModified to false
- `saveMdFile` — updates filePath and resets contentModified to false
- `clearCurrentFile` — sets filePath to null

### Window Close Handling

Each MyVditor registers its own `onCloseRequested` handler. This is an **architectural limitation** — with multiple tabs, multiple dialogs can stack. A future improvement should centralize this in App.vue.

### Keyboard Shortcuts

| Shortcut | Multi-Tab Mode | Single-Document Mode |
|----------|---------------|---------------------|
| Ctrl+T | New tab | Ignored |
| Ctrl+W | Close tab | Ignored |
| Ctrl+Tab | Next tab | Ignored |
| Ctrl+N | New file in active tab | New file |
| Ctrl+O | Open file in active tab | Open file |
| Ctrl+S | Save active tab | Save file |

## Persistence Details

### Tab State Lifecycle

```
App startup → getMultiTabMode()
  ├── true  → tabStore.loadTabs() → restore tabs + activeTabId
  └── false → single MyVditor → autoLoadLastFile() → getLastFilePath()

During use → persistTabs() called after:
  - addTab, closeTab, handleOpenFile, handleNewTab, handleSwitchTab
  - Saves both tabs array and activeTabId

App close → beforeUnmount → tabStore.saveTabs() (best-effort)
```

### Data Isolation

- Multi-tab data (`tabs`, `activeTabId`) and single-doc data (`last_opened_file`) coexist in the same `store.json`
- Switching modes does NOT clear the other mode's data
- This allows seamless switching: multi-tab state is preserved when temporarily using single-doc mode

## Test Coverage

| Test File | Coverage |
|-----------|----------|
| `src/stores/__tests__/tabStore.test.js` | addTab, switchTab, closeTab, updateTab, saveTabs, loadTabs, hasUnsavedChanges |
| `src/utils/__tests__/tab-utils.test.js` | generateTabId, getTabTitle (i18n), saveTabScrollPosition, restoreTabScrollPosition |
| `src/utils/__tests__/store.test.js` | saveTabs, loadTabs, saveActiveTabId, loadActiveTabId, clearAllTabs, saveMultiTabMode, getMultiTabMode |
| `src/components/__tests__/TabBar.test.js` | Tab rendering, click-to-switch, close button, new-tab button, drag-and-drop |
| `src/components/__tests__/TabContent.test.js` | v-show toggling with isActive prop |

## Known Limitations

1. **Window close with multiple unsaved tabs**: Each tab registers its own `onCloseRequested` handler, which can cause stacked dialogs. Should be centralized in App.vue.
2. **`originalContent` format**: Must match editor content format (converted tmd:// URLs) for `isContentModified` to work correctly.
3. **_applySettingsToAllTabs timing**: Uses setTimeout retry (up to 5 × 200ms) to wait for Vditor initialization. If initialization takes >1s, `switchLanguage` may be called on a mid-init Vditor.
