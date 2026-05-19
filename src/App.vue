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
              <el-dropdown-item command="about">{{ menuI18n.about }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- 语言切换器 -->
      <div class="menubar-right">
        <span class="language-label">{{ menuLanguage.label }}:</span>
        <el-select v-model="currentLang" @change="switchLanguage" size="small" style="width: 120px;">
          <el-option label="中文" value="zh_CN" />
          <el-option label="English" value="en_US" />
          <el-option label="日本語" value="ja_JP" />
          <el-option label="한국어" value="ko_KR" />
        </el-select>
      </div>
    </div>

    <!-- Vditor 编辑器 -->
    <MyVditor ref="vditor" />

    <!-- Zen 模式提示框 -->
    <transition name="fade">
      <div v-if="showZenTip" class="zen-tip">
        {{ zenTipText }}
      </div>
    </transition>
  </div>
</template>

<script>
import MyVditor from './components/MyVditor.vue'
import { getI18nConfig } from './utils/i18n-helper.js'
import { ArrowDown } from '@element-plus/icons-vue'
import { getTheme, saveTheme, getScrollRememberEnabled, saveScrollRememberEnabled, getZenMode, saveZenMode, getLanguage, saveLanguage } from './utils/store.js'

export default {
  name: 'App',
  components: {
    MyVditor,
    ArrowDown,
  },
  data() {
    return {
      currentLang: 'zh_CN',
      currentTheme: 'auto',
      scrollRememberEnabled: true,
      isZenMode: false,
      showZenTip: false,
      zenTipTimer: null,
    }
  },
  computed: {
    // 当前语言的菜单翻译
    menuI18n() {
      return getI18nConfig(this.currentLang).menu;
    },
    // 当前语言的快捷键文本
    menuShortcuts() {
      return getI18nConfig(this.currentLang).shortcuts;
    },
    // 当前语言的主题菜单文本
    menuTheme() {
      return getI18nConfig(this.currentLang).theme;
    },
    // 当前语言的语言菜单文本
    menuLanguage() {
      return getI18nConfig(this.currentLang).language;
    },
    // Zen 模式提示文本
    zenTipText() {
      const i18n = getI18nConfig(this.currentLang);
      return this.isZenMode ? i18n.zenTipEnter : i18n.zenTipExit;
    },
  },
  mounted() {
    // 添加全局键盘快捷键监听
    window.addEventListener('keydown', this.handleKeyboardShortcut);
    // 初始化主题
    this.initTheme();
    // 初始化视图设置
    this.initViewSettings();
  },
  
  beforeUnmount() {
    // 移除键盘快捷键监听
    window.removeEventListener('keydown', this.handleKeyboardShortcut);
    // 移除系统主题变化监听
    if (this._systemThemeMedia) {
      this._systemThemeMedia.removeEventListener('change', this._systemThemeHandler);
    }
  },
  
  methods: {
    // 处理键盘快捷键
    handleKeyboardShortcut(event) {
      // F11: 切换 Zen 模式
      if (event.key === 'F11') {
        event.preventDefault();
        this.toggleZenMode();
        return;
      }

      // ESC: 退出 Zen 模式
      if (event.key === 'Escape' && this.isZenMode) {
        event.preventDefault();
        this.toggleZenMode(false);
        return;
      }

      // 判断是否为 Mac 系统
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      
      // Ctrl/Cmd + N: 新建文件
      if (ctrlOrCmd && event.key === 'n' && !event.shiftKey) {
        event.preventDefault();
        this.$refs.vditor?.newFile();
        return;
      }
      
      // Ctrl/Cmd + O: 打开文件
      if (ctrlOrCmd && event.key === 'o' && !event.shiftKey) {
        event.preventDefault();
        this.$refs.vditor?.openMdFile();
        return;
      }
      
      // Ctrl/Cmd + S: 保存文件
      if (ctrlOrCmd && event.key === 's' && !event.shiftKey) {
        event.preventDefault();
        this.$refs.vditor?.saveMdFile();
        return;
      }
      
      // Ctrl/Cmd + Shift + S: 导出文件
      if (ctrlOrCmd && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.$refs.vditor?.exportFile();
        return;
      }

      // Ctrl/Cmd + P: 打印
      if (ctrlOrCmd && event.key === 'p' && !event.shiftKey) {
        event.preventDefault();
        this.printPage();
        return;
      }
    },
    
    // 处理文件菜单命令
    handleFileMenu(command) {
      switch (command) {
        case 'new':
          this.$refs.vditor?.newFile();
          break;
        case 'open':
          this.$refs.vditor?.openMdFile();
          break;
        case 'save':
          this.$refs.vditor?.saveMdFile();
          break;
        case 'export-md':
          this.$refs.vditor?.exportFile();
          break;
        case 'export-pdf':
          this.$refs.vditor?.exportPdf();
          break;
        case 'export-html':
          this.$refs.vditor?.exportHtml();
          break;
        case 'print':
          this.printPage();
          break;
      }
    },
    
    // 处理外观菜单命令
    handleAppearanceMenu(command) {
      if (typeof command !== 'string') return;
      if (command.startsWith('theme-')) {
        const theme = command.replace('theme-', '');
        this.handleThemeMenu(theme);
      } else if (command === 'zen-mode') {
        this.toggleZenMode();
      }
    },
    
    // 处理设置菜单命令
    async handleSettingsMenu(command) {
      if (command === 'scroll-remember') {
        this.scrollRememberEnabled = !this.scrollRememberEnabled
        await saveScrollRememberEnabled(this.scrollRememberEnabled)
        // 通知子组件更新状态
        this.$refs.vditor?.setScrollRememberEnabled(this.scrollRememberEnabled)
      }
    },
    
    // 处理帮助菜单命令
    async handleHelpMenu(command) {
      if (command === 'viewLog') {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_log_folder');
      } else if (command === 'about') {
        this.$refs.vditor?.showAbout();
      }
    },
    
    // 打印页面
    printPage() {
      // 关闭所有下拉菜单
      document.querySelectorAll('.el-dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
      });

      // 设置打印页标题为当前文档名
      const originalTitle = document.title;
      const filePath = this.$refs.vditor?.currentFilePath;
      if (filePath) {
        const fileName = filePath.split('/').pop().split('\\').pop().replace(/\.md$/i, '');
        document.title = fileName;
      } else {
        document.title = 'TauriMarkdown';
      }

      // 获取编辑器所有相关容器
      const vditorContainer = document.querySelector('.vditor-container');
      const vditor = document.querySelector('.vditor');
      const vditorContent = document.querySelector('.vditor-content');
      const vditorIR = document.querySelector('.vditor-ir');
      const vditorWysiwyg = document.querySelector('.vditor-wysiwyg');
      const vditorSV = document.querySelector('.vditor-sv');
      const vditorReset = document.querySelector('.vditor-reset');
      const appElement = document.getElementById('app');

      // 保存原始样式
      const elements = [appElement, vditorContainer, vditor, vditorContent, vditorIR, vditorWysiwyg, vditorSV, vditorReset].filter(Boolean);
      const originalStyles = elements.map(el => ({
        el,
        height: el.style.height,
        overflow: el.style.overflow,
        maxHeight: el.style.maxHeight,
        minHeight: el.style.minHeight,
        position: el.style.position,
        display: el.style.display,
        flex: el.style.flex,
        width: el.style.width
      }));

      // 强制展开内容
      elements.forEach(el => {
        el.style.height = 'auto';
        el.style.overflow = 'visible';
        el.style.maxHeight = 'none';
        el.style.minHeight = '0';
        el.style.position = 'static';
        if (el === appElement || el === vditorContainer) {
          el.style.display = 'block';
          el.style.flex = 'none';
        }
      });

      // 延迟执行打印，确保样式已应用
      setTimeout(() => {
        window.print();

        // 打印完成后恢复原始样式
        setTimeout(() => {
          originalStyles.forEach(({ el, height, overflow, maxHeight, minHeight, position, display, flex, width }) => {
            el.style.height = height;
            el.style.overflow = overflow;
            el.style.maxHeight = maxHeight;
            el.style.minHeight = minHeight;
            el.style.position = position;
            el.style.display = display;
            el.style.flex = flex;
            el.style.width = width;
          });
          // 恢复菜单显示
          document.querySelectorAll('.el-dropdown-menu').forEach(menu => {
            menu.style.display = '';
          });
          // 恢复页面标题
          document.title = originalTitle;
        }, 100);
      }, 100);
    },

    // 切换语言
    async switchLanguage(lang) {
      this.currentLang = lang;
      // 保存语言设置到 store
      await saveLanguage(lang);
      // 调用子组件的语言切换方法
      if (this.$refs.vditor) {
        this.$refs.vditor.switchLanguage(lang);
      }
    },

    // 初始化主题
    async initTheme() {
      const savedTheme = await getTheme();
      this.currentTheme = savedTheme;
      this.applyTheme(savedTheme);

      // 监听系统主题变化
      this._systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
      this._systemThemeHandler = () => {
        if (this.currentTheme === 'auto') {
          this.applyTheme('auto');
        }
      };
      this._systemThemeMedia.addEventListener('change', this._systemThemeHandler);
    },

    // 处理主题菜单命令（内部使用）
    handleThemeMenu(theme) {
      this.currentTheme = theme;
      this.applyTheme(theme);
      saveTheme(theme);
    },

    // 应用主题
    applyTheme(theme) {
      const isDark = theme === 'dark' || (theme === 'auto' && this.getSystemTheme() === 'dark');
      const html = document.documentElement;

      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }

      // 同步 Vditor 编辑器主题
      this.$refs.vditor?.setVditorTheme(isDark);
    },

    // 获取系统主题
    getSystemTheme() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    // 初始化视图设置
    async initViewSettings() {
      this.scrollRememberEnabled = await getScrollRememberEnabled()
      this.isZenMode = await getZenMode()
      // 初始化语言设置
      const savedLang = await getLanguage()
      if (savedLang && savedLang !== this.currentLang) {
        this.currentLang = savedLang
        this.$refs.vditor?.switchLanguage(savedLang)
      }
      // 通知子组件同步状态
      this.$refs.vditor?.setScrollRememberEnabled(this.scrollRememberEnabled)
      this.applyZenMode(this.isZenMode)
    },

    // 切换 Zen 模式
    async toggleZenMode(forceState = null) {
      const newState = forceState !== null ? forceState : !this.isZenMode
      this.isZenMode = newState
      await saveZenMode(newState)
      this.applyZenMode(newState)
      
      // 显示提示
      this.showZenTip = true
      if (this.zenTipTimer) clearTimeout(this.zenTipTimer)
      this.zenTipTimer = setTimeout(() => {
        this.showZenTip = false
      }, 2000)
    },

    // 应用 Zen 模式样式
    applyZenMode(isZen) {
      const appElement = document.getElementById('app')
      if (isZen) {
        appElement.classList.add('zen-mode')
        document.body.classList.add('zen-mode')
        // 通知 Vditor 组件进入 Zen 模式
        this.$refs.vditor?.toggleZenMode(true)
      } else {
        appElement.classList.remove('zen-mode')
        document.body.classList.remove('zen-mode')
        // 通知 Vditor 组件退出 Zen 模式
        this.$refs.vditor?.toggleZenMode(false)
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

/* 菜单项内容左对齐 + 统一高度 */
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

/* 菜单分组标题 */
.menu-group-title {
  padding: 8px 20px 4px;
  font-size: 12px;
  color: #909399;
  font-weight: 600;
  line-height: 1;
  user-select: none;
  pointer-events: none;
}

/* 语言标签 */
.language-label {
  font-size: 12px;
  color: #909399;
  margin-right: 4px;
  white-space: nowrap;
}

/* Zen 模式提示框 */
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

/* Zen 提示框入场动画 */
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

/* 深色主题下增强 Zen 提示框可见度 */
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

/* 夜间模式适配 */
</style>

<style>
/* 全局样式：统一所有下拉菜单宽度 */
.el-dropdown-menu {
  min-width: 200px !important;
}

/* 嵌套子菜单也保持相同宽度 */
.el-dropdown-menu .el-dropdown-menu {
  min-width: 200px !important;
}

/* 全局样式：强制所有下拉菜单项左对齐 + 统一高度 */
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

/* 专治嵌套子菜单——通过 popper-class 精准定位 */
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
