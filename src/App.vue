<template>
  <div id="app">
    <!-- 顶部应用栏 -->
    <div class="app-menubar">
      <div class="menubar-left">
        <!-- 文件菜单 -->
        <el-dropdown trigger="click" @command="handleFileMenu">
          <span class="menu-item">
            {{ menuI18n.file }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="new">
                <span>{{ menuI18n.new }}</span>
                <span class="shortcut">{{ menuShortcuts.new }}</span>
              </el-dropdown-item>
              <el-dropdown-item command="open">
                <span>{{ menuI18n.open }}</span>
                <span class="shortcut">{{ menuShortcuts.open }}</span>
              </el-dropdown-item>
              <el-dropdown-item command="save">
                <span>{{ menuI18n.save }}</span>
                <span class="shortcut">{{ menuShortcuts.save }}</span>
              </el-dropdown-item>
              <el-dropdown-item divided command="export-md">
                <span>{{ menuI18n.exportMd }}</span>
                <span class="shortcut">{{ menuShortcuts.export }}</span>
              </el-dropdown-item>
              <el-dropdown-item command="export-pdf">
                <span>{{ menuI18n.exportPdf }}</span>
              </el-dropdown-item>
              <el-dropdown-item command="export-html">
                <span>{{ menuI18n.exportHtml }}</span>
              </el-dropdown-item>
              <el-dropdown-item divided command="print">
                <span>{{ menuI18n.print }}</span>
                <span class="shortcut">Ctrl+P</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 外观菜单 -->
        <el-dropdown trigger="click" @command="handleAppearanceMenu">
          <span class="menu-item">
            {{ menuI18n.appearance }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <div class="menu-group-title">{{ menuTheme.label }}</div>
              <el-dropdown-item command="theme-auto">
                <span>{{ menuTheme.auto }}</span>
                <span v-if="currentTheme === 'auto'" class="theme-check">✓</span>
              </el-dropdown-item>
              <el-dropdown-item command="theme-light">
                <span>{{ menuTheme.light }}</span>
                <span v-if="currentTheme === 'light'" class="theme-check">✓</span>
              </el-dropdown-item>
              <el-dropdown-item command="theme-dark">
                <span>{{ menuTheme.dark }}</span>
                <span v-if="currentTheme === 'dark'" class="theme-check">✓</span>
              </el-dropdown-item>
              <el-dropdown-item divided command="zen-mode">
                <span>{{ menuI18n.zenMode }}</span>
                <span class="shortcut">{{ menuShortcuts.zenMode }}</span>
                <span v-if="isZenMode" class="theme-check">✓</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 设置菜单 -->
        <el-dropdown trigger="click" @command="handleSettingsMenu">
          <span class="menu-item">
            {{ menuI18n.settings }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="scroll-remember">
                {{ menuI18n.scrollRemember }}
                <span v-if="scrollRememberEnabled" class="theme-check">✓</span>
              </el-dropdown-item>
              <el-dropdown-item command="multi-tab-mode">
                {{ menuI18n.multiTabMode }}
                <span v-if="multiTabMode" class="theme-check">✓</span>
              </el-dropdown-item>
              <el-dropdown-item divided command="image-host-settings">
                {{ menuI18n.imageHostSettings }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 帮助菜单 -->
        <el-dropdown trigger="click" @command="handleHelpMenu">
          <span class="menu-item">
            {{ menuI18n.help }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="viewLog">{{ menuI18n.viewLog }}</el-dropdown-item>
              <el-dropdown-item command="devTools">{{ menuI18n.devTools }}</el-dropdown-item>
              <el-dropdown-item command="checkUpdate">{{ menuI18n.checkUpdate }}</el-dropdown-item>
              <el-dropdown-item command="about">{{ menuI18n.about }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- 语言切换器 -->
      <div class="menubar-right">
        <!-- 查找按钮 -->
        <button class="find-btn" @click="showFindReplace" :title="findReplaceI18n.tooltip">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10.5" cy="10.5" r="7"></circle>
            <line x1="15.5" y1="15.5" x2="21" y2="21"></line>
          </svg>
        </button>
        <span class="language-label">{{ menuLanguage.label }}:</span>
        <el-select v-model="currentLang" @change="switchLanguage" size="small" style="width: 120px;">
          <el-option label="中文" value="zh_CN" />
          <el-option label="English" value="en_US" />
          <el-option label="日本語" value="ja_JP" />
          <el-option label="한국어" value="ko_KR" />
        </el-select>
      </div>
    </div>

    <!-- 多标签模式：标签栏 + 标签内容区域 -->
    <template v-if="multiTabMode">
      <TabBar
        :tabs="tabStore.tabs"
        :active-tab-id="tabStore.activeTabId"
        :lang="currentLang"
        @switch-tab="handleSwitchTab"
        @close-tab="handleCloseTab"
        @new-tab="handleNewTab"
        @open-file="handleOpenFile"
        @reorder-tab="handleReorderTab"
        @tab-drag-start="dragDropManager?.suppressOverlay?.()"
        @tab-drag-end="dragDropManager?.restoreOverlay?.()"
      />
      <div class="tab-contents">
        <TabContent
          v-for="tab in tabStore.tabs"
          :key="tab.id"
          :tab="tab"
          :is-active="tab.id === tabStore.activeTabId"
          :ref="el => setTabContentRef(tab.id, el)"
        />
      </div>
    </template>

    <!-- 单文档模式 -->
    <MyVditor v-else ref="vditor" />

    <!-- 查找/替换组件 -->
    <FindReplace
      ref="findReplace"
      :lang="currentLang"
      @content-changed="handleContentChanged"
    />

    <!-- Zen 模式提示框 -->
    <transition name="fade">
      <div v-if="showZenTip" class="zen-tip">
        {{ zenTipText }}
      </div>
    </transition>

    <!-- 图床设置对话框 -->
    <ImageHostSettings
      v-model="showImageHostSettings"
      :lang="currentLang"
    />

    <!-- 拖拽文件高亮遮罩层 -->
    <div v-if="dragDropManager?.showDropOverlay" class="drop-overlay">
      <div class="drop-overlay-content">
        <svg class="drop-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p class="drop-text">{{ dropHintText }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import MyVditor from './components/MyVditor.vue'
import TabBar from './components/TabBar.vue'
import TabContent from './components/TabContent.vue'
import FindReplace from './components/FindReplace.vue'
import ImageHostSettings from './components/ImageHostSettings.vue'
import { getI18nConfig } from './utils/i18n-helper.js'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElNotification, ElMessageBox } from 'element-plus'
import { getTheme, saveTheme, getScrollRememberEnabled, saveScrollRememberEnabled, getZenMode, saveZenMode, getLanguage, saveLanguage, getMultiTabMode, saveMultiTabMode } from './utils/store.js'
import { useTabStore } from './stores/tabStore.js'
import { checkUnsavedChanges } from './utils/unsaved-check.js'
import { useDragDrop } from './composables/useDragDrop.js'
import { getCurrentWindow } from '@tauri-apps/api/window'

export default {
  name: 'App',
  components: {
    MyVditor,
    TabBar,
    TabContent,
    FindReplace,
    ImageHostSettings,
    ArrowDown,
  },
  setup() {
    const tabStore = useTabStore()
    return { tabStore }
  },
  data() {
    return {
      currentLang: 'zh_CN',
      currentTheme: 'auto',
      scrollRememberEnabled: true,
      isZenMode: false,
      showZenTip: false,
      zenTipTimer: null,
      showImageHostSettings: false,
      multiTabMode: true,
      // Map<tabId, TabContent component ref>
      tabContentRefs: new Map(),
      // 拖拽文件管理器
      dragDropManager: null,
      showDropOverlay: false,
    }
  },
  computed: {
    menuI18n() {
      return getI18nConfig(this.currentLang).menu;
    },
    menuShortcuts() {
      return getI18nConfig(this.currentLang).shortcuts;
    },
    menuTheme() {
      return getI18nConfig(this.currentLang).theme;
    },
    menuLanguage() {
      return getI18nConfig(this.currentLang).language;
    },
    findReplaceI18n() {
      return getI18nConfig(this.currentLang).findReplace;
    },
    dropHintText() {
      return getI18nConfig(this.currentLang).dragDrop?.hint || 'Drop to open Markdown file';
    },
    zenTipText() {
      const i18n = getI18nConfig(this.currentLang);
      return this.isZenMode ? i18n.zenTipEnter : i18n.zenTipExit;
    },
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeyboardShortcut);
    this.initTheme();
    this.initViewSettings();
    setTimeout(() => this.checkForUpdate(false), 10000);
    
    // 初始化拖拽文件管理器
    this.initDragDrop();
    // 初始化窗口关闭拦截（集中处理所有标签的未保存修改）
    this.setupWindowCloseHandler();
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyboardShortcut);
    if (this._systemThemeMedia) {
      this._systemThemeMedia.removeEventListener('change', this._systemThemeHandler);
    }
    // 最佳努力保存：beforeUnmount 不能是 async，但 Tauri store IPC 通常在进程退出前完成
    // 已在每次标签操作后调用 persistTabs()，此处为兜底
    this.tabStore.saveTabs().catch(() => {})
    
    // 清理拖拽文件管理器
    if (this.dragDropManager) {
      this.dragDropManager.cleanup();
    }
    // 清理窗口关闭拦截
    if (this._unlistenCloseRequest) {
      this._unlistenCloseRequest();
    }
  },
  methods: {
    // ─── Tab 引用管理 ─────────────────────────────────────────────────────────

    /**
     * 设置 TabContent 的 ref（通过 v-for :ref 回调调用）
     */
    setTabContentRef(tabId, el) {
      if (el) {
        this.tabContentRefs.set(tabId, el)
      } else {
        this.tabContentRefs.delete(tabId)
      }
    },

    /**
     * 获取当前活跃标签页的 MyVditor ref
     * 单文档模式下直接返回 this.$refs.vditor
     */
    getActiveVditor() {
      if (!this.multiTabMode) {
        return this.$refs.vditor ?? null
      }
      const activeId = this.tabStore.activeTabId
      if (!activeId) return null
      const tabContent = this.tabContentRefs.get(activeId)
      return tabContent?.vditorRef ?? null
    },

    // ─── Tab 事件处理 ─────────────────────────────────────────────────────────

    /**
     * 新建标签页（来自 TabBar 事件）
     */
    handleNewTab() {
      this.tabStore.addTab()
      this.persistTabs()
      this.$nextTick(() => this.scrollTabListToEnd())
    },

    /**
     * 将标签栏滚动到最右侧，使新建的标签可见
     */
    scrollTabListToEnd() {
      const tabList = document.querySelector('.tab-list')
      if (tabList) tabList.scrollLeft = tabList.scrollWidth
    },

    /**
     * 拖放文件打开处理
     *
     * 策略：
     * - 单文档模式：直接在当前 vditor 打开文件
     * - 多标签模式 + 当前标签为空：在当前标签打开
     * - 多标签模式 + 当前标签有内容：新建标签页打开
     */
    async handleOpenFile(path) {
      if (!path) return

      const vditor = this.getActiveVditor()

      // 单文档模式：直接在当前编辑器打开文件
      if (!this.multiTabMode) {
        if (vditor) {
          await vditor.loadFileByPath(path)
        }
        return
      }

      // 多标签模式
      const activeTab = this.tabStore.activeTab

      // 判断当前标签页是否为"空"：无文件路径且无内容修改
      const isCurrentTabEmpty = activeTab
        && !activeTab.filePath
        && !activeTab.contentModified
        && vditor
        && !vditor.isContentModified

      if (isCurrentTabEmpty) {
        // 场景 1：当前标签页为空，直接在其中打开文件
        await vditor.loadFileByPath(path)
      } else {
        // 场景 2：当前标签页有内容或有修改，新建标签页打开
        this.tabStore.addTab()  // 先创建空标签页（不传 path，避免 initialFile 问题）
        this.persistTabs()
        this.$nextTick(() => this.scrollTabListToEnd())
        // 在调用时捕获目标 tab ID，防止重试期间用户切换标签导致文件加载到错误标签
        const newTabId = this.tabStore.activeTabId
        this._loadFileInNewTab(path, newTabId)
      }
    },

    /**
     * 标签拖拽排序
     */
    handleReorderTab(fromId, toId) {
      this.tabStore.reorderTab(fromId, toId)
      this.persistTabs()
    },

    /**
     * 切换标签页并更新窗口标题
     */
    handleSwitchTab(tabId) {
      this.tabStore.switchTab(tabId)
      this.$nextTick(() => {
        const vditor = this.getActiveVditor()
        if (vditor) {
          vditor.updateWindowTitle()
          vditor.restoreScrollPosition?.()
        }
        // 切换标签后更新 FindReplace 的 vditor 引用并重新搜索
        const findReplace = this.$refs.findReplace
        if (findReplace?.visible) {
          findReplace.vditorRef = vditor
          findReplace.performSearch()
        }
      })
    },

    /**
     * 初始化拖拽文件管理器
     */
    initDragDrop() {
      this.dragDropManager = useDragDrop(
        (filePath) => this.handleOpenFile(filePath),
        () => this.currentLang
      )
      this.dragDropManager.setupDragDrop()
    },

    /**
     * 窗口关闭拦截：统一检查所有标签的未保存修改
     *
     * 无修改 → 直接退出
     * 有修改 → 弹窗 → 保存并关闭 / 丢弃(退出) / 取消(不退出)
     */
    async setupWindowCloseHandler() {
      try {
        const appWindow = getCurrentWindow()
        this._unlistenCloseRequest = await appWindow.onCloseRequested(async (event) => {
          event.preventDefault()

          // 收集有未保存修改的标签/编辑器
          const modifiedItems = []
          if (this.multiTabMode) {
            for (const tab of this.tabStore.tabs) {
              const tc = this.tabContentRefs.get(tab.id)
              const vd = tc?.vditorRef
              if (vd ? vd.isContentModified : tab.contentModified) {
                modifiedItems.push(vd)
              }
            }
          } else {
            const vd = this.$refs.vditor
            if (vd?.isContentModified) modifiedItems.push(vd)
          }

          // 无修改，直接退出
          if (modifiedItems.length === 0) {
            await appWindow.destroy()
            return
          }

          // 有修改，弹窗提示
          const i18nNotif = getI18nConfig(this.currentLang).notifications
          const msgConfig = i18nNotif.closeWindow?.unsavedChanges || {
            title: '提示', message: '有未保存的修改，是否保存？',
            confirmButtonText: '保存并关闭', cancelButtonText: '取消', thirdButtonText: '丢弃'
          }
          const result = await checkUnsavedChanges(true, msgConfig, true)

          if (result === 'discard') {
            // 丢弃修改，退出软件
            await appWindow.destroy()
          } else if (result === 'save') {
            // 保存所有有修改的编辑器，然后退出
            let allSaved = true
            for (const vd of modifiedItems) {
              if (vd) {
                const saved = await vd.saveMdFile()
                if (!saved) { allSaved = false; break }
              }
            }
            if (allSaved) await appWindow.destroy()
          }
          // cancel → 窗口保持打开
        })
      } catch (error) {
        console.error('[WindowClose] 初始化窗口关闭拦截失败:', error)
      }
    },

    /**
     * 等待新标签页的 Vditor 挂载完成，然后加载文件
     * @param {string} path - 文件路径
     * @param {string} targetTabId - 目标标签 ID（在调用时捕获，防止重试期间切换标签）
     * @param {number} retryCount - 当前重试次数
     */
    _loadFileInNewTab(path, targetTabId, retryCount = 0) {
      const MAX_RETRIES = 10
      if (!targetTabId) return

      const tabContent = this.tabContentRefs.get(targetTabId)
      const vditor = tabContent?.vditorRef

      if (vditor && vditor.vditor) {
        // Vditor 已初始化，直接加载文件
        vditor.loadFileByPath(path)
        return
      }

      if (retryCount < MAX_RETRIES) {
        setTimeout(() => this._loadFileInNewTab(path, targetTabId, retryCount + 1), 200)
      }
    },

    /**
     * 关闭标签页：检查未保存修改，然后调用 store.closeTab
     */
    async handleCloseTab(tabId) {
      const tab = this.tabStore.tabs.find(t => t.id === tabId)
      if (!tab) return

      const tabContent = this.tabContentRefs.get(tabId)
      const vditor = tabContent?.vditorRef

      // 检查是否有未保存修改（优先读取 vditor 实例状态）
      const isModified = vditor ? vditor.isContentModified : tab.contentModified

      if (isModified) {
        const i18nNotif = getI18nConfig(this.currentLang).notifications
        const fileName = tab.filePath
          ? tab.filePath.split(/[\\/]/).pop()
          : getI18nConfig(this.currentLang).windowTitle?.untitled || '未命名'

        // 使用 tabs.closeTab（带 tabs 前缀的 i18n key）
        const closeTabI18n = i18nNotif.tabs?.closeTab?.unsavedChanges || {
          title: '提示',
          message: `标签页 "${fileName}" 有未保存的修改，是否保存？`,
          confirmButtonText: '保存并关闭',
          cancelButtonText: '取消',
          thirdButtonText: '丢弃',
        }

        // 替换 {fileName} 占位符
        const msgConfig = {
          ...closeTabI18n,
          message: closeTabI18n.message.replace('{fileName}', fileName),
        }

        const result = await checkUnsavedChanges(true, msgConfig, true)

        if (result === 'cancel') return

        if (result === 'save' && vditor) {
          const saved = await vditor.saveMdFile()
          if (!saved) return  // 保存失败，取消关闭
        }
        // result === 'discard' => 直接关闭
      }

      this.tabStore.closeTab(tabId)

      // 如果关闭后没有标签了，新建一个空白标签
      if (this.tabStore.tabs.length === 0) {
        this.tabStore.addTab()
      }

      // 持久化标签页状态
      this.persistTabs()
    },

    // ─── 查找/替换 ────────────────────────────────────────────────────────────

    showFindReplace() {
      const findReplace = this.$refs.findReplace
      if (findReplace) {
        findReplace.vditorRef = this.getActiveVditor()
        findReplace.show()
      }
    },

    handleContentChanged() {
      const vditor = this.getActiveVditor()
      if (vditor) {
        vditor.checkContentModified()
      }
    },

    // ─── 键盘快捷键 ───────────────────────────────────────────────────────────

    handleKeyboardShortcut(event) {
      if (event.key === 'F11') {
        event.preventDefault();
        this.toggleZenMode();
        return;
      }

      if (event.key === 'Escape' && this.isZenMode) {
        event.preventDefault();
        this.toggleZenMode(false);
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl+T: 新建标签页（仅多标签模式）
      if (ctrlOrCmd && event.key === 't' && !event.shiftKey) {
        if (!this.multiTabMode) return;
        event.preventDefault();
        this.tabStore.addTab();
        this.persistTabs();
        return;
      }

      // Ctrl+W: 关闭当前标签页（仅多标签模式）
      if (ctrlOrCmd && event.key === 'w' && !event.shiftKey) {
        if (!this.multiTabMode) return;
        event.preventDefault();
        if (this.tabStore.activeTabId) {
          this.handleCloseTab(this.tabStore.activeTabId);
        }
        return;
      }

      // Ctrl+Tab: 切换到下一个标签页（仅多标签模式）
      if (ctrlOrCmd && event.key === 'Tab' && !event.shiftKey) {
        if (!this.multiTabMode) return;
        event.preventDefault();
        const tabs = this.tabStore.tabs;
        if (tabs.length > 1) {
          const idx = tabs.findIndex(t => t.id === this.tabStore.activeTabId);
          const nextIdx = (idx + 1) % tabs.length;
          this.handleSwitchTab(tabs[nextIdx].id);
        }
        return;
      }

      // Ctrl+N: 单文档模式 → 新建空白文档，多标签模式 → 新建标签页
      if (ctrlOrCmd && event.key === 'n' && !event.shiftKey) {
        event.preventDefault();
        if (this.multiTabMode) {
          this.tabStore.addTab();
          this.persistTabs();
        } else {
          this.getActiveVditor()?.newFile();
        }
        return;
      }

      // Ctrl+O: 打开文件
      if (ctrlOrCmd && event.key === 'o' && !event.shiftKey) {
        event.preventDefault();
        this.getActiveVditor()?.openMdFile();
        return;
      }

      // Ctrl+S: 保存文件
      if (ctrlOrCmd && event.key === 's' && !event.shiftKey) {
        event.preventDefault();
        this.getActiveVditor()?.saveMdFile();
        return;
      }

      // Ctrl+Shift+S: 导出文件
      if (ctrlOrCmd && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.getActiveVditor()?.exportFile();
        return;
      }

      // Ctrl+P: 打印
      if (ctrlOrCmd && event.key === 'p' && !event.shiftKey) {
        event.preventDefault();
        this.getActiveVditor()?.printPage();
        return;
      }
    },

    // ─── 菜单处理 ─────────────────────────────────────────────────────────────

    handleFileMenu(command) {
      const vditor = this.getActiveVditor()
      switch (command) {
        case 'new':
          vditor?.newFile();
          break;
        case 'open':
          vditor?.openMdFile();
          break;
        case 'save':
          vditor?.saveMdFile();
          break;
        case 'export-md':
          vditor?.exportFile();
          break;
        case 'export-pdf':
          vditor?.exportPdf();
          break;
        case 'export-html':
          vditor?.exportHtml();
          break;
        case 'print':
          vditor?.printPage();
          break;
      }
    },

    handleAppearanceMenu(command) {
      if (typeof command !== 'string') return;
      if (command.startsWith('theme-')) {
        const theme = command.replace('theme-', '');
        this.handleThemeMenu(theme);
      } else if (command === 'zen-mode') {
        this.toggleZenMode();
      }
    },

    async handleSettingsMenu(command) {
      if (command === 'multi-tab-mode') {
        this.multiTabMode = !this.multiTabMode
        await saveMultiTabMode(this.multiTabMode)
        // 切换到多标签模式时，如果没有标签则新建一个，避免空白页面
        if (this.multiTabMode && this.tabStore.tabs.length === 0) {
          this.tabStore.addTab()
          this.persistTabs()
        }
      } else if (command === 'scroll-remember') {
        this.scrollRememberEnabled = !this.scrollRememberEnabled
        await saveScrollRememberEnabled(this.scrollRememberEnabled)
        // 通知所有标签页的 vditor 组件更新状态
        for (const [, tabContent] of this.tabContentRefs) {
          tabContent?.vditorRef?.setScrollRememberEnabled(this.scrollRememberEnabled)
        }
      } else if (command === 'image-host-settings') {
        this.showImageHostSettings = true
      }
    },

    async handleHelpMenu(command) {
      if (command === 'viewLog') {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_log_folder');
      } else if (command === 'devTools') {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_devtools');
      } else if (command === 'about') {
        this.getActiveVditor()?.showAbout();
      } else if (command === 'checkUpdate') {
        this.checkForUpdate(true);
      }
    },

    // ─── 更新检查 ─────────────────────────────────────────────────────────────

    async checkForUpdate(manual = false) {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const { relaunch } = await import('@tauri-apps/plugin-process');
        const updaterI18n = this.menuI18n.updater || {};

        console.log('[updater] checking for update...');
        const update = await check();
        console.log('[updater] check result:', update);
        if (update) {
          ElMessageBox({
            title: updaterI18n.available || '发现新版本',
            message: (updaterI18n.availableMsg || '新版本 {version} 已发布，是否立即更新？').replace('{version}', update.version),
            showCancelButton: true,
            confirmButtonText: '更新',
            cancelButtonText: '取消',
            beforeClose: async (action, instance, done) => {
              if (action === 'confirm') {
                instance.confirmButtonLoading = true;
                instance.confirmButtonText = updaterI18n.downloading || '正在下载...';
                try {
                  let progressText = '';
                  let downloaded = 0;
                  let contentLength = 0;
                  await update.downloadAndInstall((event) => {
                    if (event.event === 'Started') {
                      contentLength = event.data.contentLength || 0;
                      const totalMB = contentLength > 0 ? (contentLength / 1024 / 1024).toFixed(2) : '未知';
                      instance.message = `${updaterI18n.downloading || '正在下载更新'} (总大小: ${totalMB} MB)...`;
                    } else if (event.event === 'Progress') {
                      downloaded += event.data.chunkLength || 0;
                      const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
                      const downloadedMB = (downloaded / 1024 / 1024).toFixed(2);
                      const msg = `${(updaterI18n.downloadProgress || '下载进度: {progress}%').replace('{progress}', percent)} (${downloadedMB} MB)`;
                      if (msg !== progressText) {
                        instance.message = msg;
                        progressText = msg;
                      }
                    } else if (event.event === 'Finished') {
                      instance.message = updaterI18n.downloadComplete || '下载完成，准备安装...';
                    }
                  });
                  done();
                  ElMessageBox({
                    title: updaterI18n.available || '更新就绪',
                    message: updaterI18n.installConfirm || '更新已下载完成，是否立即重启应用以完成安装？',
                    showCancelButton: true,
                    confirmButtonText: '重启',
                    cancelButtonText: '稍后',
                  }).then(() => relaunch()).catch(() => {});
                } catch (err) {
                  done();
                  ElNotification.error({ title: updaterI18n.error || '更新失败', message: (updaterI18n.errorMsg || '更新失败: {error}').replace('{error}', String(err)) });
                }
              } else {
                done();
              }
            },
          }).catch(() => {});
        } else if (manual) {
          ElNotification.info({ title: updaterI18n.noUpdate || '检查更新', message: updaterI18n.noUpdateMsg || '当前版本已是最新' });
        }
      } catch (err) {
        console.error('[updater] check error:', err);
        if (manual) {
          const updaterI18n = this.menuI18n.updater || {};
          ElNotification.error({ title: updaterI18n.error || '更新失败', message: (updaterI18n.errorMsg || '检查更新时发生错误: {error}').replace('{error}', String(err)) });
        }
      }
    },

    // ─── 语言切换 ─────────────────────────────────────────────────────────────

    async switchLanguage(lang) {
      this.currentLang = lang;
      await saveLanguage(lang);
      // 通知所有标签页的 vditor 切换语言
      for (const [, tabContent] of this.tabContentRefs) {
        tabContent?.vditorRef?.switchLanguage(lang)
      }
    },

    // ─── 主题管理 ─────────────────────────────────────────────────────────────

    async initTheme() {
      const savedTheme = await getTheme();
      this.currentTheme = savedTheme;
      this.applyTheme(savedTheme);

      this._systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
      this._systemThemeHandler = () => {
        if (this.currentTheme === 'auto') {
          this.applyTheme('auto');
        }
      };
      this._systemThemeMedia.addEventListener('change', this._systemThemeHandler);
    },

    handleThemeMenu(theme) {
      this.currentTheme = theme;
      this.applyTheme(theme);
      saveTheme(theme);
    },

    applyTheme(theme) {
      const isDark = theme === 'dark' || (theme === 'auto' && this.getSystemTheme() === 'dark');
      const html = document.documentElement;
      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      // 同步所有标签页的 vditor 主题
      for (const [, tabContent] of this.tabContentRefs) {
        tabContent?.vditorRef?.setVditorTheme(isDark)
      }
    },

    getSystemTheme() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    // ─── 初始化视图设置 ───────────────────────────────────────────────────────

    async initViewSettings() {
      // 加载多标签模式设置
      this.multiTabMode = await getMultiTabMode()

      // 多标签模式下加载标签页状态
      if (this.multiTabMode) {
        await this.tabStore.loadTabs()
        if (this.tabStore.tabs.length === 0) {
          this.tabStore.addTab()
        }
      }

      this.scrollRememberEnabled = await getScrollRememberEnabled()
      this.isZenMode = await getZenMode()

      const savedLang = await getLanguage()
      if (savedLang && savedLang !== this.currentLang) {
        this.currentLang = savedLang
      }

      // 等待子组件 mount 并初始化 vditor，然后应用设置
      this.$nextTick(() => {
        if (this.multiTabMode) {
          this._applySettingsToAllTabs(savedLang)
        } else {
          // 单文档模式：直接应用到唯一的 vditor
          const vditor = this.$refs.vditor
          if (vditor) {
            vditor.setScrollRememberEnabled(this.scrollRememberEnabled)
            if (savedLang && savedLang !== 'zh_CN') {
              vditor.switchLanguage(savedLang)
            }
          }
          this.applyZenMode(this.isZenMode)
        }
      })
    },

    /**
     * 将设置应用到所有标签页的 vditor 实例
     * 会重试最多 5 次（每次间隔 200ms），以应对 vditor 初始化延迟
     */
    _applySettingsToAllTabs(savedLang, retryCount = 0) {
      const MAX_RETRIES = 5
      const hasUninitialized = Array.from(this.tabContentRefs.values()).some(
        tc => tc?.vditorRef && !tc.vditorRef.vditor
      )

      if (hasUninitialized && retryCount < MAX_RETRIES) {
        setTimeout(() => this._applySettingsToAllTabs(savedLang, retryCount + 1), 200)
        return
      }

      for (const [, tabContent] of this.tabContentRefs) {
        tabContent?.vditorRef?.setScrollRememberEnabled(this.scrollRememberEnabled)
        if (savedLang && savedLang !== 'zh_CN') {
          tabContent?.vditorRef?.switchLanguage(savedLang)
        }
      }
      this.applyZenMode(this.isZenMode)
    },

    // ─── Tab 持久化 ─────────────────────────────────────────────────────────

    /**
     * 持久化当前标签页状态到磁盘
     */
    async persistTabs() {
      try {
        await this.tabStore.saveTabs()
      } catch (error) {
        console.error('[App] 持久化标签页状态失败:', error)
      }
    },

    // ─── Zen 模式 ─────────────────────────────────────────────────────────────

    async toggleZenMode(forceState = null) {
      const newState = forceState !== null ? forceState : !this.isZenMode
      this.isZenMode = newState
      await saveZenMode(newState)
      this.applyZenMode(newState)

      this.showZenTip = true
      if (this.zenTipTimer) clearTimeout(this.zenTipTimer)
      this.zenTipTimer = setTimeout(() => {
        this.showZenTip = false
      }, 2000)
    },

    applyZenMode(isZen) {
      const appElement = document.getElementById('app')
      if (isZen) {
        appElement.classList.add('zen-mode')
        document.body.classList.add('zen-mode')
      } else {
        appElement.classList.remove('zen-mode')
        document.body.classList.remove('zen-mode')
      }
      // 通知所有标签页的 vditor
      for (const [, tabContent] of this.tabContentRefs) {
        tabContent?.vditorRef?.toggleZenMode(isZen)
      }
    },
  }
}
</script>

<style scoped>
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-menubar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 15px;
  height: 40px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  user-select: none;
}

.menubar-left {
  display: flex;
  gap: 5px;
}

.menubar-right {
  display: flex;
  align-items: center;
  gap: 5px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
  transition: all 0.3s;
}

.menu-item:hover {
  background: #e4e7ed;
  color: #409eff;
}

/* Zen 模式下菜单栏完全隐藏 */
.zen-mode .app-menubar {
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  overflow: hidden;
}

.shortcut {
  margin-left: 30px;
  font-size: 12px;
  color: #909399;
}

.theme-check {
  margin-left: 20px;
  color: #409eff;
  font-weight: bold;
}

.menu-group-title {
  padding: 8px 20px 4px;
  font-size: 12px;
  color: #909399;
  font-weight: 600;
  line-height: 1;
  user-select: none;
  pointer-events: none;
}

.language-label {
  font-size: 12px;
  color: #909399;
  margin-right: 4px;
  white-space: nowrap;
}

.find-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  border-radius: 4px;
  transition: all 0.3s;
}

.find-btn:hover {
  background: #e4e7ed;
  color: #409eff;
}

html.dark .find-btn {
  color: #cfd3dc;
}

html.dark .find-btn:hover {
  background: #363637;
  color: #409eff;
}

/* 标签内容区域：占据剩余高度 */
.tab-contents {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.zen-tip {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 14px 32px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.5px;
  z-index: 9999;
  pointer-events: none;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: zen-tip-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes zen-tip-enter {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.dark .zen-tip {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #f0f0f0;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
/* 全局样式：统一所有下拉菜单宽度 */
.el-dropdown-menu {
  min-width: 200px !important;
}

.el-dropdown-menu .el-dropdown-menu {
  min-width: 200px !important;
}

.el-dropdown-menu .el-dropdown-menu__item {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: center !important;
  text-align: left !important;
  padding: 0 20px !important;
  line-height: 36px !important;
}

.el-dropdown-menu .el-dropdown-menu__item > span,
.el-dropdown-menu .el-dropdown-menu__item > div {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: center !important;
  width: 100% !important;
  text-align: left !important;
}

.nested-dropdown-popper .el-dropdown-menu__item {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: center !important;
  text-align: left !important;
  padding: 0 20px !important;
  line-height: 36px !important;
}

.nested-dropdown-popper .el-dropdown-menu__item > span,
.nested-dropdown-popper .el-dropdown-menu__item > div {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: center !important;
  width: 100% !important;
  text-align: left !important;
}
</style>
