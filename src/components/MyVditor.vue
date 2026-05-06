<template>
  <div id="vditorEle" class="vditor"></div>
</template>

<script async>
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import '../assets/vditor-custom.css'
import {ElMessageBox, ElNotification} from "element-plus"
import vditorConf from '../config/vditor-config.js'
import svgIcons from '../config/vditor-toolbar-svg.js'
// 导入系统组件
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getLastFilePath, saveLastFilePath } from '../utils/store.js'

export default {
  name: "MyVditor.vue",
  data() {
    return {
      vditor: '',
      welcome: '# 🎉️ Welcome to use Tauri Markdown!',
      project_url: 'https://github.com/jeeinn/tauri-markdown',
      lang: 'zh_CN',
      // 静态资源 https://cn.vitejs.dev/guide/assets.html#the-public-directory
      cdn: '/vditor-cdn',
      // 文件状态追踪
      currentFilePath: null, // 当前打开的文件路径
      isContentModified: false, // 内容是否被修改
      originalContent: '', // 原始文件内容，用于对比
      isSaving: false, // 是否正在保存（防止保存过程中触发修改检测）
    };
  },
  mounted() {
    let self = this
    if (!vditorConf.options.hasOwnProperty('lange')) {
      vditorConf.options.lange = this.lang // for i18n
      vditorConf.options.placeholder = this.welcome
      // conf local cdn
      vditorConf.options.cdn = this.cdn
      vditorConf.options.preview.theme.path = this.cdn + '/dist/css/content-theme'
      vditorConf.options.hint.emojiPath = this.cdn + '/dist/images/emoji'
      // with tauri toolbar
      vditorConf.toolbar.unshift({
        name: "openOrSave",
        tip: "打开/保存",
        // icon: '<svg t="1597727407471" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1167" width="32" height="32"><path d="M376.832 474.112H130.048c-33.792 0-61.44-27.648-61.44-61.44V165.888c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c-0.512 33.792-27.648 60.928-61.952 60.928zM130.048 165.888v247.296h247.296V165.888H130.048zM739.84 525.312c-16.384 0-31.744-6.144-43.52-17.92L521.728 332.8c-11.776-11.776-17.92-27.136-17.92-43.52s6.144-31.744 17.92-43.52L696.32 71.168c11.776-11.776 27.136-17.92 43.52-17.92s31.744 6.144 43.52 17.92L957.952 245.76c11.776 11.776 17.92 27.136 17.92 43.52s-6.144 31.744-17.92 43.52L783.36 507.392c-11.776 11.776-27.136 17.92-43.52 17.92z m0-411.136l-174.592 174.592 174.592 174.592 174.592-174.592-174.592-174.592zM376.832 960.512H130.048c-33.792 0-61.44-27.648-61.44-61.44v-247.296c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c-0.512 34.304-27.648 61.44-61.952 61.44z m-246.784-308.224v247.296h247.296v-247.296H130.048zM863.232 960.512h-247.296c-33.792 0-61.44-27.648-61.44-61.44v-247.296c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c0 34.304-27.136 61.44-61.44 61.44z m-246.784-308.224v247.296h247.296v-247.296h-247.296z" p-id="1168"></path></svg>',
        icon: svgIcons.folder,
        tipPosition: 'e',
        toolbar: [
          {
            hotkey: '⌘o',
            name: "openMdFile",
            tipPosition: 's',
            icon: '打开文件',
            click() {
              self.openMdFile()
            }
          },
          {
            hotkey: '⌘s',
            name: "exportMdFile",
            icon: '导出...',
            click() {
              self.saveMdFile()
            }
          },
        ],
        click() {
        }
      })
      vditorConf.toolbar.push({
        name: "more",
        tipPosition: 's',
        toolbar: [
          // "export",
          // "outline",  // 已移至工具栏主位置
          "preview",
          "both",
          "code-theme",
          "content-theme",
          "devtools",
          // "info",
          "help",
          {
            name: "about",
            icon: '关于',
            click() {
              self.showAbout()
            }
          },
        ],
      })
      vditorConf.options.toolbar = vditorConf.toolbar;
    }
    this.vditor = new Vditor('vditorEle', vditorConf.options)
    
    // 监听编辑器内容变化（支持多种模式）
    const observeContentChange = () => {
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
    }
    
    // 等待 Vditor 完全初始化后再设置监听器和加载文件
    this.vditor.after(() => {
      console.log('[DEBUG] Vditor 初始化完成')
      observeContentChange()
      this.autoLoadLastFile()
    })
    
    // 添加窗口关闭前的保护（仅适用于浏览器环境）
    window.addEventListener('beforeunload', (e) => {
      if (this.isContentModified) {
        e.preventDefault()
        e.returnValue = ''
      }
    })
    
    // 添加键盘快捷键监听
    window.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        this.saveMdFile()
      }
      // Ctrl/Cmd + O 打开
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        this.openMdFile()
      }
    })
  },
  methods: {
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
      }
    },
    
    // 清除当前文件状态
    async clearCurrentFile() {
      this.currentFilePath = null
      this.originalContent = ''
      this.isContentModified = false
      // 清除 store 中的记录
      const { clearLastFilePath } = await import('../utils/store.js')
      await clearLastFilePath()
    },
    
    // 显示文件冲突对话框
    async showFileConflictDialog(filePath) {
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
      try {
        await ElMessageBox.confirm(
          `文件 "${fileName}" 已在外部被修改。\n\n您想覆盖外部修改吗？`,
          '文件冲突',
          {
            confirmButtonText: '覆盖保存',
            cancelButtonText: '取消',
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
        console.log('[DEBUG] 开始自动加载上次文件...')
        const lastFilePath = await getLastFilePath()
        console.log('[DEBUG] 从 store 获取的文件路径:', lastFilePath)
        
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
          // 文件不存在，清除记录
          await this.clearCurrentFile()
          ElNotification.warning({
            title: '文件不存在',
            message: '上次打开的文件已被删除或移动',
            duration: 3000
          })
          return
        }
        
        console.log('[DEBUG] 尝试读取文件:', lastFilePath)
        const data = await readTextFile(lastFilePath)
        console.log('[DEBUG] 文件读取成功，长度:', data.length)
        
        // 设置内容到编辑器
        this.vditor.setValue(data)
        
        // 更新文件状态
        this.currentFilePath = lastFilePath
        this.originalContent = data
        this.isContentModified = false
        
        console.log('[DEBUG] 文件内容已设置到编辑器')
        
        // 显示加载成功提示
        const fileName = lastFilePath.split('\\').pop() || lastFilePath.split('/').pop()
        ElNotification.success({
          title: '已加载上次文件',
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
        // 清除无效的文件记录
        await this.clearCurrentFile()
      }
    },
    async openMdFile() {
      const filePath = await open({
        filters: [{
          name: 'OpenFile',
          extensions: ['md', 'txt']
        }]
      })
      if (filePath == null) {
        ElNotification.error('文件路径获取失败')
        return false
      }
      try {
        // 检查文件是否存在
        const fileExists = await exists(filePath)
        if (!fileExists) {
          ElNotification.error('文件不存在')
          return false
        }
        
        const data = await readTextFile(filePath)
        this.vditor.setValue(data)
        
        // 更新文件状态
        this.currentFilePath = filePath
        this.originalContent = data
        this.isContentModified = false
        
        await saveLastFilePath(filePath)
        
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
        ElNotification.success({
          title: '文件打开成功',
          message: fileName,
          duration: 2000
        })
      } catch (error) {
        console.error('文件读取失败:', error)
        ElNotification.error('文件读取失败')
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
          ElNotification.error('文件路径获取失败')
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
        const currentContent = this.vditor.getValue()
        if (!this.isContentModified && this.originalContent !== '') {
          // 内容未修改，提示用户
          this.isSaving = false
          ElNotification.info({
            title: '提示',
            message: '内容未修改，无需保存',
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
        
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
        ElNotification.success({
          title: '文件保存成功',
          message: fileName,
          duration: 2000
        })
        return true
      } catch (error) {
        // 确保在错误时也清除保存标志
        this.isSaving = false
        console.error('[ERROR] 文件保存失败:', error)
        ElNotification.error('文件保存失败')
        return false
      }
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
          '关于程序',
          {
            dangerouslyUseHTMLString: true
          });
    },
    openWindow(url) {
      new WebviewWindow('theUniqueLabel', {
        url: url
      })
    },
  },
}
</script>