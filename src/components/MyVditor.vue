<template>
  <div id="vditorEle" class="vditor"></div>
</template>

<script async>
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import '../assets/vditor-custom.css'
import {ElMessageBox, ElNotification} from "element-plus"
import vditorConf from '../config/vditor-config.js'
import menuI18nConfig from '../config/menu-i18n.js'
// 导入系统组件
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getLastFilePath, saveLastFilePath } from '../utils/store.js'
import imagePathMapper from '../utils/image-path-mapper.js'

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
    };
  },
  computed: {
    // 获取当前语言的通知配置
    t() {
      return menuI18nConfig[this.lang]?.notifications || menuI18nConfig.zh_CN.notifications;
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
    })
  },
  methods: {
    // 切换语言
    switchLanguage(lang) {
      if (this.lang === lang) return;
      
      this.lang = lang;
      // 重新初始化 Vditor 以应用新的语言配置
      this.initVditor();
    },
    
    // 初始化 Vditor 编辑器
    initVditor() {
      // 销毁现有实例
      if (this.vditor) {
        this.vditor.destroy();
      }
      
      // 创建配置
      const vditorConfCopy = JSON.parse(JSON.stringify({
        options: {
          ...vditorConf.options,
          lang: this.lang,
          placeholder: this.welcome,
          cdn: this.cdn,
          toolbar: vditorConf.toolbar, // 明确传递 toolbar 配置
        },
      }));
      
      // 设置自定义上传 handler
      vditorConfCopy.options.upload.handler = async (files) => {
        const result = await this.handleImageUpload(files);
        
        // 如果有成功的图片，手动插入到编辑器
        if (result && result[0] && result[0].data && result[0].data.succMap) {
          const succMap = result[0].data.succMap;
          for (const [originalName, imageUrl] of Object.entries(succMap)) {
            // 插入 asset URL（由 handleImageUpload 统一生成）
            const markdownImage = `![${originalName}](${imageUrl})`;
            this.vditor.insertValue(markdownImage + '\n');
            
            console.log('[Upload] 插入 Markdown:', markdownImage);
          }
        }
        
        return result;
      };
      
      vditorConfCopy.options.after = () => {
        this.observeContentChange();
        this.autoLoadLastFile();
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
            title: this.t.autoLoad.fileNotExist.title,
            message: this.t.autoLoad.fileNotExist.message,
            duration: 3000
          })
          return
        }
        
        console.log('[DEBUG] 尝试读取文件:', lastFilePath)
        const data = await readTextFile(lastFilePath)
        console.log('[DEBUG] 文件读取成功，长度:', data.length)
        
        // 获取文件所在目录
        const { dirname } = await import('@tauri-apps/api/path');
        const baseDir = await dirname(lastFilePath);
        
        // 将相对路径转换为 asset URL（让图片能显示）
        const convertedContent = await imagePathMapper.convertToAssetUrl(data, baseDir);
        console.log('[Load] 已转换相对路径为 asset URL');
        
        // 设置内容到编辑器
        this.vditor.setValue(convertedContent)
        
        // 更新文件状态
        this.currentFilePath = lastFilePath
        this.originalContent = data
        this.isContentModified = false
        
        console.log('[DEBUG] 文件内容已设置到编辑器')
        
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
        ElNotification.error(this.t.openFile.pathError)
        return false
      }
      try {
        // 检查文件是否存在
        const fileExists = await exists(filePath)
        if (!fileExists) {
          ElNotification.error(this.t.openFile.notExist)
          return false
        }
        
        const data = await readTextFile(filePath)
        
        // 获取文件所在目录
        const { dirname } = await import('@tauri-apps/api/path');
        const baseDir = await dirname(filePath);
        
        // 将相对路径转换为 asset URL（让图片能显示）
        const convertedContent = await imagePathMapper.convertToAssetUrl(data, baseDir);
        console.log('[Open] 已转换相对路径为 asset URL');
        
        this.vditor.setValue(convertedContent)
        
        // 更新文件状态
        this.currentFilePath = filePath
        this.originalContent = data
        this.isContentModified = false
        
        await saveLastFilePath(filePath)
        
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
                
        // 使用工具模块将 asset URL 转换为相对路径（保存前处理）
        currentContent = imagePathMapper.convertToRelative(currentContent);
        console.log('[Save] 已转换 asset URL 为相对路径');
        
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
    
    // 处理图片上传
    async handleImageUpload(files) {
      console.log('[Upload] 开始处理图片上传, 文件数量:', files.length);
      
      const errFiles = [];
      const succMap = {};
      
      for (const file of files) {
        try {
          console.log('[Upload] 处理文件:', file.name);
          
          // 获取当前 md 文件所在目录
          if (!this.currentFilePath) {
            console.warn('[Upload] 未打开文件，无法确定保存位置');
            errFiles.push(file.name);
            continue;
          }
          
          // 使用 path 模块处理路径，确保跨平台兼容
          const { dirname, join, normalize } = await import('@tauri-apps/api/path');
          const currentDir = await dirname(this.currentFilePath);
          console.log('[Upload] 当前文件目录:', currentDir);
          
          // 创建 assets/images 目录路径（使用相对路径方式）
          const assetsDirPath = 'assets/images';
          console.log('[Upload] 相对目录路径:', assetsDirPath);
          
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
                console.log('[Upload] images 目录创建成功');
              } catch (secondError) {
                console.error('[Upload] 逐级创建也失败:', secondError);
                throw new Error(`创建目录失败: ${secondError.message || '未知错误'}`);
              }
            }
          }
          
          // 生成唯一文件名（避免重名）
          const timestamp = Date.now();
          const ext = file.name.split('.').pop();
          const uniqueFileName = `image_${timestamp}.${ext}`;
          const destPath = await normalize(await join(fullAssetsPath, uniqueFileName));
          
          console.log('[Upload] 目标路径:', destPath);
          
          // 读取文件内容
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // 写入文件（使用 writeFile 进行二进制写入）
          const { writeFile } = await import('@tauri-apps/plugin-fs');
          await writeFile(destPath, uint8Array);
          console.log('[Upload] 文件写入成功');
          
          // 生成相对路径（保存到 Markdown 文件时使用）
          const relativePath = `./assets/images/${uniqueFileName}`;
          console.log('[Upload] 相对路径:', relativePath);
          
          // 统一使用 convertFileSrc 转换本地路径为 asset URL
          const { convertFileSrc } = await import('@tauri-apps/api/core');
          const imageUrl = convertFileSrc(destPath);
          console.log('[Upload] 转换后的 URL:', imageUrl);
          
          succMap[file.name] = imageUrl;
          
          // 添加映射关系到工具模块（asset URL → 相对路径）
          imagePathMapper.addMapping(imageUrl, relativePath);
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
  },
}
</script>