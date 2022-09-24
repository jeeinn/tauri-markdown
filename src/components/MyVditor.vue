<template>
  <div id="vditorEle" class="vditor vditor--fullscreen"></div>
</template>

<script async>
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import {ElMessageBox} from "element-plus"
import {ElNotification} from 'element-plus';
import vditorConf from '../config/vditor-config.js'
import svgIcons from '../config/vditor-toolbar-svg.js'
// 导入系统组件
import {dialog} from "@tauri-apps/api"
import {writeFile, readTextFile} from "@tauri-apps/api/fs"
import {WebviewWindow} from "@tauri-apps/api/window";

export default {
  name: "MyVditor.vue",
  data() {
    return {
      vditor: '',
      welcome: '# 🎉️ Welcome to use Tauri Markdown!',
      project_url: 'https://github.com/jeeinn/tauri-markdown',
      lang: 'zh_CN',
    };
  },
  mounted() {
    let self = this
    vditorConf.options.lange = this.lang
    vditorConf.toolbar.unshift({
      name: "openOrSave",
      tip: "打开/保存",
      // icon: '<svg t="1597727407471" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1167" width="32" height="32"><path d="M376.832 474.112H130.048c-33.792 0-61.44-27.648-61.44-61.44V165.888c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c-0.512 33.792-27.648 60.928-61.952 60.928zM130.048 165.888v247.296h247.296V165.888H130.048zM739.84 525.312c-16.384 0-31.744-6.144-43.52-17.92L521.728 332.8c-11.776-11.776-17.92-27.136-17.92-43.52s6.144-31.744 17.92-43.52L696.32 71.168c11.776-11.776 27.136-17.92 43.52-17.92s31.744 6.144 43.52 17.92L957.952 245.76c11.776 11.776 17.92 27.136 17.92 43.52s-6.144 31.744-17.92 43.52L783.36 507.392c-11.776 11.776-27.136 17.92-43.52 17.92z m0-411.136l-174.592 174.592 174.592 174.592 174.592-174.592-174.592-174.592zM376.832 960.512H130.048c-33.792 0-61.44-27.648-61.44-61.44v-247.296c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c-0.512 34.304-27.648 61.44-61.952 61.44z m-246.784-308.224v247.296h247.296v-247.296H130.048zM863.232 960.512h-247.296c-33.792 0-61.44-27.648-61.44-61.44v-247.296c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c0 34.304-27.136 61.44-61.44 61.44z m-246.784-308.224v247.296h247.296v-247.296h-247.296z" p-id="1168"></path></svg>',
      icon: svgIcons.folder,
      tipPosition: 's',
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
      click() {}
    })
    vditorConf.toolbar.push({
      name: "more",
      tipPosition: 's',
      toolbar: [
        // "export",
        "outline",
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
          click() {self.showAbout()}
        },
      ],
    })
    vditorConf.options.toolbar = vditorConf.toolbar;
    this.vditor = new Vditor('vditorEle', vditorConf.options)
  },
  methods: {
    async openMdFile() {
      const filePath = await dialog.open({
        filters: [{
          name: 'OpenFile',
          extensions: ['md','txt']
        }]
      })
      if (filePath==null) {
        // console.log(filePath)
        ElNotification.error('文件路径获取失败')
        return false
      }
      await readTextFile(filePath.toString(), {}).then((data)=>{
        this.vditor.setValue(data)
      },()=>{
        ElNotification.error('文件读取失败')
        return false
      })
    },
    async saveMdFile() {
      const filePath = await dialog.save({
        filters: [{
          name: 'MarkDownFile',
          extensions: ['md']
        }]
      })
      if (filePath==null) {
        // console.log(filePath)
        ElNotification.error('文件路径获取失败')
        return false
      }
      await writeFile({
        path: filePath,
        contents: this.vditor.getValue()
      }).then(()=>{}, ()=>{
        ElNotification.error('文件保存失败')
        return false
      })
    },
    showAbout() {
      ElMessageBox.alert(
          '&nbsp;&nbsp;&nbsp;&nbsp;' +
          '这是基于开源项目开发的一个本地 Markdown 写作工具，可以跨平台使用（Windows、macOS、Linux） <br/>' +
          '项目主页👉 <a target="_blank" href="//github.com/jeeinn/tauri-markdown">github.com/jeeinn/tauri-markdown</a><br/>' +
          '鸣谢🙏 <br/>' +
          '<a target="_blank" href="//tauri.app">Tauri</a> 、' +
          '<a target="_blank" href="//b3log.org/vditor/">Vditor</a> 、' +
          '<a target="_blank" href="//element-plus.org">Element Plus</a> <br/>' +
          '<br/>' +
          'Released under the <a target="_blank" href="//opensource.org/licenses/MIT">MIT License</a> <br/>' +
          'Made by 💗 <a target="_blank" href="//jeeinn.com">JeeInn</a>',
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