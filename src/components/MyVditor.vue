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
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
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
    
    // 等待 Vditor 完全初始化后再加载上次文件
    setTimeout(() => {
      this.autoLoadLastFile()
    }, 500)
  },
  methods: {
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
        
        console.log('[DEBUG] 尝试读取文件:', lastFilePath)
        const data = await readTextFile(lastFilePath)
        console.log('[DEBUG] 文件读取成功，长度:', data.length)
        
        // 设置内容到编辑器
        this.vditor.setValue(data)
        console.log('[DEBUG] 文件内容已设置到编辑器')
        
        // 可选：显示一个简短的提示（如果用户需要）
        // ElNotification.success({
        //   title: '已加载上次文件',
        //   message: lastFilePath.split('\\').pop() || lastFilePath.split('/').pop(),
        //   duration: 2000
        // })
      } catch (error) {
        console.error('[ERROR] 自动加载上次文件失败:', error)
        console.error('[ERROR] 错误详情:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
        // 在生产环境中，如果文件不存在或无法访问，静默失败
        // 不显示错误提示，避免干扰用户体验
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
        const data = await readTextFile(filePath)
        this.vditor.setValue(data)
        await saveLastFilePath(filePath)
      } catch (error) {
        ElNotification.error('文件读取失败')
        return false
      }
    },
    async saveMdFile() {
      let filePath = await getLastFilePath()

      // 如果没有当前文件路径，弹出保存对话框
      if (!filePath) {
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
      }

      try {
        await writeTextFile(filePath, this.vditor.getValue())
        await saveLastFilePath(filePath)
        ElNotification.success('文件保存成功')
      } catch (error) {
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