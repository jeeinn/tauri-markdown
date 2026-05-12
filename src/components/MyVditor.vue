<template>
  <div class="vditor-container">
    <div id="vditorEle" class="vditor"></div>
    <!-- 拖拽文件高亮遮罩层 -->
    <div v-if="showDropOverlay" class="drop-overlay">
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
import {ElMessageBox, ElNotification} from "element-plus"
import vditorConf from '../config/vditor-config.js'
import { getI18nText, getI18nConfig } from '../utils/i18n-helper.js'
// 导入系统组件
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { getLastFilePath, saveLastFilePath, saveScrollPosition, getScrollPosition, clearScrollPosition } from '../utils/store.js'
import imagePathMapper from '../utils/image-path-mapper.js'
import { dirname, join } from '@tauri-apps/api/path'
import { exportPdf as exportPdfUtil } from '../utils/pdf-export.js'
import { exportHtml as exportHtmlUtil } from '../utils/html-export.js'

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
      originalContent: '', // 原始文件内容，用于对比
      isSaving: false, // 是否正在保存（防止保存过程中触发修改检测）
      showDropOverlay: false, // 是否显示拖拽文件高亮遮罩
      _unlistenDragDrop: null, // 拖拽事件取消监听函数
      // 滚动位置记忆
      scrollPositionsCache: {}, // 内存缓存 { [filePath]: percentage }
      _scrollEl: null, // 当前绑定的滚动元素
      _scrollThrottleTimer: null, // 滚动节流定时器
      _storeSaveTimer: null, // Store 写入防抖定时器
      _modeCheckInterval: null, // 模式切换轮询定时器
      _lastMode: null, // 上次编辑模式
      _isHandlingModeChange: false, // 防止重复处理模式切换
      scrollRememberEnabled: true, // 滚动记忆开关状态（从父组件接收）
      // 滚动位置记忆配置常量
      SCROLL_THROTTLE_MS: 200,        // 滚动事件节流时间（毫秒）
      STORE_DEBOUNCE_MS: 500,         // Store 写入防抖时间（毫秒）
      RENDER_POLL_MAX_TIMES: 50,      // 渲染稳定检测最大轮询次数
      RENDER_POLL_INTERVAL_MS: 50,    // 轮询间隔（毫秒）
      RENDER_STABLE_CHECK_COUNT: 3,   // 连续稳定检测次数
      MODE_CHECK_INTERVAL_MS: 300,    // 模式切换检测间隔（毫秒）
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

    // 添加窗口关闭前的保护（仅适用于浏览器环境）
    window.addEventListener('beforeunload', (e) => {
      if (this.isContentModified) {
        e.preventDefault()
        e.returnValue = ''
      }
      // 关闭前保存滚动位置（如果功能启用）
      if (this.scrollRememberEnabled) {
        this.flushScrollPosition()
      }
    })

    // 初始化拖拽文件打开
    this.setupDragDrop();
  },
  beforeUnmount() {
    // 保存当前滚动位置（如果功能启用）
    if (this.scrollRememberEnabled) {
      this.flushScrollPosition()
    }
    // 清理滚动事件监听
    if (this._scrollEl) {
      this._scrollEl.removeEventListener('scroll', this._onScroll)
      this._scrollEl = null
    }
    if (this._scrollThrottleTimer) {
      clearTimeout(this._scrollThrottleTimer)
      this._scrollThrottleTimer = null
    }
    if (this._storeSaveTimer) {
      clearTimeout(this._storeSaveTimer)
      this._storeSaveTimer = null
    }
    // 清理模式切换监听器
    if (this._modeCheckInterval) {
      clearInterval(this._modeCheckInterval)
      this._modeCheckInterval = null
    }
    // 清理拖拽事件监听
    if (this._unlistenDragDrop) {
      this._unlistenDragDrop();
      this._unlistenDragDrop = null;
    }
  },
  methods: {
    // 切换语言
    switchLanguage(lang) {
      if (this.lang === lang) return;

      this.lang = lang;
      // 重新初始化 Vditor 以应用新的语言配置
      this.initVditor();
    },

    // 初始化拖拽文件打开
    async setupDragDrop() {
      try {
        const webview = await getCurrentWebview();
        this._unlistenDragDrop = await webview.onDragDropEvent((event) => {
          const { type, paths } = event.payload;

          if (type === 'over') {
            // 拖入窗口 - 显示高亮遮罩
            this.showDropOverlay = true;
            return;
          }

          if (type === 'leave' || type === 'cancel') {
            // 离开窗口或取消 - 隐藏遮罩
            this.showDropOverlay = false;
            return;
          }

          if (type === 'drop') {
            // 文件已拖放 - 隐藏遮罩
            this.showDropOverlay = false;

            if (!paths || paths.length === 0) return;

            // 查找第一个 Markdown 文件
            const mdFile = paths.find(p =>
              p.endsWith('.md') || p.endsWith('.markdown') || p.endsWith('.txt')
            );

            if (mdFile) {
              console.log('[DragDrop] 拖拽打开文件:', mdFile);
              this.loadFileByPath(mdFile);
            } else {
              // 提示用户只支持 Markdown 文件
              ElNotification({
                title: getI18nText(this.lang, 'dragDrop.title'),
                message: getI18nText(this.lang, 'dragDrop.unsupported'),
                type: 'warning',
                duration: 3000,
              });
            }
          }
        });
        console.log('[DragDrop] 拖拽文件打开功能已初始化');
      } catch (error) {
        console.error('[DragDrop] 初始化拖拽监听失败:', error);
      }
    },

    // 设置编辑器主题
    setVditorTheme(isDark) {
      if (!this.vditor) return;
      const theme = isDark ? 'dark' : 'classic';
      const contentTheme = isDark ? 'dark' : 'light';
      const codeTheme = isDark ? 'github-dark' : 'github';
      const contentThemePath = this.cdn + '/dist/css/content-theme';
      this.vditor.setTheme(theme, contentTheme, codeTheme, contentThemePath);
    },
    
    // 初始化 Vditor 编辑器
    initVditor() {
      // 销毁现有实例
      if (this.vditor) {
        this.vditor.destroy();
      }
      
      // 创建配置（注意：不使用 JSON 深拷贝，避免丢失函数类型配置）
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
        }
        
        return result;
      };
      
      vditorConfCopy.options.after = () => {
        this.observeContentChange();
        this.setupScrollListener();
        
        // 初始化最后模式记录
        if (this.vditor && this.vditor.vditor) {
          this._lastMode = this.vditor.vditor.currentMode
        }
        
        // 设置模式切换监听器
        this.setupEditModeListener();
        
        this.autoLoadLastFile();
        // 初始化窗口标题
        this.updateWindowTitle();
      };
      
      // 创建新实例
      this.vditor = new Vditor('vditorEle', vditorConfCopy.options);
    },
    
    // 监听编辑器内容变化（支持多种模式）
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
    
    // 检查内容是否被修改
    checkContentModified() {
      if (!this.vditor) return
      
      // 如果正在保存，跳过检查
      if (this.isSaving) {
        console.log('[DEBUG] 正在保存中，跳过内容修改检测')
        return
      }
      
      const currentContent = this.vditor.getValue()
      const wasModified = this.isContentModified
      this.isContentModified = currentContent !== this.originalContent
      
      // 调试日志：只在状态变化时输出
      if (wasModified !== this.isContentModified) {
        console.log('[DEBUG] 内容修改状态变化:', this.isContentModified ? '已修改' : '未修改')
        // 更新窗口标题（添加/移除修改标记）
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
          // 新建文件，未保存
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
      const { clearLastFilePath, clearScrollPosition } = await import('../utils/store.js')
      await clearLastFilePath()
      
      // 清除该文件的滚动位置记录
      if (oldFilePath) {
        await clearScrollPosition(oldFilePath)
        // 同时清除内存缓存
        if (this.scrollPositionsCache[oldFilePath]) {
          delete this.scrollPositionsCache[oldFilePath]
        }
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
        const { invoke } = await import('@tauri-apps/api/core');

        // 优先处理通过"打开方式"传入的文件（由 Rust 端通过 command 获取）
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
          console.log('[DEBUG] 文件不存在，清除记录')
          await this.clearCurrentFile()
          ElNotification.warning({
            title: this.t.autoLoad.fileNotExist.title,
            message: this.t.autoLoad.fileNotExist.message,
            duration: 3000
          })
          return
        }

        await this.loadFileByPath(lastFilePath)

        // 显示加载成功提示
        const fileName = lastFilePath.split('\\').pop() || lastFilePath.split('/').pop()
        ElNotification.success({
          title: this.t.autoLoad.success.title,
          message: fileName,
          duration: 2000
        })
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

    // 根据路径加载文件（供 autoLoadLastFile / openMdFile / 打开方式 共用）
    async loadFileByPath(filePath) {
      const { invoke } = await import('@tauri-apps/api/core');
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

      const { dirname } = await import('@tauri-apps/api/path');
      const baseDir = await dirname(filePath);

      await invoke('set_current_dir', { dir: baseDir });

      const convertedContent = imagePathMapper.convertToAssetUrl(data);
      console.log('[Load] 已转换相对路径为 tmd URL');

      // 切换文件前保存当前文件的滚动位置
      this.saveCurrentScrollPosition()

      this.vditor.setValue(convertedContent)

      this.currentFilePath = filePath
      this.originalContent = data
      this.isContentModified = false

      await saveLastFilePath(filePath)
      await this.updateWindowTitle()

      // 加载新文件后恢复滚动位置
      this.restoreScrollPosition(filePath)
      
      // 更新最后模式记录（新文件）
      if (this.vditor && this.vditor.vditor) {
        this._lastMode = this.vditor.vditor.currentMode
      }

      await invoke('log_message', { msg: `loadFileByPath: success, file loaded: ${filePath}` });
      return true
    },
    // 新建空白文档
    async newFile() {
      // 如果当前有未保存的修改，提示用户
      if (this.isContentModified) {
        try {
          await ElMessageBox.confirm(
            this.t.newFile.unsavedChanges.message,
            this.t.newFile.unsavedChanges.title,
            {
              confirmButtonText: this.t.newFile.unsavedChanges.confirmButtonText,
              cancelButtonText: this.t.newFile.unsavedChanges.cancelButtonText,
              type: 'warning'
            }
          )
        } catch {
          // 用户取消操作
          return false
        }
      }
      
      // 清空编辑器内容
      this.vditor.setValue('')
      
      // 切换文件前保存当前文件的滚动位置
      this.saveCurrentScrollPosition()
      
      // 清除文件状态
      await this.clearCurrentFile()
      
      console.log('[New] 已创建新空白文档')
      return true
    },
    async openMdFile() {
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
        ElNotification.success({
          title: this.t.openFile.success.title,
          message: fileName,
          duration: 2000
        })
      } catch (error) {
        console.error('文件读取失败:', error)
        ElNotification.error(this.t.openFile.readError)
        return false
      }
    },
    async saveMdFile() {
      let filePath = this.currentFilePath

      // 如果没有当前文件路径，弹出保存对话框
      if (!filePath) {
        console.log('[DEBUG] 没有当前文件路径，弹出保存对话框')
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
        // 设置保存标志，防止保存过程中触发修改检测
        this.isSaving = true
        
        // 检查内容是否有修改
        let currentContent = this.vditor.getValue()
                
        // 使用工具模块将 tmd URL 转换为相对路径（保存前处理）
        currentContent = imagePathMapper.convertToRelative(currentContent);
        console.log('[Save] 已转换 tmd URL 为相对路径');
        
        if (!this.isContentModified && this.originalContent !== '') {
          // 内容未修改，提示用户
          this.isSaving = false
          ElNotification.info({
            title: this.t.saveFile.notModified.title,
            message: this.t.saveFile.notModified.message,
            duration: 2000
          })
          return true
        }
        
        // 如果文件已存在，检查是否被外部修改
        const fileExists = await exists(filePath)
        if (fileExists && this.currentFilePath === filePath) {
          // 读取当前磁盘上的文件内容
          const diskContent = await readTextFile(filePath)
          
          // 如果磁盘内容与原始内容不同，说明文件被外部修改
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
        
        // 立即更新状态（在显示通知之前）
        this.currentFilePath = filePath
        this.originalContent = currentContent
        this.isContentModified = false
        
        // 保存到 store
        await saveLastFilePath(filePath)
        
        // 清除保存标志
        this.isSaving = false
        console.log('[DEBUG] 文件保存成功，状态已更新')
        
        // 更新窗口标题（移除修改标记）
        await this.updateWindowTitle()
        
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
        ElNotification.success({
          title: this.t.saveFile.success.title,
          message: fileName,
          duration: 2000
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
      try {
        const content = this.vditor.getValue()
        
        // 检查内容是否为空
        if (!content.trim()) {
          ElNotification.warning({
            title: this.t.exportFile.emptyContent.title,
            message: this.t.exportFile.emptyContent.message,
            duration: 2000
          })
          return false
        }
        
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
        ElNotification.success({
          title: this.t.exportFile.success.title,
          message: fileName,
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
      // 获取当前语言的 PDF 导出配置
      const pdfConfig = this.t.exportPdf
      
      // 调用工具模块执行 PDF 导出
      return await exportPdfUtil(this.vditor, pdfConfig)
    },
    
    async exportHtml() {
      // 获取当前语言的 HTML 导出配置
      const htmlConfig = this.t.exportHtml
      
      // 调用工具模块执行 HTML 导出
      return await exportHtmlUtil(this.vditor, htmlConfig)
    },
    showAbout() {
      ElMessageBox.alert(
          '&nbsp;&nbsp;&nbsp;&nbsp;' +
          '这是基于开源项目开发的一个本地 Markdown 写作工具，可以跨平台使用（Windows、macOS、Linux） <br/>' +
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
    
    // 计算文件的 SHA256 Hash
    async calculateFileHash(file) {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    },
    
    // 判断文件是否为图片
    isImageFile(file) {
      return file.type && file.type.startsWith('image/');
    },

    // 处理文件上传（图片和非图片分离处理）
    async handleUpload(files) {
      console.log('[Upload] 开始处理文件上传, 文件数量:', files.length);
      
      const errFiles = [];
      const succMap = {};
      
      for (const file of files) {
        try {
          console.log('[Upload] 处理文件:', file.name);
          
          // 判断是否为图片
          const isImage = this.isImageFile(file);
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
            console.warn('[Upload] 未打开文件，无法确定保存位置');
            const noFileTip = this.t.uploadNoFile || {};
            ElMessageBox.alert(
              noFileTip.message || '当前文档尚未保存到本地，无法确定存储位置。请先保存文件（Ctrl+S）后再上传。',
              noFileTip.title || '请先保存文件',
              { confirmButtonText: noFileTip.confirmButtonText || '我知道了', type: 'warning' }
            );
            return [{ code: 1, msg: 'File not saved', data: { errFiles: files.map(f => f.name), succMap: {} } }];
          }

          // 根据文件类型选择存储目录
          const subDir = isImage ? 'assets/images' : 'assets/files';
          
          // 使用 path 模块处理路径，确保跨平台兼容
          const { dirname, join, normalize } = await import('@tauri-apps/api/path');
          const currentDir = await dirname(this.currentFilePath);
          console.log('[Upload] 当前文件目录:', currentDir);
          
          // 创建存储目录（图片 → assets/images，文件 → assets/files）
          const assetsDirPath = subDir;
          console.log('[Upload] 存储目录:', assetsDirPath);

          // 检查目录是否存在（相对于 md 文件所在目录）
          const fullAssetsPath = await normalize(await join(currentDir, assetsDirPath));
          const assetsDirExists = await exists(fullAssetsPath);
          console.log('[Upload] 完整路径:', fullAssetsPath);
          console.log('[Upload] 目录是否存在:', assetsDirExists);
          
          // 如果目录不存在，创建它
          if (!assetsDirExists) {
            console.log('[Upload] 开始创建目录...');
            const { mkdir } = await import('@tauri-apps/plugin-fs');
            
            try {
              // 方法1: 尝试直接使用完整路径创建（使用 parents 参数）
              await mkdir(fullAssetsPath, { parents: true });
              console.log('[Upload] 目录创建成功');
            } catch (mkdirError) {
              console.error('[Upload] mkdir 失败:', mkdirError);
              
              // 方法2: 如果失败，尝试逐级创建
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
          const fileHash = await this.calculateFileHash(file);
          console.log('[Upload] 文件 Hash:', fileHash.substring(0, 16) + '...');
          
          // 使用 Hash 作为文件名（避免重复）
          const ext = file.name.split('.').pop();
          const hashFileName = `${fileHash}.${ext}`;
          const destPath = await normalize(await join(fullAssetsPath, hashFileName));
          
          console.log('[Upload] 目标路径:', destPath);
          
          // 检查文件是否已存在（去重）
          const fileExists = await exists(destPath);
          if (fileExists) {
            console.log('[Upload] 文件已存在，跳过写入（去重）');
          } else {
            // 写入文件（使用 writeFile 进行二进制写入）
            const { writeFile } = await import('@tauri-apps/plugin-fs');
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
      
      // 如果有失败的文件，显示用户提示
      if (errFiles.length > 0) {
        ElNotification.error({
          title: this.t.uploadFailed?.title || '上传失败',
          message: this.t.uploadFailed?.message?.replace('{count}', errFiles.length) || `${errFiles.length} 个文件上传失败`,
          duration: 5000
        });
      }
      
      // 如果有成功的文件，显示成功提示
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

    // ========== 滚动位置记忆 ==========

    // 设置滚动记忆开关状态
    setScrollRememberEnabled(enabled) {
      this.scrollRememberEnabled = enabled
      
      if (!enabled) {
        // 禁用时清除当前文件的缓存
        if (this.currentFilePath) {
          delete this.scrollPositionsCache[this.currentFilePath]
        }
        // 停止滚动监听
        if (this._scrollEl) {
          this._scrollEl.removeEventListener('scroll', this._onScroll)
          this._scrollEl = null
        }
      } else {
        // 重新启用时绑定监听
        this.setupScrollListener()
      }
    },

    // 获取当前模式下的滚动容器
    getScrollElement() {
      if (!this.vditor || !this.vditor.vditor) return null
      const vditor = this.vditor.vditor
      const mode = vditor.currentMode
      if (mode === 'ir' && vditor.ir) return vditor.ir.element
      if (mode === 'sv' && vditor.sv) return vditor.sv.element
      if (mode === 'wysiwyg' && vditor.wysiwyg) return vditor.wysiwyg.element
      return null
    },

    // 设置滚动监听（节流）
    setupScrollListener() {
      if (!this.scrollRememberEnabled) return
      
      const el = this.getScrollElement()
      if (!el) return

      // 移除旧监听
      if (this._scrollEl) {
        this._scrollEl.removeEventListener('scroll', this._onScroll)
      }

      this._scrollEl = el
      this._onScroll = () => {
        if (this._scrollThrottleTimer) return
        this._scrollThrottleTimer = setTimeout(() => {
          this._scrollThrottleTimer = null
          this.saveCurrentScrollPosition()
        }, this.SCROLL_THROTTLE_MS)
      }
      el.addEventListener('scroll', this._onScroll)
    },

    // 监听编辑模式切换（通过轮询检测 currentMode 变化）
    setupEditModeListener() {
      if (!this.vditor || !this.vditor.vditor) {
        console.warn('[Scroll] Vditor 未初始化，无法设置模式监听器')
        return
      }

      // 使用轮询方式检测模式变化
      this._modeCheckInterval = setInterval(() => {
        if (!this.vditor || !this.vditor.vditor) return
        
        const currentMode = this.vditor.vditor.currentMode
        if (currentMode !== this._lastMode && !this._isHandlingModeChange) {
          this.handleModeChange()
        }
      }, this.MODE_CHECK_INTERVAL_MS)
    },

    // 处理模式切换
    async handleModeChange() {
      if (!this.scrollRememberEnabled) return
      
      // 防止重复处理
      if (this._isHandlingModeChange) return
      this._isHandlingModeChange = true
      
      try {
        if (!this.currentFilePath) return
        
        const oldMode = this._lastMode
        const newMode = this.vditor?.vditor?.currentMode
        
        // 如果模式没有变化，忽略
        if (oldMode === newMode) {
          this._isHandlingModeChange = false
          return
        }
        
        console.log('[Scroll] 检测到模式切换:', oldMode, '->', newMode)
        
        // 保存当前模式的滚动位置（在 DOM 销毁前）
        this.saveCurrentScrollPosition()
        
        // 等待新模式 DOM 渲染完成
        await new Promise(resolve => setTimeout(resolve, 150))
        
        // 重新绑定滚动监听器到新模式的元素
        this.setupScrollListener()
        
        // 恢复滚动位置
        await this.restoreScrollPosition(this.currentFilePath)
        
        // 更新最后模式记录
        this._lastMode = newMode
        console.log('[Scroll] 模式切换完成')
      } finally {
        // 确保标志位被重置
        this._isHandlingModeChange = false
      }
    },

    // 保存当前滚动位置到内存缓存（节流回调）
    saveCurrentScrollPosition() {
      if (!this.scrollRememberEnabled) return
      
      const el = this.getScrollElement()
      if (!el || !this.currentFilePath) return
      const sh = el.scrollHeight
      const ch = el.clientHeight
      if (sh <= ch) return // 内容未溢出，无需保存
      const pct = el.scrollTop / (sh - ch)
      if (!isFinite(pct)) return
      this.scrollPositionsCache[this.currentFilePath] = pct

      // 防抖写入 Store（500ms 内无新滚动才写）
      if (this._storeSaveTimer) clearTimeout(this._storeSaveTimer)
      this._storeSaveTimer = setTimeout(() => {
        this._storeSaveTimer = null
        this.flushScrollPosition()
      }, this.STORE_DEBOUNCE_MS)
    },

    // 立即将当前文件的滚动位置写入 Store
    async flushScrollPosition() {
      if (!this.scrollRememberEnabled) return
      
      if (!this.currentFilePath) return
      const pct = this.scrollPositionsCache[this.currentFilePath]
      if (pct == null) return
      await saveScrollPosition(this.currentFilePath, pct)
    },

    // 加载文件后恢复滚动位置
    async restoreScrollPosition(filePath) {
      if (!this.scrollRememberEnabled) return
      
      const el = this.getScrollElement()
      if (!el) return

      const pct = await getScrollPosition(filePath)
      if (pct == null || pct <= 0) return

      // 轮询等待 Vditor 渲染稳定（scrollHeight 连续 3 次不变）
      // 为什么需要轮询？
      // Vditor 在 setValue 后需要时间渲染 Markdown 为 HTML
      // scrollHeight 会在渲染过程中动态变化
      // 我们需要等待渲染稳定后再计算滚动位置
      let prevHeight = 0
      let stableCount = 0
      for (let i = 0; i < this.RENDER_POLL_MAX_TIMES; i++) {
        await new Promise(r => setTimeout(r, this.RENDER_POLL_INTERVAL_MS))
        const sh = el.scrollHeight
        if (sh === prevHeight && sh > 0) {
          stableCount++
          if (stableCount >= this.RENDER_STABLE_CHECK_COUNT) {
            const scrollTop = Math.round(pct * (sh - el.clientHeight))
            el.scrollTop = Math.min(scrollTop, sh - el.clientHeight)
            console.log('[Scroll] 滚动位置已恢复:', filePath, '百分比:', pct.toFixed(4))
            return
          }
        } else {
          stableCount = 0
          prevHeight = sh
        }
      }
      
      // 超时后备：直接尝试一次
      console.warn('[Scroll] 渲染稳定检测超时，使用后备方案恢复滚动位置')
      const scrollTop = Math.round(pct * (el.scrollHeight - el.clientHeight))
      el.scrollTop = Math.min(scrollTop, el.scrollHeight - el.clientHeight)
    },
  },
}
</script>