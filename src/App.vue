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
              <NestedMenuItem :label="menuI18n.export">
                <el-dropdown-item @click="handleFileMenu('export-md')">
                  <span>{{ menuI18n.exportMd }}</span>
                  <span class="shortcut">{{ menuShortcuts.export }}</span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleFileMenu('export-pdf')">
                  <span>{{ menuI18n.exportPdf }}</span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleFileMenu('export-html')">
                  <span>{{ menuI18n.exportHtml }}</span>
                </el-dropdown-item>
              </NestedMenuItem>
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
              <!-- 语言子菜单 -->
              <NestedMenuItem :label="menuLanguage.label">
                <el-dropdown-item @click="handleAppearanceMenu('lang-zh_CN')">
                  {{ menuLanguage.chinese }}
                  <span v-if="currentLang === 'zh_CN'" class="theme-check">✓</span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleAppearanceMenu('lang-en_US')">
                  {{ menuLanguage.english }}
                  <span v-if="currentLang === 'en_US'" class="theme-check">✓</span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleAppearanceMenu('lang-ja_JP')">
                  {{ menuLanguage.japanese }}
                  <span v-if="currentLang === 'ja_JP'" class="theme-check">✓</span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleAppearanceMenu('lang-ko_KR')">
                  {{ menuLanguage.korean }}
                  <span v-if="currentLang === 'ko_KR'" class="theme-check">✓</span>
                </el-dropdown-item>
              </NestedMenuItem>
              <!-- 主题子菜单 -->
              <NestedMenuItem :label="menuTheme.label">
                <el-dropdown-item @click="handleAppearanceMenu('theme-auto')">
                  {{ menuTheme.auto }}
                  <span v-if="currentTheme === 'auto'" class="theme-check">✓</span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleAppearanceMenu('theme-light')">
                  {{ menuTheme.light }}
                  <span v-if="currentTheme === 'light'" class="theme-check">✓</span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleAppearanceMenu('theme-dark')">
                  {{ menuTheme.dark }}
                  <span v-if="currentTheme === 'dark'" class="theme-check">✓</span>
                </el-dropdown-item>
              </NestedMenuItem>
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
    </div>

    <!-- Vditor 编辑器 -->
    <MyVditor ref="vditor" />
  </div>
</template>

<script>
import MyVditor from './components/MyVditor.vue'
import NestedMenuItem from './components/NestedMenuItem.vue'
import { getI18nConfig } from './utils/i18n-helper.js'
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import { getTheme, saveTheme, getScrollRememberEnabled, saveScrollRememberEnabled } from './utils/store.js'

export default {
  name: 'App',
  components: {
    MyVditor,
    NestedMenuItem,
    ArrowDown,
    ArrowRight,
  },
  data() {
    return {
      currentLang: 'zh_CN',
      currentTheme: 'auto',
      scrollRememberEnabled: true, // 滚动记忆开关状态
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
    }
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
      }
    },
    
    // 处理外观菜单命令
    handleAppearanceMenu(command) {
      // 添加类型检查，防止 command 不是字符串
      if (typeof command !== 'string') {
        console.warn('[Appearance Menu] Invalid command type:', typeof command, command);
        return;
      }
      
      // 处理语言切换
      if (command.startsWith('lang-')) {
        const lang = command.replace('lang-', '');
        this.switchLanguage(lang);
      }
      // 处理主题切换
      else if (command.startsWith('theme-')) {
        const theme = command.replace('theme-', '');
        this.handleThemeMenu(theme);
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
    
    // 切换语言
    switchLanguage(lang) {
      this.currentLang = lang;
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
      // 通知子组件同步状态
      this.$refs.vditor?.setScrollRememberEnabled(this.scrollRememberEnabled)
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
