<template>
  <div class="vditor-container">
    <div :id="`vditor-${tabId}`" class="vditor"></div>
  </div>
</template>

<script async>
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import '../assets/vditor-custom.css'
import {ElMessageBox, ElNotification, ElMessage} from "element-plus"
import vditorConf from '../config/vditor-config.js'
import { getI18nConfig, getI18nText } from '../utils/i18n-helper.js'
// 导入系统组件
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getLastFilePath, saveLastFilePath, clearLastFilePath, clearScrollPosition } from '../utils/store.js'
import imagePathMapper from '../utils/image-path-mapper.js'
import { dirname } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { exportTo } from '../utils/export-lib.js'
import { createScrollMemoryManager } from '../utils/scroll-memory.js'
import modeSwitchListener from '../utils/mode-switch-listener.js'
import { checkUnsavedChanges } from '../utils/unsaved-check.js'
import { useTabStore } from '../stores/tabStore.js'
import { createFileWatcher } from '../composables/useFileWatcher.js'
import { isExternalContentChanged, normalizeDiskContentForCompare } from '../utils/file-content-compare.js'
import { replaceFileNamePlaceholder, getFileNameFromPath } from '../utils/string-helper.js'
// 导入工具函数
import { uploadFiles } from '../utils/file-upload.js'

// 日志级别控制（生产环境可关闭）
const DEBUG = import.meta.env.DEV;

export default {
  name: "MyVditor.vue",
  props: {
    tabId: { type: String, default: 'default' },
    initialFile: { type: String, default: null },
  },
  data() {
    return {
      vditor: '',
      welcome: '# ️ Welcome to use Tauri Markdown!',
      project_url: 'https://github.com/jeeinn/tauri-markdown',
      lang: 'zh_CN',
      // 静态资源 https://cn.vitejs.dev/guide/assets.html#the-public-directory
      cdn: '/vditor-cdn',
      // 文件状态追踪
      currentFilePath: null, // 当前打开的文件路径
      isContentModified: false, // 内容是否被修改
      originalContent: '', // 原始文件内容,用于对比
      isSaving: false, // 是否正在保存(防止保存过程中触发修改检测)
      externalChangeDialogOpen: false, // 外部变更对话框是否已打开
      externalChangeProcessing: false, // 外部变更处理中（防止并发重复弹窗）
      lastPromptedExternalContent: null, // 已提示过的外部磁盘内容（避免重复弹窗）
      fileMissing: false, // 磁盘文件已被外部删除
      fileWatcher: null, // 外部文件变更监听器
      _handleLinkClick: null, // 链接点击拦截处理函数
      // 滚动位置记忆管理器
      scrollMemory: null,
      // 主题状态跟踪
      isDarkTheme: false,
      // 模式切换监听器取消订阅函数
      _unsubscribeModeSwitch: null,
    };
  },
  computed: {
    // 获取当前语言的通知配置
    t() {
      return getI18nConfig(this.lang).notifications;
    },
    // 获取当前语言的窗口标题配置
    wt() {
      return getI18nConfig(this.lang).windowTitle;
    },
  },
  mounted() {
    this.fileWatcher = createFileWatcher()
    this.initVditor();

    // beforeunload 仅用于保存滚动位置(Tauri 窗口关闭由 onCloseRequested 处理)
    this._handleBeforeUnload = () => {
      this.scrollMemory?.flushScrollPosition()
    }
    window.addEventListener('beforeunload', this._handleBeforeUnload)
  },
  beforeUnmount() {
    // 销毁 Vditor 实例释放内存
    if (this.vditor) {
      this.vditor.destroy()
      this.vditor = ''
    }

    // 移除 beforeunload 监听器
    if (this._handleBeforeUnload) {
      window.removeEventListener('beforeunload', this._handleBeforeUnload)
      this._handleBeforeUnload = null
    }

    // 清理滚动记忆管理器
    this.scrollMemory?.destroy()

    // 停止外部文件监听
    this.fileWatcher?.stopWatch().catch(() => {})
    this.fileWatcher = null

    // 取消模式切换监听器订阅
    if (this._unsubscribeModeSwitch) {
      this._unsubscribeModeSwitch()
      this._unsubscribeModeSwitch = null
      
      if (DEBUG) {
        console.log('[Theme] 已取消主题模式切换订阅，当前订阅者数量:', modeSwitchListener.getSubscriberCount());
      }
    }
    
    // 清理链接点击拦截监听
    if (this._handleLinkClick) {
      const vditorEle = document.getElementById(`vditor-${this.tabId}`);
      if (vditorEle) {
        vditorEle.removeEventListener('click', this._handleLinkClick);
      }
      this._handleLinkClick = null;
    }
  },
  methods: {
    // ========== 语言切换 ==========

    // 切换语言
    switchLanguage(lang) {
      if (this.lang === lang) return;

      // 保存当前内容，防止 initVditor 重建后从磁盘加载丢失未保存编辑
      const savedContent = this.vditor ? this.vditor.getValue() : null
      const savedFilePath = this.currentFilePath
      const savedOriginal = this.originalContent
      const savedModified = this.isContentModified

      this.lang = lang;
      // 重新初始化 Vditor 以应用新的语言配置
      this.initVditor();

      // 重建后恢复内容（等待 after 回调完成后再恢复）
      if (savedContent !== null) {
        setTimeout(() => {
          if (this.vditor) {
            this.vditor.setValue(savedContent)
            this.currentFilePath = savedFilePath
            this.originalContent = savedOriginal
            this.isContentModified = savedModified
            this.updateWindowTitle()
          }
        }, 100)
      }
    },

    // ========== 链接拦截 ==========

    // 拦截文档内 http/https 链接点击，用系统默认浏览器打开
    async setupLinkClickHandler() {
      // 先清理旧监听器（语言切换会重建 Vditor 实例）
      if (this._handleLinkClick) {
        const oldEl = document.getElementById(`vditor-${this.tabId}`);
        if (oldEl) {
          oldEl.removeEventListener('click', this._handleLinkClick);
        }
        this._handleLinkClick = null;
      }

      // 动态导入 opener 插件
      let openUrl;
      try {
        const opener = await import('@tauri-apps/plugin-opener');
        openUrl = opener.openUrl;
      } catch (err) {
        console.error('[Link] 导入 opener 插件失败:', err);
        return;
      }

      const vditorEle = document.getElementById(`vditor-${this.tabId}`);
      if (!vditorEle) return;

      this._handleLinkClick = (e) => {
        let href = null;

        // 方式1: 标准 a 标签（预览模式、WYSIWYG 模式）
        const aTag = e.target.closest('a[href]');
        if (aTag) {
          href = aTag.getAttribute('href');
        }

        // 方式2: Vditor IR 模式 — 链接 URL 存在 .vditor-ir__marker--link 中
        if (!href) {
          const irNode = e.target.closest('[data-type="a"]');
          if (irNode) {
            const urlSpan = irNode.querySelector('.vditor-ir__marker--link');
            if (urlSpan) {
              href = urlSpan.textContent.trim();
            }
          }
        }

        if (href && /^https?:\/\//i.test(href)) {
          e.preventDefault();
          e.stopPropagation();
          if (DEBUG) console.log('[Link] 打开链接:', href);
          openUrl(href).then(() => {
            if (DEBUG) console.log('[Link] 链接已打开:', href);
          }).catch((err) => {
            console.error('[Link] 打开链接失败:', err);
          });
        }
      };

      vditorEle.addEventListener('click', this._handleLinkClick);
      console.log('[Link] 链接点击拦截已初始化');
    },

    // ========== 主题管理 ==========

    // 设置编辑器主题
    setVditorTheme(isDark) {
      if (!this.vditor) return;

      // 跟踪主题状态
      this.isDarkTheme = isDark;

      const theme = isDark ? 'dark' : 'classic';
      const contentTheme = isDark ? 'dark' : 'light';
      const codeTheme = isDark ? 'github-dark' : 'github';
      const contentThemePath = this.cdn + '/dist/css/content-theme';
      this.vditor.setTheme(theme, contentTheme, codeTheme, contentThemePath);
    },

    // 切换 Zen 模式(由父组件调用)
    toggleZenMode(isZen) {
      if (!this.vditor) return;

      const vditorEl = document.getElementById(`vditor-${this.tabId}`);
      if (!vditorEl) return;

      if (isZen) {
        vditorEl.classList.add('zen-mode-active');
      } else {
        vditorEl.classList.remove('zen-mode-active');
      }
    },

    // ========== Vditor 编辑器初始化 ==========

    // 初始化 Vditor 编辑器
    initVditor() {
      // 销毁现有实例
      if (this.vditor) {
        this.vditor.destroy();
      }

      // 快照当前 initialFile，防止 after 回调闭包读到 Vue 更新后的响应式值
      const snapshotInitialFile = this.initialFile;

      // 创建配置(注意:不使用 JSON 深拷贝,避免丢失函数类型配置)
      const vditorConfCopy = {
        options: {
          ...vditorConf.options,
          lang: this.lang,
          placeholder: this.welcome,
          cdn: this.cdn,
          toolbar: vditorConf.toolbar, // 明确传递 toolbar 配置
          // 添加空函数防止 Vditor 内部调用报错
          customWysiwygToolbar: () => {},
        },
      };

      // 设置自定义上传 handler
      vditorConfCopy.options.upload.handler = async (files) => {
        const result = await uploadFiles(files, {
          currentFilePath: this.currentFilePath,
          i18n: this.t
        });

        // 根据文件类型插入不同的 Markdown 语法
        if (result?.[0]?.data?.succMap) {
          for (const [name, entry] of Object.entries(result[0].data.succMap)) {
            const md = entry.isImage ? `![${name}](${entry.url})` : `[${name}](${entry.url})`;
            this.vditor.insertValue(md + '\n');
          }
          this.checkContentModified();
        }

        return result;
      };

      vditorConfCopy.options.after = () => {
        this.observeContentChange();
        
        // 初始化滚动记忆管理器
        if (!this.scrollMemory) {
          this.scrollMemory = createScrollMemoryManager(
            () => this.vditor,
            {
              getCurrentFilePath: () => this.currentFilePath,
              onScrollChange: (pct) => {
                // 同步滚动位置到 tab store，使 persistTabs 能保存正确的 scrollPosition
                try {
                  const tabStore = useTabStore()
                  tabStore.updateTab(this.tabId, { scrollPosition: pct })
                } catch { /* store 未初始化时忽略 */ }
              },
            }
          )
        }
        
        this.scrollMemory.setupScrollListener();
        this.scrollMemory.setupEditModeListener();
        
        // 设置主题模式切换监听器（只需订阅一次）
        this.setupThemeModeSwitchListener();
        
        // 语言切换后重新应用主题（因为 Vditor 实例被重建）
        // 从 DOM 检测当前实际主题状态，避免因 isDarkTheme 默认值错误导致主题不一致
        const actuallyDark = document.documentElement.classList.contains('dark')
        this.isDarkTheme = actuallyDark
        this.setVditorTheme(actuallyDark);

        // 初始化后加载文件
        // 使用 initVditor 时的快照值，而非响应式 prop，避免 Vue 更新时误触发
        if (snapshotInitialFile) {
          this.loadFileByPath(snapshotInitialFile);
        } else if (this.tabId === 'default') {
          // 单文档模式（tabId 为默认值）：自动加载上次打开的文件
          this.autoLoadLastFile();
        }
        // 多标签模式的空白标签（initialFile=null, tabId=uuid）：保持空白
        // 初始化窗口标题
        this.updateWindowTitle();
        // 设置链接点击拦截（用系统默认浏览器打开 http/https 链接）
        this.setupLinkClickHandler();
      };

      // 创建新实例
      this.vditor = new Vditor(`vditor-${this.tabId}`, vditorConfCopy.options);
    },

    // ========== 内容监听 ==========

    // 监听编辑器内容变化(支持多种模式)
    observeContentChange() {
      if (this.vditor && this.vditor.vditor) {
        // IR 模式
        if (this.vditor.vditor.ir && this.vditor.vditor.ir.element) {
          this.vditor.vditor.ir.element.addEventListener('input', () => {
            this.checkContentModified()
          })
        }
        // SV 模式
        if (this.vditor.vditor.sv && this.vditor.vditor.sv.element) {
          this.vditor.vditor.sv.element.addEventListener('input', () => {
            this.checkContentModified()
          })
        }
        // WYSIWYG 模式
        if (this.vditor.vditor.wysiwyg && this.vditor.vditor.wysiwyg.element) {
          this.vditor.vditor.wysiwyg.element.addEventListener('input', () => {
            this.checkContentModified()
          })
        }
      }
    },

    // ========== 文件管理 ==========

    /**
     * 同步当前文件路径到 Pinia tab store
     * 使 TabBar 中的标签标题能动态显示文件名
     * @param {string|null} filePath
     * @param {boolean} [contentModified] - 如传入则同时同步修改状态
     */
    syncFilePathToTab(filePath, contentModified) {
      try {
        const tabStore = useTabStore()
        const patch = { filePath }
        if (contentModified !== undefined) {
          patch.contentModified = contentModified
        }
        if (filePath) {
          patch.fileMissing = false
        }
        tabStore.updateTab(this.tabId, patch)
      } catch {
        // store 未初始化时忽略
      }
    },

    patchTab(patch) {
      try {
        useTabStore().updateTab(this.tabId, patch)
      } catch {
        // store 未初始化时忽略
      }
    },

    // 检查内容是否被修改
    checkContentModified() {
      if (!this.vditor) return

      // 如果正在保存,跳过检查
      if (this.isSaving) {
        console.log('[DEBUG] 正在保存中,跳过内容修改检测')
        return
      }

      const currentContent = this.vditor.getValue()
      const wasModified = this.isContentModified
      this.isContentModified = currentContent !== this.originalContent

      // 同步修改状态到 Pinia tab store
      try {
        const tabStore = useTabStore()
        tabStore.updateTab(this.tabId, { contentModified: this.isContentModified })
      } catch {
        // store 未初始化时忽略（如测试环境）
      }

      // 调试日志:只在状态变化时输出
      if (wasModified !== this.isContentModified) {
        console.log('[DEBUG] 内容修改状态变化:', this.isContentModified ? '已修改' : '未修改')
        // 更新窗口标题(添加/移除修改标记)
        this.updateWindowTitle()
      }
    },

    // 更新窗口标题
    async updateWindowTitle() {
      try {
        const window = getCurrentWindow();
        const { appName, untitled, modifiedMarker } = this.wt;
        let title = appName;

        if (this.currentFilePath) {
          // 有打开的文件
          const fileName = this.currentFilePath.split('\\').pop() || this.currentFilePath.split('/').pop();
          title = this.isContentModified ? `${appName} - ${modifiedMarker} ${fileName}` : `${appName} - ${fileName}`;
        } else {
          // 新建文件,未保存
          title = this.isContentModified ? `${appName} - ${modifiedMarker} ${untitled}` : `${appName} - ${untitled}`;
        }

        await window.setTitle(title);
        console.log('[Title] 窗口标题已更新:', title);
      } catch (error) {
        console.error('[Title] 更新窗口标题失败:', error);
      }
    },

    // 清除当前文件状态
    async clearCurrentFile() {
      const oldFilePath = this.currentFilePath

      await this.fileWatcher?.stopWatch()

      this.currentFilePath = null
      this.originalContent = ''
      this.isContentModified = false
      this.lastPromptedExternalContent = null
      this.fileMissing = false

      // 同步文件路径到 tab store（清空）
      this.patchTab({ filePath: null, fileMissing: false })

      // 清除 store 中的记录
      await clearLastFilePath()

      // 清除该文件的滚动位置记录
      if (oldFilePath) {
        await clearScrollPosition(oldFilePath)
      }

      // 更新窗口标题
      await this.updateWindowTitle()
    },

    // 显示文件冲突对话框（保存时覆盖外部修改）
    async showFileConflictDialog(filePath) {
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
      try {
        await ElMessageBox.confirm(
          replaceFileNamePlaceholder(this.t.fileConflict.message, fileName),
          this.t.fileConflict.title,
          {
            confirmButtonText: this.t.fileConflict.confirmButtonText,
            cancelButtonText: this.t.fileConflict.cancelButtonText,
            type: 'warning',
            distinguishCancelAndClose: true
          }
        )
        return true
      } catch (error) {
        // 用户取消操作
        return false
      }
    },

    // 显示外部文件变更对话框（是否重新加载）
    async showExternalChangeDialog(filePath) {
      const fileName = getFileNameFromPath(filePath)
      const i18n = this.t.fileExternalChange
      const messageKey = this.isContentModified ? 'messageWithUnsaved' : 'message'
      try {
        await ElMessageBox.confirm(
          replaceFileNamePlaceholder(i18n[messageKey], fileName),
          i18n.title,
          {
            confirmButtonText: i18n.confirmButtonText,
            cancelButtonText: i18n.cancelButtonText,
            type: 'warning',
            distinguishCancelAndClose: true,
          }
        )
        return true
      } catch {
        return false
      }
    },

    /**
     * 为当前打开的文件启动外部变更监听
     * @param {string} filePath
     */
    async setupFileWatcher(filePath) {
      if (!this.fileWatcher || !filePath) return

      try {
        await this.fileWatcher.startWatch(filePath, {
          shouldIgnore: () => (
            this.isSaving
            || this.externalChangeDialogOpen
            || this.externalChangeProcessing
          ),
          onChange: (event) => this.handleExternalFileChange(event),
        })
      } catch (error) {
        console.error('[FileWatcher] 启动文件监听失败:', error)
      }
    },

    /**
     * 处理外部文件变更事件
     * @param {{ type: 'modified'|'deleted', filePath: string }} event
     */
    async handleExternalFileChange(event) {
      const { type, filePath } = event

      if (this.externalChangeDialogOpen || this.externalChangeProcessing) return
      if (this.isSaving) return
      if (this.currentFilePath !== filePath) return

      if (type === 'deleted') {
        await this.fileWatcher?.stopWatch()
        this.fileMissing = true
        this.patchTab({ fileMissing: true })
        const fileName = getFileNameFromPath(filePath)
        ElNotification.warning({
          title: this.t.fileExternalDeleted.title,
          message: replaceFileNamePlaceholder(this.t.fileExternalDeleted.message, fileName),
          duration: 5000,
        })
        return
      }

      this.externalChangeProcessing = true
      try {
        let diskContent
        try {
          diskContent = await readTextFile(filePath)
        } catch (error) {
          console.error('[FileWatcher] 读取磁盘文件失败:', error)
          return
        }

        const normalizedDisk = normalizeDiskContentForCompare(diskContent)
        if (normalizedDisk === this.originalContent) {
          return
        }
        if (normalizedDisk === this.lastPromptedExternalContent) {
          return
        }

        // 同步占用该外部版本，避免快速连续保存时重复弹窗
        this.lastPromptedExternalContent = normalizedDisk

        this.externalChangeDialogOpen = true
        try {
          const confirmed = await this.showExternalChangeDialog(filePath)
          if (!confirmed) return

          this.lastPromptedExternalContent = null
          this.fileWatcher?.suppressEvents()
          const loaded = await this.loadFileByPath(filePath)
          if (!loaded) {
            ElNotification.error(this.t.openFile.readError)
          }
        } finally {
          this.externalChangeDialogOpen = false
        }
      } finally {
        this.externalChangeProcessing = false
      }
    },

    async autoLoadLastFile() {
      try {
        // 外部打开的文件由 App.vue 统一处理（take_opened_file / open-external-file 事件）
        console.log('[DEBUG] 开始自动加载上次文件...')
        await invoke('log_message', { msg: 'autoLoadLastFile: loading last file from store' });
        const lastFilePath = await getLastFilePath()
        console.log('[DEBUG] 从 store 获取的文件路径:', lastFilePath)
        await invoke('log_message', { msg: `autoLoadLastFile: lastFilePath from store: ${lastFilePath}` });

        if (!lastFilePath) {
          console.log('[DEBUG] 没有上次打开的文件记录')
          return
        }

        // 检查 Vditor 是否已初始化
        if (!this.vditor) {
          console.error('[ERROR] Vditor 未初始化')
          return
        }

        // 检查文件是否存在
        console.log('[DEBUG] 检查文件是否存在:', lastFilePath)
        const fileExists = await exists(lastFilePath)
        if (!fileExists) {
          console.log('[DEBUG] 文件不存在,清除记录')
          await this.clearCurrentFile()
          ElNotification.info({
            title: this.t.autoLoad.fileNotExist.title,
            message: this.t.autoLoad.fileNotExist.message,
            duration: 3000
          })
          return
        }

        await this.loadFileByPath(lastFilePath)

        // 窗口标题已显示文件名，无需额外通知
        // const fileName = lastFilePath.split('\\').pop() || lastFilePath.split('/').pop()
        // ElNotification.success({
        //   title: this.t.autoLoad.success.title,
        //   message: fileName,
        //   duration: 2000
        // })
      } catch (error) {
        console.error('[ERROR] 自动加载上次文件失败:', error)
        console.error('[ERROR] 错误详情:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
        await this.clearCurrentFile()
      }
    },

    // 根据路径加载文件(供 autoLoadLastFile / openMdFile / 打开方式 共用)
    async loadFileByPath(filePath) {
      await invoke('log_message', { msg: `loadFileByPath: ${filePath}` });

      if (!this.vditor) {
        console.error('[ERROR] Vditor 未初始化')
        await invoke('log_message', { msg: 'loadFileByPath: Vditor not initialized!' });
        return false
      }

      const fileExists = await exists(filePath)
      if (!fileExists) {
        ElNotification.error(this.t.openFile.notExist)
        await invoke('log_message', { msg: `loadFileByPath: file not exists: ${filePath}` });
        return false
      }

      const data = await readTextFile(filePath)

      const baseDir = await dirname(filePath);

      await invoke('set_current_dir', { dir: baseDir });

      const convertedContent = imagePathMapper.convertToAssetUrl(data);
      console.log('[Load] 已转换相对路径为 tmd URL');

      // 切换文件前保存当前文件的滚动位置
      this.scrollMemory?.saveCurrentScrollPosition()

      this.vditor.setValue(convertedContent)

      this.currentFilePath = filePath
      // 保存转换后的内容作为基准，确保 checkContentModified 比较的是同一种格式
      this.originalContent = convertedContent
      this.isContentModified = false
      this.lastPromptedExternalContent = null
      this.fileMissing = false

      // 同步文件路径和修改状态到 tab store
      this.syncFilePathToTab(filePath, false)

      await saveLastFilePath(filePath)
      await this.updateWindowTitle()

      // 恢复滚动位置：单文档模式直接恢复，多标签模式仅恢复当前激活标签
      if (this.tabId === 'default') {
        // 单文档模式
        this.scrollMemory?.restoreScrollPosition(filePath)
      } else {
        // 多标签模式：仅激活标签立即恢复，其他标签切换时再恢复
        try {
          const tabStore = useTabStore()
          if (tabStore.activeTabId === this.tabId) {
            this.scrollMemory?.restoreScrollPosition(filePath)
          }
        } catch {
          this.scrollMemory?.restoreScrollPosition(filePath)
        }
      }

      await invoke('log_message', { msg: `loadFileByPath: success, file loaded: ${filePath}` });
      await this.setupFileWatcher(filePath)
      return true
    },
    // 新建空白文档
    async newFile() {
      // 如果当前有未保存的修改,提示用户
      const result = await checkUnsavedChanges(this.isContentModified, this.t.newFile.unsavedChanges)
      if (result === 'cancel') return false

      // 清空编辑器内容
      this.vditor.setValue('')

      // 切换文件前保存当前文件的滚动位置
      this.scrollMemory?.saveCurrentScrollPosition()

      // 清除文件状态
      await this.clearCurrentFile()

      console.log('[New] 已创建新空白文档')
      return true
    },
    async openMdFile() {
      // 如果当前有未保存的修改,提示用户
      const result = await checkUnsavedChanges(this.isContentModified, this.t.openFile.unsavedChanges)
      if (result === 'cancel') return false

      const filePath = await open({
        filters: [{
          name: 'OpenFile',
          extensions: ['md', 'txt']
        }]
      })
      if (filePath == null) {
        ElNotification.error(this.t.openFile.pathError)
        return false
      }
      try {
        const success = await this.loadFileByPath(filePath)
        if (!success) return false
        // 打开成功不再提示，避免频繁打扰用户
      } catch (error) {
        console.error('文件读取失败:', error)
        ElNotification.error(this.t.openFile.readError)
        return false
      }
    },
    async saveMdFile() {
      let filePath = this.currentFilePath

      // 如果没有当前文件路径,弹出保存对话框
      if (!filePath) {
        console.log('[DEBUG] 没有当前文件路径,弹出保存对话框')
        filePath = await save({
          filters: [{
            name: 'MarkDownFile',
            extensions: ['md']
          }]
        })
        if (filePath == null) {
          ElNotification.error(this.t.saveFile.pathError)
          return false
        }
        console.log('[DEBUG] 用户选择的保存路径:', filePath)
      } else {
        console.log('[DEBUG] 使用当前文件路径:', filePath)
      }

      try {
        // 设置保存标志,防止保存过程中触发修改检测
        this.isSaving = true

        // 检查内容是否有修改
        let currentContent = this.vditor.getValue()

        // 使用工具模块将 tmd URL 转换为相对路径(保存前处理)
        currentContent = imagePathMapper.convertToRelative(currentContent);
        console.log('[Save] 已转换 tmd URL 为相对路径');

        if (!this.isContentModified && this.originalContent !== '' && !this.fileMissing) {
          // 内容未修改,提示用户（磁盘文件已删除时允许在原路径重建）
          this.isSaving = false
          ElMessage.info({
            message: this.t.saveFile.notModified.message,
            duration: 1500
          })
          return true
        }

        // 如果文件已存在,检查是否被外部修改
        const fileExists = await exists(filePath)
        if (fileExists && this.currentFilePath === filePath) {
          // 读取当前磁盘上的文件内容
          const diskContent = await readTextFile(filePath)

          // 统一转换格式后再比较，避免相对路径图片导致误判
          if (isExternalContentChanged(diskContent, this.originalContent)) {
            const confirmed = await this.showFileConflictDialog(filePath)
            if (!confirmed) {
              this.isSaving = false
              return false
            }
          }
        }

        // 执行保存（写入前抑制 watch，避免自身保存触发外部变更提示）
        console.log('[DEBUG] 开始保存文件到:', filePath)
        this.fileWatcher?.suppressEvents()
        await writeTextFile(filePath, currentContent)
        this.fileWatcher?.suppressEvents()

        // 立即更新状态(在显示通知之前)
        this.currentFilePath = filePath
        this.fileMissing = false
        // 用编辑器当前内容（convertToAssetUrl 格式）作为基准，确保后续比较格式一致
        this.originalContent = this.vditor.getValue()
        this.isContentModified = false

        // 同步文件路径和修改状态到 tab store，使标签标题动态更新并移除 * 标记
        this.syncFilePathToTab(filePath, false)

        // 保存到 store
        await saveLastFilePath(filePath)

        // Save As 或首次保存后启动外部变更监听
        await this.setupFileWatcher(filePath)

        // 清除保存标志
        this.isSaving = false
        console.log('[DEBUG] 文件保存成功,状态已更新')

        // 更新窗口标题(移除修改标记)
        await this.updateWindowTitle()

        const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
        ElMessage.success({
          message: `${this.t.saveFile.success.title}: ${fileName}`,
          duration: 1500
        })
        return true
      } catch (error) {
        // 确保在错误时也清除保存标志
        this.isSaving = false
        console.error('[ERROR] 文件保存失败:', error)
        ElNotification.error(this.t.saveFile.saveError)
        return false
      }
    },
    async exportFile() {
      const result = await checkUnsavedChanges(this.isContentModified, this.t.exportFile.unsavedChanges)
      if (result === 'cancel') return false

      try {
        let content = this.vditor.getValue()
        if (!content.trim()) {
          ElNotification.warning({
            title: this.t.exportFile.emptyContent.title,
            message: this.t.exportFile.emptyContent.message,
            duration: 2000
          })
          return false
        }

        content = imagePathMapper.convertToRelative(content)
        const filePath = await save({
          filters: [{ name: 'MarkDownFile', extensions: ['md'] }]
        })
        if (!filePath) {
          ElNotification.error(this.t.exportFile.pathError)
          return false
        }

        await writeTextFile(filePath, content)
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
        ElNotification.success({ title: this.t.exportFile.success.title, message: fileName, duration: 2000 })
        return true
      } catch (error) {
        ElNotification.error(this.t.exportFile.exportError)
        return false
      }
    },

    /**
     * 通用导出处理（PDF / HTML）
     * @param {'pdf'|'html'} type - 导出类型
     */
    async _handleExport(type) {
      const result = await checkUnsavedChanges(this.isContentModified, this.t.exportFile.unsavedChanges)
      if (result === 'cancel') return false

      const config = this.t[type === 'pdf' ? 'exportPdf' : 'exportHtml']
      const exportResult = await exportTo(type, this, {
        onStart: () => {
          // 导出开始时显示加载提示，让用户有感知
          ElNotification.info({ title: config.converting.title, message: config.converting.message, duration: 0 })
        },
        onProgress: (current, total) => {
          if (current === 0) {
            ElNotification.closeAll()
            ElNotification.info({ title: config.processingImages.title, message: config.processingImages.message.replace('{count}', total), duration: 0 })
          } else if (current < total) {
            ElNotification.closeAll()
            ElNotification.info({ title: config.processingImages.title, message: config.imageProgress.message.replace('{current}', current).replace('{total}', total), duration: 0 })
          }
        },
      })

      ElNotification.closeAll()
      if (exportResult.success) {
        ElNotification.success({ title: config.success.title, message: config.fileSaved, duration: 3000 })
      } else if (exportResult.error) {
        ElNotification.error({ title: config.exportError?.title, message: exportResult.error.message, duration: 3000 })
      }
      return exportResult.success
    },

    async exportPdf() { return this._handleExport('pdf') },

    async exportHtml() { return this._handleExport('html') },
    async printPage() {
      const result = await exportTo('print', this)
      return result.success
    },
    async showAbout() {
      // 获取应用版本号
      let appVersion = '未知版本';
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        appVersion = await getVersion();
      } catch (error) {
        console.error('[About] 获取版本号失败:', error);
      }

      ElMessageBox.alert(
          '&nbsp;&nbsp;&nbsp;&nbsp;' +
          `<div style="text-align: center; margin-bottom: 15px;">` +
          `<strong style="font-size: 16px;">Tauri Markdown v${appVersion}</strong>` +
          `</div>` +
          '这是基于开源项目开发的一个本地 Markdown 写作工具,可以跨平台使用(Windows、macOS、Linux) <br/>' +
          '项目主页👉 <a target="_blank" href="https://github.com/jeeinn/tauri-markdown">github.com/jeeinn/tauri-markdown</a><br/>' +
          '鸣谢🙏 (右键可复制链接)<br/>' +
          '<a target="_blank" href="https://tauri.app">Tauri</a> 、' +
          '<a target="_blank" href="https://b3log.org/vditor/">Vditor</a> 、' +
          '<a target="_blank" href="https://element-plus.org">Element Plus</a> <br/>' +
          '<br/>' +
          'Released under the <a target="_blank" href="https://opensource.org/licenses/MIT">MIT License</a> <br/>' +
          'Made by 💗 <a target="_blank" href="https://jeeinn.com">JeeInn</a>',
          this.t.about.title,
          {
            dangerouslyUseHTMLString: true
          });
    },
    
    openWindow(url) {
      new WebviewWindow('theUniqueLabel', {
        url: url
      })
    },

    // ========== 滚动位置记忆 ==========

    /**
     * 设置滚动记忆开关状态(由父组件调用)
     * @param {boolean} enabled - 是否启用
     */
    setScrollRememberEnabled(enabled) {
      if (this.scrollMemory) {
        this.scrollMemory.setEnabled(enabled)
      }
    },

    /**
     * 恢复当前文件的滚动位置（由父组件在切换标签时调用）
     */
    restoreScrollPosition() {
      if (this.scrollMemory && this.currentFilePath) {
        this.scrollMemory.restoreScrollPosition(this.currentFilePath)
      }
    },

    /**
     * 获取当前 Vditor 的编辑区域 DOM 元素（供 FindReplace 使用）
     * @returns {HTMLElement|null}
     */
    getEditorElement() {
      const vditorEle = document.getElementById(`vditor-${this.tabId}`)
      if (!vditorEle) return null
      return vditorEle.querySelector('.vditor-ir')
        || vditorEle.querySelector('.vditor-sv')
        || vditorEle.querySelector('.vditor-wysiwyg')
    },

    // ========== 主题管理 ==========

    /**
     * 设置模式切换事件监听器，用于重新应用主题
     * 只在首次调用时订阅，避免重复订阅导致内存泄漏
     */
    setupThemeModeSwitchListener() {
      if (!this._unsubscribeModeSwitch) {
        this._unsubscribeModeSwitch = modeSwitchListener.subscribe(async (newMode, oldMode) => {
          if (DEBUG) {
            console.log('[Theme] 模式切换完成，重新应用主题:', oldMode, '->', newMode);
          }
          // 重新应用主题
          this.setVditorTheme(this.isDarkTheme);
        });
        
        if (DEBUG) {
          console.log('[Theme] 已订阅模式切换事件，当前订阅者数量:', modeSwitchListener.getSubscriberCount());
        }
      }
    },
  },
}
</script>