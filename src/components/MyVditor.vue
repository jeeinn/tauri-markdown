<template>
  <div class="vditor-container">
    <div id="vditorEle" class="vditor"></div>
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

<script async>
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import '../assets/vditor-custom.css'
import {ElMessageBox, ElNotification, ElMessage} from "element-plus"
import vditorConf from '../config/vditor-config.js'
import { getI18nConfig, getI18nText } from '../utils/i18n-helper.js'
// 导入系统组件
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, writeFile, exists, mkdir, remove } from '@tauri-apps/plugin-fs'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getLastFilePath, saveLastFilePath, clearLastFilePath, clearScrollPosition } from '../utils/store.js'
import imagePathMapper from '../utils/image-path-mapper.js'
import { dirname, join, normalize, tempDir } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { exportTo } from '../utils/export-lib.js'
import { createScrollMemoryManager } from '../utils/scroll-memory.js'
import modeSwitchListener from '../utils/mode-switch-listener.js'
import { checkUnsavedChanges } from '../utils/unsaved-check.js'
// 导入 composables
import { useDragDrop } from '../composables/useDragDrop.js'
// 导入工具函数
import { calculateFileHash, isImageFile } from '../utils/file-utils.js'
// 导入图床配置
import { getImageHostConfig, uploadToImageHost, uploadToSMMS } from '../utils/image-host-config.js'

// 日志级别控制（生产环境可关闭）
const DEBUG = import.meta.env.DEV;

export default {
  name: "MyVditor.vue",
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
      _unlistenCloseRequest: null, // 窗口关闭事件取消监听函数
      // 滚动位置记忆管理器
      scrollMemory: null,
      // 主题状态跟踪
      isDarkTheme: false,
      // 模式切换监听器取消订阅函数
      _unsubscribeModeSwitch: null,
      // 拖拽文件管理器（在 mounted 中初始化）
      dragDropManager: null,
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
    // 拖拽提示文本
    dropHintText() {
      return getI18nText(this.lang, 'dragDrop.hint');
    }
  },
  mounted() {
    this.initVditor();

    // beforeunload 仅用于保存滚动位置(Tauri 窗口关闭由 onCloseRequested 处理)
    window.addEventListener('beforeunload', () => {
      this.scrollMemory?.flushScrollPosition()
    })

    // 初始化 Tauri 窗口关闭拦截
    this.setupWindowCloseHandler();

    // 初始化拖拽文件管理器
    this.dragDropManager = useDragDrop(
      (filePath) => this.loadFileByPath(filePath),
      () => this.lang  // 传入 getter 函数，确保语言切换时获取最新值
    );
    
    this.dragDropManager.setupDragDrop();
  },
  beforeUnmount() {
    // 清理滚动记忆管理器
    this.scrollMemory?.destroy()
    
    // 取消模式切换监听器订阅
    if (this._unsubscribeModeSwitch) {
      this._unsubscribeModeSwitch()
      this._unsubscribeModeSwitch = null
      
      if (DEBUG) {
        console.log('[Theme] 已取消主题模式切换订阅，当前订阅者数量:', modeSwitchListener.getSubscriberCount());
      }
    }
    
    // 清理窗口关闭事件监听
    if (this._unlistenCloseRequest) {
      this._unlistenCloseRequest();
      this._unlistenCloseRequest = null;
    }

    // 清理拖拽文件管理器
    if (this.dragDropManager) {
      this.dragDropManager.cleanup();
    }
  },
  methods: {
    // ========== 语言切换 ==========

    // 切换语言
    switchLanguage(lang) {
      if (this.lang === lang) return;

      this.lang = lang;
      // 重新初始化 Vditor 以应用新的语言配置
      this.initVditor();
    },

    // ========== 窗口管理 ==========

    // 初始化窗口关闭拦截
    async setupWindowCloseHandler() {
      try {
        const appWindow = getCurrentWindow();
        this._unlistenCloseRequest = await appWindow.onCloseRequested(async (event) => {
          // 检查是否有未保存的修改
          if (this.isContentModified) {
            // 阻止默认关闭行为
            event.preventDefault();

            try {
              // 显示保存提示对话框，使用三按钮模式
              const result = await checkUnsavedChanges(
                this.isContentModified,
                this.t.closeWindow.unsavedChanges,
                true // 显示三个按钮
              );

              // 根据用户选择执行不同操作
              if (result === 'discard') {
                // 用户选择"不保存"，直接关闭窗口
                await appWindow.destroy();
              } else if (result === 'save') {
                // 用户点击"保存并关闭",执行保存
                const saved = await this.saveMdFile();
                if (saved) {
                  // 保存成功,关闭窗口
                  await appWindow.destroy();
                }
                // 如果保存失败,窗口保持打开
              }
              // 如果用户点击"取消"或关闭对话框，窗口保持打开(不做任何操作)
            } catch {
              // 用户点击"取消"或关闭对话框，窗口保持打开(不做任何操作)
            }
          } else {
            // 没有未保存的修改,关闭前保存滚动位置
            this.scrollMemory?.flushScrollPosition();
          }
        });
        console.log('[WindowClose] 窗口关闭拦截已初始化');
      } catch (error) {
        console.error('[WindowClose] 初始化窗口关闭拦截失败:', error);
      }
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

      const vditorEl = document.getElementById('vditorEle');
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
        const result = await this.handleUpload(files);

        // 根据文件类型插入不同的 Markdown 语法
        if (result && result[0] && result[0].data && result[0].data.succMap) {
          const succMap = result[0].data.succMap;
          for (const [originalName, entry] of Object.entries(succMap)) {
            let markdown;
            if (entry.isImage) {
              markdown = `![${originalName}](${entry.url})`;
            } else {
              markdown = `[${originalName}](${entry.url})`;
            }
            this.vditor.insertValue(markdown + '\n');
            console.log('[Upload] 插入 Markdown:', markdown);
          }
          // insertValue 不会触发 input 事件,需要手动检查内容修改状态
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
              // 注意：不再使用 onAfterModeChange，改为直接使用 modeSwitchListener
            }
          )
        }
        
        this.scrollMemory.setupScrollListener();
        this.scrollMemory.setupEditModeListener();
        
        // 设置主题模式切换监听器（只需订阅一次）
        this.setupThemeModeSwitchListener();
        
        // 语言切换后重新应用主题（因为 Vditor 实例被重建）
        this.setVditorTheme(this.isDarkTheme);
        
        this.autoLoadLastFile();
        // 初始化窗口标题
        this.updateWindowTitle();
      };

      // 创建新实例
      this.vditor = new Vditor('vditorEle', vditorConfCopy.options);
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
      }
    },

    // ========== 文件管理 ==========

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

      this.currentFilePath = null
      this.originalContent = ''
      this.isContentModified = false

      // 清除 store 中的记录
      await clearLastFilePath()

      // 清除该文件的滚动位置记录
      if (oldFilePath) {
        await clearScrollPosition(oldFilePath)
      }

      // 更新窗口标题
      await this.updateWindowTitle()
    },

    // 显示文件冲突对话框
    async showFileConflictDialog(filePath) {
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
      try {
        await ElMessageBox.confirm(
          this.t.fileConflict.message.replace('{fileName}', fileName),
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

    async autoLoadLastFile() {
      try {
        // 优先处理通过“打开方式”传入的文件(由 Rust 端通过 command 获取)
        const openedFile = await invoke('take_opened_file');
        await invoke('log_message', { msg: `autoLoadLastFile: take_opened_file returned: ${openedFile}` });
        if (openedFile) {
          console.log('[DEBUG] 检测到通过打开方式传入的文件:', openedFile);
          const success = await this.loadFileByPath(openedFile);
          await invoke('log_message', { msg: `autoLoadLastFile: loadFileByPath(${openedFile}) => ${success}` });
          return;
        }

        console.log('[DEBUG] 开始自动加载上次文件...')
        await invoke('log_message', { msg: 'autoLoadLastFile: no opened file, loading last file from store' });
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
      this.originalContent = data
      this.isContentModified = false

      await saveLastFilePath(filePath)
      await this.updateWindowTitle()

      // 加载新文件后恢复滚动位置
      this.scrollMemory?.restoreScrollPosition(filePath)

      await invoke('log_message', { msg: `loadFileByPath: success, file loaded: ${filePath}` });
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

        const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
        ElNotification.info({
          title: this.t.openFile.success.title,
          message: fileName,
          duration: 1000
        })
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

        if (!this.isContentModified && this.originalContent !== '') {
          // 内容未修改,提示用户
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

          // 如果磁盘内容与原始内容不同,说明文件被外部修改
          if (diskContent !== this.originalContent) {
            const confirmed = await this.showFileConflictDialog(filePath)
            if (!confirmed) {
              this.isSaving = false
              return false
            }
          }
        }

        // 执行保存
        console.log('[DEBUG] 开始保存文件到:', filePath)
        await writeTextFile(filePath, currentContent)

        // 立即更新状态(在显示通知之前)
        this.currentFilePath = filePath
        this.originalContent = currentContent
        this.isContentModified = false

        // 保存到 store
        await saveLastFilePath(filePath)

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
      // 如果当前有未保存的修改,提示用户
      const result = await checkUnsavedChanges(this.isContentModified, this.t.exportFile.unsavedChanges)
      if (result === 'cancel') return false

      try {
        let content = this.vditor.getValue()

        // 检查内容是否为空
        if (!content.trim()) {
          ElNotification.warning({
            title: this.t.exportFile.emptyContent.title,
            message: this.t.exportFile.emptyContent.message,
            duration: 2000
          })
          return false
        }

        // 使用工具模块将 tmd URL 转换为相对路径（导出前处理）
        content = imagePathMapper.convertToRelative(content);
        console.log('[Export] 已转换 tmd URL 为相对路径');

        // 打开保存对话框
        const filePath = await save({
          filters: [{
            name: 'MarkDownFile',
            extensions: ['md']
          }]
        })

        if (!filePath) {
          ElNotification.error(this.t.exportFile.pathError)
          return false
        }

        console.log('[DEBUG] 开始导出文件到:', filePath)
        await writeTextFile(filePath, content)

        const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
        ElMessage.success({
          message: `${this.t.exportFile.success.title}: ${fileName}`,
          duration: 2000
        })
        return true
      } catch (error) {
        console.error('[ERROR] 文件导出失败:', error)
        ElNotification.error(this.t.exportFile.exportError)
        return false
      }
    },

    async exportPdf() {
      const result = await checkUnsavedChanges(this.isContentModified, this.t.exportFile.unsavedChanges)
      if (result === 'cancel') return false

      const pdfConfig = this.t.exportPdf
      const exportResult = await exportTo('pdf', this, {
        onProgress: (current, total) => {
          if (current === 0) {
            ElNotification.info({ title: pdfConfig.processingImages.title, message: pdfConfig.processingImages.message.replace('{count}', total), duration: 0 })
          } else if (current < total) {
            ElNotification.closeAll()
            ElNotification.info({ title: pdfConfig.processingImages.title, message: pdfConfig.imageProgress.message.replace('{current}', current).replace('{total}', total), duration: 0 })
          }
        },
      })

      ElNotification.closeAll()
      if (exportResult.success) {
        ElNotification.success({ title: pdfConfig.success.title, message: pdfConfig.fileSaved, duration: 3000 })
      } else if (exportResult.error) {
        ElNotification.error({ title: pdfConfig.exportError?.title, message: exportResult.error.message, duration: 3000 })
      }
      return exportResult.success
    },

    async exportHtml() {
      const result = await checkUnsavedChanges(this.isContentModified, this.t.exportFile.unsavedChanges)
      if (result === 'cancel') return false

      const htmlConfig = this.t.exportHtml
      const exportResult = await exportTo('html', this, {
        onProgress: (current, total) => {
          if (current === 0) {
            ElNotification.info({ title: htmlConfig.processingImages.title, message: htmlConfig.processingImages.message.replace('{count}', total), duration: 0 })
          } else if (current < total) {
            ElNotification.closeAll()
            ElNotification.info({ title: htmlConfig.processingImages.title, message: htmlConfig.imageProgress.message.replace('{current}', current).replace('{total}', total), duration: 0 })
          }
        },
      })

      ElNotification.closeAll()
      if (exportResult.success) {
        ElNotification.success({ title: htmlConfig.success.title, message: htmlConfig.fileSaved, duration: 3000 })
      } else if (exportResult.error) {
        ElNotification.error({ title: htmlConfig.exportError?.title, message: exportResult.error.message, duration: 3000 })
      }
      return exportResult.success
    },
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

    // ========== 文件上传 ==========

    // 处理文件上传(图片和非图片分离处理)
    async handleUpload(files) {
      console.log('[Upload] 开始处理文件上传, 文件数量:', files.length);

      // 显示上传中通知
      const uploadingNotification = ElNotification.info({
        title: this.t.uploading?.title || '上传中',
        message: this.t.uploading?.message || '正在上传文件...',
        duration: 0,
        showClose: false,
      });

      try {
        // 检查是否启用了图床上传
        const imageHostConfig = await getImageHostConfig();

        // 判断是否启用图床: enabled=true 且 current 有值
        if (imageHostConfig && imageHostConfig.enabled && imageHostConfig.current) {
          console.log('[Upload] 使用图床上传');
          return await this.handleUploadToImageHost(files, imageHostConfig);
        }

        // 使用本地存储(原有逻辑)
        console.log('[Upload] 使用本地存储');
        return await this.handleLocalUpload(files);
      } catch (error) {
        console.warn('[Upload] 上传过程异常,回退到本地存储:', error);
        return await this.handleLocalUpload(files);
      } finally {
        // 关闭上传中通知
        uploadingNotification.close();
      }
    },
    
    // 本地存储上传(原有逻辑提取)
    async handleLocalUpload(files) {
      console.log('[Upload] 开始处理文件上传, 文件数量:', files.length);

      const errFiles = [];
      const succMap = {};

      for (const file of files) {
        try {
          console.log('[Upload] 处理文件:', file.name);

          // 判断是否为图片
          const isImage = isImageFile(file);
          const maxImageSize = 10 * 1024 * 1024; // 10MB
          const maxFileSize = 50 * 1024 * 1024;  // 50MB

          // 检查文件大小限制
          if (isImage && file.size > maxImageSize) {
            console.warn('[Upload] 图片超过 10MB 限制:', file.name);
            errFiles.push(file.name);
            continue;
          }
          if (!isImage && file.size > maxFileSize) {
            console.warn('[Upload] 文件超过 50MB 限制:', file.name);
            errFiles.push(file.name);
            continue;
          }

          // 获取当前 md 文件所在目录
          if (!this.currentFilePath) {
            console.warn('[Upload] 未打开文件,无法确定保存位置');
            const noFileTip = this.t.uploadNoFile || {};
            ElMessageBox.alert(
              noFileTip.message || '当前文档尚未保存到本地,无法确定存储位置。请先保存文件(Ctrl+S)后再上传。',
              noFileTip.title || '请先保存文件',
              { confirmButtonText: noFileTip.confirmButtonText || '我知道了', type: 'warning' }
            );
            return [{ code: 1, msg: 'File not saved', data: { errFiles: files.map(f => f.name), succMap: {} } }];
          }

          // 根据文件类型选择存储目录
          const subDir = isImage ? 'assets/images' : 'assets/files';

          // 使用 path 模块处理路径,确保跨平台兼容
          const currentDir = await dirname(this.currentFilePath);
          console.log('[Upload] 当前文件目录:', currentDir);

          // 创建存储目录(图片 → assets/images,文件 → assets/files)
          const assetsDirPath = subDir;
          console.log('[Upload] 存储目录:', assetsDirPath);

          // 检查目录是否存在(相对于 md 文件所在目录)
          const fullAssetsPath = await normalize(await join(currentDir, assetsDirPath));
          const assetsDirExists = await exists(fullAssetsPath);
          console.log('[Upload] 完整路径:', fullAssetsPath);
          console.log('[Upload] 目录是否存在:', assetsDirExists);

          // 如果目录不存在,创建它
          if (!assetsDirExists) {
            console.log('[Upload] 开始创建目录...');

            try {
              // 方法1: 尝试直接使用完整路径创建(使用 parents 参数)
              await mkdir(fullAssetsPath, { parents: true });
              console.log('[Upload] 目录创建成功');
            } catch (mkdirError) {
              console.error('[Upload] mkdir 失败:', mkdirError);

              // 方法2: 如果失败,尝试逐级创建
              try {
                console.log('[Upload] 尝试逐级创建目录...');
                const assetsPath = await normalize(await join(currentDir, 'assets'));
                const assetsExists = await exists(assetsPath);

                if (!assetsExists) {
                  await mkdir(assetsPath, { parents: true });
                  console.log('[Upload] assets 目录创建成功');
                }

                await mkdir(fullAssetsPath, { parents: true });
                console.log('[Upload] 目录创建成功:', subDir);
              } catch (secondError) {
                console.error('[Upload] 逐级创建也失败:', secondError);
                throw new Error(`创建目录失败: ${secondError.message || '未知错误'}`);
              }
            }
          }

          // 读取文件内容并计算 Hash
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // 计算文件的 SHA256 Hash
          const fileHash = await calculateFileHash(file);
          console.log('[Upload] 文件 Hash:', fileHash.substring(0, 16) + '...');

          // 使用 Hash 作为文件名(避免重复)
          const ext = file.name.split('.').pop();
          const hashFileName = `${fileHash}.${ext}`;
          const destPath = await normalize(await join(fullAssetsPath, hashFileName));

          console.log('[Upload] 目标路径:', destPath);

          // 检查文件是否已存在(去重)
          const fileExists = await exists(destPath);
          if (fileExists) {
            console.log('[Upload] 文件已存在,跳过写入(去重)');
          } else {
            // 写入文件(使用 writeFile 进行二进制写入)
            await writeFile(destPath, uint8Array);
            console.log('[Upload] 文件写入成功');
          }

          // 生成相对路径和 tmd URL
          const relativePath = `./${subDir}/${hashFileName}`;
          const fileUrl = `http://tmd.localhost/${subDir}/${hashFileName}`;
          console.log('[Upload] 相对路径:', relativePath);
          console.log('[Upload] 生成的 URL:', fileUrl);

          // succMap 中存储 { url, isImage } 供调用方区分插入语法
          succMap[file.name] = { url: fileUrl, isImage };

          // 添加映射关系到工具模块
          imagePathMapper.addMapping(fileUrl, relativePath);
          console.log('[Upload] 已添加映射关系');
        } catch (error) {
          console.error('[Upload] 文件上传失败:', file.name, error);
          console.error('[Upload] 错误详情:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          errFiles.push(file.name);
        }
      }

      console.log('[Upload] 上传完成 - 成功:', Object.keys(succMap).length, '失败:', errFiles.length);

      // 如果有失败的文件,显示用户提示
      if (errFiles.length > 0) {
        ElNotification.error({
          title: this.t.uploadFailed?.title || '上传失败',
          message: this.t.uploadFailed?.message?.replace('{count}', errFiles.length) || `${errFiles.length} 个文件上传失败`,
          duration: 5000
        });
      }

      // 如果有成功的文件,显示成功提示
      if (Object.keys(succMap).length > 0) {
        ElNotification.success({
          title: this.t.uploadSuccess?.title || '上传成功',
          message: this.t.uploadSuccess?.message?.replace('{count}', Object.keys(succMap).length) || `${Object.keys(succMap).length} 个文件上传成功`,
          duration: 3000
        });
      }

      return [
        {
          code: 0,
          msg: '',
          data: {
            errFiles: errFiles,
            succMap: succMap
          }
        }
      ];
    },
    
    // 图床上传
    async handleUploadToImageHost(files, config) {
      const errFiles = [];
      const succMap = {};

      for (const file of files) {
        try {
          console.log('[Upload] 图床上传处理文件:', file.name);
          
          // 判断是否为图片
          const isImage = isImageFile(file);
          
          // 只上传图片文件到图床,非图片文件仍使用本地存储
          if (!isImage) {
            console.log('[Upload] 非图片文件,使用本地存储');
            errFiles.push(file.name);
            continue;
          }
          
          // 根据图床类型选择上传方式
          let imageUrl;
          if (config.current === 'smms') {
            // SM.MS 使用 JavaScript 端上传（支持 multipart）
            console.log('[Upload] 使用 JavaScript 端 SM.MS 上传');
            imageUrl = await uploadToSMMS(file, config);
          } else {
            // GitHub/Gitee 使用 Rust 端上传（需要文件路径）
            console.log('[Upload] 使用 Rust 端上传:', config.current);
            const tempPath = await this.saveFileToTemp(file);
            imageUrl = await uploadToImageHost(tempPath, config);
            await this.cleanupTempFile(tempPath);
          }
          
          console.log('[Upload] 图床返回 URL:', imageUrl);
          succMap[file.name] = { url: imageUrl, isImage: true };
        } catch (error) {
          console.error('[Upload] 图床上传失败:', file.name, error);
          errFiles.push(file.name);
        }
      }

      console.log('[Upload] 图床上载完成 - 成功:', Object.keys(succMap).length, '失败:', errFiles.length);

      // 显示通知
      if (errFiles.length > 0) {
        ElNotification.error({
          title: this.t.uploadFailed?.title || '上传失败',
          message: this.t.uploadFailed?.message?.replace('{count}', errFiles.length) || `${errFiles.length} 个文件上传失败`,
          duration: 5000
        });
      }

      if (Object.keys(succMap).length > 0) {
        ElNotification.success({
          title: this.t.uploadSuccess?.title || '上传成功',
          message: this.t.uploadSuccess?.message?.replace('{count}', Object.keys(succMap).length) || `${Object.keys(succMap).length} 个文件上传成功`,
          duration: 3000
        });
      }

      return [
        {
          code: 0,
          msg: '',
          data: {
            errFiles: errFiles,
            succMap: succMap
          }
        }
      ];
    },
    
    // 保存文件到临时目录
    async saveFileToTemp(file) {
      const tempDirPath = await tempDir();
      const tempFileName = `upload_${Date.now()}_${file.name}`;
      const tempFilePath = await join(tempDirPath, tempFileName);
      
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await writeFile(tempFilePath, uint8Array);
      
      return tempFilePath;
    },
    
    // 清理临时文件
    async cleanupTempFile(filePath) {
      try {
        await remove(filePath);
        console.log('[Upload] 临时文件已清理:', filePath);
      } catch (error) {
        console.warn('[Upload] 清理临时文件失败:', error);
      }
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