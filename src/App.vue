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
              <el-dropdown-item command="export">
                <span>{{ menuI18n.export }}</span>
                <span class="shortcut">{{ menuShortcuts.export }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 主题菜单 -->
        <el-dropdown trigger="click" @command="handleThemeMenu">
          <span class="menu-item">
            {{ menuTheme.label }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="auto">
                {{ menuTheme.auto }}
                <span v-if="currentTheme === 'auto'" class="theme-check">✓</span>
              </el-dropdown-item>
              <el-dropdown-item command="light">
                {{ menuTheme.light }}
                <span v-if="currentTheme === 'light'" class="theme-check">✓</span>
              </el-dropdown-item>
              <el-dropdown-item command="dark">
                {{ menuTheme.dark }}
                <span v-if="currentTheme === 'dark'" class="theme-check">✓</span>
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
        <span class="language-label">{{ menuI18n.language }}:</span>
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
  </div>
</template>

<script>
import MyVditor from './components/MyVditor.vue'
import menuI18nConfig from './config/menu-i18n.js'
import { ArrowDown } from '@element-plus/icons-vue'
import { getTheme, saveTheme } from './utils/store.js'

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
    }
  },
  computed: {
    // 当前语言的菜单翻译
    menuI18n() {
      return menuI18nConfig[this.currentLang]?.menu || menuI18nConfig.zh_CN.menu;
    },
    // 当前语言的快捷键文本
    menuShortcuts() {
      return menuI18nConfig[this.currentLang]?.shortcuts || menuI18nConfig.zh_CN.shortcuts;
    },
    // 当前语言的主题菜单文本
    menuTheme() {
      return menuI18nConfig[this.currentLang]?.theme || menuI18nConfig.zh_CN.theme;
    }
  },
  mounted() {
    // 添加全局键盘快捷键监听
    window.addEventListener('keydown', this.handleKeyboardShortcut);
    // 初始化主题
    this.initTheme();
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
        case 'export':
          this.$refs.vditor?.exportFile();
          break;
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

    // 处理主题菜单命令
    handleThemeMenu(command) {
      this.currentTheme = command;
      this.applyTheme(command);
      saveTheme(command);
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
    }
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

.shortcut {
  margin-left: 30px;
  font-size: 12px;
  color: #909399;
}

.menubar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-label {
  font-size: 13px;
  color: #606266;
}

.theme-check {
  margin-left: 20px;
  color: #409eff;
  font-weight: bold;
}
</style>
