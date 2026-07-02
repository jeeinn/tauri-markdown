/**
 * 自定义应用菜单栏的国际化配置
 * 用于顶部应用栏（文件、帮助菜单）和语言切换器
 */

export default {
  // 中文简体
  zh_CN: {
    menu: {
      file: '文件',
      new: '新建',
      open: '打开',
      save: '保存',
      export: '导出',
      exportMd: '导出为 Markdown',
      exportPdf: '导出为 PDF',
      exportHtml: '导出为 HTML',
      print: '打印',
      appearance: '外观',
      settings: '设置',
      help: '帮助',
      viewLog: '查看日志',
      devTools: '开发者工具',
      about: '关于',
      checkUpdate: '检查更新',
      scrollRemember: '记住浏览位置',
      multiTabMode: '多标签模式',
      zenMode: 'Zen 模式',
      imageHostSettings: '图床设置',
      fontSizeSettings: '字体大小',
    },
    windowTitle: {
      appName: 'Tauri Markdown',
      untitled: '未命名',
      modifiedMarker: '*',
      tabSeparator: ' - ',
    },
    shortcuts: {
      new: 'Ctrl+N',
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
      print: 'Ctrl+P',
      zenMode: 'F11',
    },
    language: {
      label: '语言',
      chinese: '中文',
      english: 'English',
      japanese: '日本語',
      korean: '한국어',
    },
    theme: {
      label: '主题',
      auto: '跟随系统',
      light: '浅色',
      dark: '深色',
    },
    dragDrop: {
      hint: '释放以打开 Markdown 文件',
      title: '不支持的格式',
      unsupported: '暂不支持拖拽其他格式的文件',
    },
    findReplace: {
      find: '查找',
      replace: '替换',
      findPlaceholder: '查找...',
      replacePlaceholder: '替换...',
      previous: '上一个',
      next: '下一个',
      replaceCurrent: '替换',
      replaceAll: '全部替换',
      noResults: '无结果',
      matchCount: '{current} / {total}',
      showReplace: '显示替换',
      hideReplace: '隐藏替换',
      tooltip: '查找/替换 (Ctrl+F)',
    },
    revealInFolder: {
      tooltip: '在文件夹中显示',
      noFile: '当前文档尚未保存，无法定位文件夹',
      failed: '无法打开文件所在文件夹',
    },
    fontSizeSettings: {
      title: '字体大小',
      description: '调整编辑器内 Markdown 内容的显示字号，不影响文件本身。',
      unit: 'px',
      reset: '恢复默认',
      confirm: '确定',
    },
    zenTipEnter: '已进入 Zen 模式，按 ESC 退出',
    zenTipExit: '已退出 Zen 模式',
    notifications: {
      // 标签页操作
      tabs: {
        // 新建标签页
        newTab: {
          unsavedChanges: {
            title: '提示',
            message: '当前标签页有未保存的修改，是否继续新建？',
            confirmButtonText: '继续',
            cancelButtonText: '取消',
            thirdButtonText: '不保存并继续',
          },
        },
        // 关闭标签页
        closeTab: {
          unsavedChanges: {
            title: '提示',
            message: '标签页 "{fileName}" 有未保存的修改，是否保存？',
            confirmButtonText: '保存并关闭',
            cancelButtonText: '取消',
            thirdButtonText: '丢弃',
          },
        },
        // 关闭全部标签页
        closeAllTabs: {
          unsavedChanges: {
            title: '提示',
            message: '有 {count} 个标签页有未保存的修改，是否保存？',
            confirmButtonText: '全部保存',
            cancelButtonText: '全部丢弃',
            thirdButtonText: '取消',
          },
        },
      },
      // 新建文件
      newFile: {
        unsavedChanges: {
          title: '提示',
          message: '当前文档有未保存的修改，是否继续新建？',
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          thirdButtonText: '不保存并继续',
        },
      },
      // 关闭窗口
      closeWindow: {
        unsavedChanges: {
          title: '提示',
          message: '当前文档有未保存的修改，是否保存？',
          confirmButtonText: '保存并关闭',
          cancelButtonText: '取消',
          thirdButtonText: '丢弃',
        },
      },
      // 文件冲突对话框
      fileConflict: {
        title: '文件冲突',
        message: '文件 "{fileName}" 已在外部被修改。\n\n您想覆盖外部修改吗？',
        confirmButtonText: '覆盖保存',
        cancelButtonText: '取消',
      },
      // 外部文件变更（重新加载）
      fileExternalChange: {
        title: '文件已变更',
        message: '文件 "{fileName}" 已在外部被修改。\n\n是否重新加载？',
        messageWithUnsaved: '文件 "{fileName}" 已在外部被修改。\n\n重新加载将丢失当前未保存的修改，是否继续？',
        confirmButtonText: '重新加载',
        cancelButtonText: '保留当前内容',
      },
      fileExternalDeleted: {
        title: '文件已删除',
        message: '标签页中的文件 "{fileName}" 已在外部被删除，编辑器仍保留当前内容。',
      },
      // 自动加载上次文件
      autoLoad: {
        fileNotExist: {
          title: '文件不存在',
          message: '上次打开的文件已被删除或移动',
        },
        success: {
          title: '已加载上次文件',
        },
      },
      // 打开文件
      openFile: {
        unsavedChanges: {
          title: '提示',
          message: '当前文档有未保存的修改，是否继续打开？',
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          thirdButtonText: '不保存并继续',
        },
        pathError: '文件路径获取失败',
        notExist: '文件不存在',
        success: {
          title: '文件打开成功',
        },
        readError: '文件读取失败',
      },
      // 保存文件
      saveFile: {
        pathError: '文件路径获取失败',
        notModified: {
          title: '提示',
          message: '内容未修改，无需保存',
        },
        success: {
          title: '文件保存成功',
        },
        saveError: '文件保存失败',
      },
      // 导出文件
      exportFile: {
        unsavedChanges: {
          title: '提示',
          message: '当前文档有未保存的修改，是否继续导出？',
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          thirdButtonText: '不保存并继续',
        },
        emptyContent: {
          title: '提示',
          message: '编辑器内容为空，无法导出',
        },
        pathError: '文件路径获取失败',
        success: {
          title: '文件导出成功',
        },
        exportError: {
          title: '导出失败',
          message: '文件导出失败',
        },
      },
      // 导出HTML
      exportHtml: {
        emptyContent: {
          title: '提示',
          message: '编辑器内容为空，无法导出HTML',
        },
        converting: {
          title: '提示',
          message: '正在生成 HTML 文件，请稍候...',
        },
        processingImages: {
          title: '处理图片',
          message: '正在处理 {count} 张图片，请稍候...',
        },
        imageProgress: {
          message: '正在处理图片 ({current}/{total})...',
        },
        success: {
          title: 'HTML导出成功',
        },
        exportError: {
          title: 'HTML导出失败',
          message: 'HTML导出失败',
        },
        cancelled: {
          title: '已取消',
          message: 'HTML导出已取消',
        },
        fileSaved: 'HTML文件已保存',
      },
      // 导出PDF
      exportPdf: {
        emptyContent: {
          title: '提示',
          message: '编辑器内容为空，无法导出PDF',
        },
        converting: {
          title: '提示',
          message: '正在转换中，请稍候...',
        },
        processingImages: {
          title: '处理图片',
          message: '正在处理 {count} 张图片，请稍候...',
        },
        imageProgress: {
          message: '正在处理图片 ({current}/{total})...',
        },
        success: {
          title: 'PDF导出成功',
        },
        exportError: {
          title: 'PDF导出失败',
          message: 'PDF导出失败',
        },
        cancelled: {
          title: '已取消',
          message: 'PDF导出已取消',
        },
        fileSaved: 'PDF文件已保存',
      },
      // 关于对话框
      about: {
        title: '关于程序',
      },
      uploading: {
        title: '上传中',
        message: '正在上传文件...',
      },
      uploadSuccess: {
        title: '上传成功',
        message: '{count} 个文件上传成功',
      },
      uploadFailed: {
        title: '上传失败',
        message: '{count} 个文件上传失败，请检查文件权限和存储空间',
      },
      uploadNoFile: {
        title: '请先保存文件',
        message: '当前文档尚未保存到本地，无法确定存储位置。请先保存文件（Ctrl+S）后再上传。',
        confirmButtonText: '我知道了',
      },
      updater: {
        available: '发现新版本',
        availableMsg: '新版本 {version} 已发布，是否立即更新？',
        releaseNotes: '更新日志',
        noUpdate: '已是最新版本',
        noUpdateMsg: '当前版本已是最新',
        downloading: '正在下载更新',
        downloadProgress: '下载进度: {progress}%',
        downloadComplete: '下载完成，准备安装...',
        installConfirm: '更新已下载完成，是否立即重启应用以完成安装？',
        error: '更新失败',
        errorMsg: '检查更新时发生错误: {error}',
      },
      // 图床设置
      imageHost: {
        title: '图床设置',
        enableLabel: '启用图床上传',
        enableDescription: '开启后,图片将上传到云端图床;关闭则使用本地存储',
        storageType: {
          label: '配置存储方式',
          tauriStore: '使用应用内部存储(推荐)',
          picgoNative: '使用 PicGo 原生配置文件',
        },
        save: '保存',
        cancel: '取消',
        testConnection: '测试连接',
        saveSuccess: '图床配置保存成功',
        saveFailed: '图床配置保存失败',
        testSuccess: '连接测试成功',
        testFailed: '连接测试失败',
        selectHostType: '请选择图床类型',
        fillRequiredFields: '请填写必填项',
        importConfig: '导入 PicGo 配置',
        importSuccess: 'PicGo 配置导入成功',
        importFailed: 'PicGo 配置导入失败,请检查配置文件是否存在',
        resetConfig: '重置配置',
        // 表单验证消息
        validationMessages: {
          tokenRequired: 'Token 不能为空',
          repoRequired: '仓库名不能为空',
          ownerRequired: 'Owner 不能为空',
          accessKeyIdRequired: 'AccessKey ID 不能为空',
          accessKeySecretRequired: 'AccessKey Secret 不能为空',
          bucketRequired: 'Bucket 名称不能为空',
          areaRequired: '存储区域不能为空',
        },
        // 表单标签
        labels: {
          repo: '仓库名',
          branch: '分支名',
          token: 'Token',
          path: '存储路径',
          customUrl: '自定义域名',
          owner: 'Owner',
          accessKeyId: 'AccessKey ID',
          accessKeySecret: 'AccessKey Secret',
          bucket: 'Bucket 名称',
          area: '存储区域',
          options: 'URL 后缀',
          backupDomain: '备用域名',
        },
        // 表单占位符
        placeholders: {
          repo: '格式: username/repo',
          branch: '默认: master',
          token: 'Personal Access Token',
          path: '例如: images/ (可选)',
          customUrl: '例如: https://cdn.jsdelivr.net/gh/... (可选)',
          owner: '仓库所属用户名或组织',
          ownerRepo: '仓库名称',
          giteeToken: '私人令牌',
          giteeCustomUrl: '例如: https://gitee.com/.../raw/... (可选)',
          bucket: '存储空间名称',
          area: '例如: oss-cn-hangzhou',
          aliyunCustomUrl: '例如: https://your-domain.com (可选)',
          options: '例如: ?imgslim (可选)',
          backupDomain: '例如: smms.app (可选)',
          smmsToken: '请输入 SM.MS Token',
        },
      },
    },
  },

  // 英文
  en_US: {
    menu: {
      file: 'File',
      new: 'New',
      open: 'Open',
      save: 'Save',
      export: 'Export',
      exportMd: 'Export as Markdown',
      exportPdf: 'Export as PDF',
      exportHtml: 'Export as HTML',
      print: 'Print',
      appearance: 'Appearance',
      settings: 'Settings',
      help: 'Help',
      viewLog: 'View Log',
      devTools: 'Developer Tools',
      about: 'About',
      checkUpdate: 'Check for Updates',
      scrollRemember: 'Remember Reading Position',
      multiTabMode: 'Multi-Tab Mode',
      zenMode: 'Zen Mode',
      imageHostSettings: 'Image Host Settings',
      fontSizeSettings: 'Font Size',
    },
    windowTitle: {
      appName: 'Tauri Markdown',
      untitled: 'Untitled',
      modifiedMarker: '*',
      tabSeparator: ' - ',
    },
    shortcuts: {
      new: 'Ctrl+N',
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
      print: 'Ctrl+P',
      zenMode: 'F11',
    },
    language: {
      label: 'Language',
      chinese: '中文',
      english: 'English',
      japanese: '日本語',
      korean: '한국어',
    },
    theme: {
      label: 'Theme',
      auto: 'Auto',
      light: 'Light',
      dark: 'Dark',
    },
    dragDrop: {
      hint: 'Drop to open Markdown file',
      title: 'Unsupported Format',
      unsupported: 'Only Markdown (.md) files are supported',
    },
    findReplace: {
      find: 'Find',
      replace: 'Replace',
      findPlaceholder: 'Find...',
      replacePlaceholder: 'Replace...',
      previous: 'Previous',
      next: 'Next',
      replaceCurrent: 'Replace',
      replaceAll: 'Replace All',
      noResults: 'No Results',
      matchCount: '{current} / {total}',
      showReplace: 'Show Replace',
      hideReplace: 'Hide Replace',
      tooltip: 'Find/Replace (Ctrl+F)',
    },
    revealInFolder: {
      tooltip: 'Reveal in Folder',
      noFile: 'The current document has not been saved yet',
      failed: 'Unable to open the folder containing this file',
    },
    fontSizeSettings: {
      title: 'Font Size',
      description: 'Adjust the display font size of Markdown content in the editor. Does not modify the file.',
      unit: 'px',
      reset: 'Reset to Default',
      confirm: 'OK',
    },
    zenTipEnter: 'Entered Zen Mode, press ESC to exit',
    zenTipExit: 'Exited Zen Mode',
    notifications: {
      // Tab operations
      tabs: {
        // New tab
        newTab: {
          unsavedChanges: {
            title: 'Notice',
            message: 'Current tab has unsaved changes. Continue to create a new tab?',
            confirmButtonText: 'Continue',
            cancelButtonText: 'Cancel',
            thirdButtonText: 'Discard & Continue',
          },
        },
        // Close tab
        closeTab: {
          unsavedChanges: {
            title: 'Notice',
            message: 'Tab "{fileName}" has unsaved changes. Save before closing?',
            confirmButtonText: 'Save & Close',
            cancelButtonText: 'Cancel',
            thirdButtonText: 'Discard',
          },
        },
        // Close all tabs
        closeAllTabs: {
          unsavedChanges: {
            title: 'Notice',
            message: '{count} tab(s) have unsaved changes. Save them?',
            confirmButtonText: 'Save All',
            cancelButtonText: 'Discard All',
            thirdButtonText: 'Cancel',
          },
        },
      },
      newFile: {
        unsavedChanges: {
          title: 'Notice',
          message: 'Current document has unsaved changes. Continue to create a new file?',
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel',
          thirdButtonText: 'Discard & Continue',
        },
      },
      closeWindow: {
        unsavedChanges: {
          title: 'Notice',
          message: 'Current document has unsaved changes. Save before closing?',
          confirmButtonText: 'Save & Close',
          cancelButtonText: 'Cancel',
          thirdButtonText: 'Discard',
        },
      },
      fileConflict: {
        title: 'File Conflict',
        message: 'File "{fileName}" has been modified externally.\n\nDo you want to overwrite the external changes?',
        confirmButtonText: 'Overwrite',
        cancelButtonText: 'Cancel',
      },
      fileExternalChange: {
        title: 'File Changed',
        message: 'File "{fileName}" has been modified externally.\n\nDo you want to reload?',
        messageWithUnsaved: 'File "{fileName}" has been modified externally.\n\nReloading will discard your unsaved changes. Continue?',
        confirmButtonText: 'Reload',
        cancelButtonText: 'Keep Current Content',
      },
      fileExternalDeleted: {
        title: 'File Deleted',
        message: 'File "{fileName}" in this tab was deleted externally. The editor still keeps the current content.',
      },
      autoLoad: {
        fileNotExist: {
          title: 'File Not Found',
          message: 'The previously opened file has been deleted or moved',
        },
        success: {
          title: 'Last File Loaded',
        },
      },
      openFile: {
        unsavedChanges: {
          title: 'Notice',
          message: 'Current document has unsaved changes. Continue to open?',
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel',
          thirdButtonText: 'Discard & Continue',
        },
        pathError: 'Failed to get file path',
        notExist: 'File does not exist',
        success: {
          title: 'File Opened Successfully',
        },
        readError: 'Failed to read file',
      },
      saveFile: {
        pathError: 'Failed to get file path',
        notModified: {
          title: 'Notice',
          message: 'Content unchanged, no need to save',
        },
        success: {
          title: 'File Saved Successfully',
        },
        saveError: 'Failed to save file',
      },
      exportFile: {
        unsavedChanges: {
          title: 'Notice',
          message: 'Current document has unsaved changes. Continue to export?',
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel',
          thirdButtonText: 'Discard & Continue',
        },
        emptyContent: {
          title: 'Notice',
          message: 'Editor content is empty, cannot export',
        },
        pathError: 'Failed to get file path',
        success: {
          title: 'File Exported Successfully',
        },
        exportError: {
          title: 'Export Failed',
          message: 'Failed to export file',
        },
      },
      exportPdf: {
        emptyContent: {
          title: 'Notice',
          message: 'Editor content is empty, cannot export PDF',
        },
        converting: {
          title: 'Notice',
          message: 'Converting, please wait...',
        },
        processingImages: {
          title: 'Processing Images',
          message: 'Processing {count} images, please wait...',
        },
        imageProgress: {
          message: 'Processing images ({current}/{total})...',
        },
        success: {
          title: 'PDF Exported Successfully',
        },
        exportError: {
          title: 'PDF Export Failed',
          message: 'Failed to export PDF',
        },
        cancelled: {
          title: 'Cancelled',
          message: 'PDF export cancelled',
        },
        fileSaved: 'PDF file saved',
      },
      about: {
        title: 'About',
      },
      // 导出HTML
      exportHtml: {
        emptyContent: {
          title: 'Notice',
          message: 'Editor content is empty, cannot export HTML',
        },
        converting: {
          title: 'Notice',
          message: 'Generating HTML file, please wait...',
        },
        processingImages: {
          title: 'Processing Images',
          message: 'Processing {count} images, please wait...',
        },
        imageProgress: {
          message: 'Processing images ({current}/{total})...',
        },
        success: {
          title: 'HTML Exported Successfully',
        },
        exportError: {
          title: 'HTML Export Failed',
          message: 'Failed to export HTML',
        },
        cancelled: {
          title: 'Cancelled',
          message: 'HTML export cancelled',
        },
        fileSaved: 'HTML file saved',
      },
      uploading: {
        title: 'Uploading',
        message: 'Uploading file...',
      },
      uploadSuccess: {
        title: 'Upload Successful',
        message: '{count} file(s) uploaded successfully',
      },
      uploadFailed: {
        title: 'Upload Failed',
        message: '{count} file(s) failed to upload, please check file permissions and storage space',
      },
      uploadNoFile: {
        title: 'Save File First',
        message: 'The current document has not been saved locally. Please save the file (Ctrl+S) before uploading.',
        confirmButtonText: 'OK',
      },
      updater: {
        available: 'Update Available',
        availableMsg: 'Version {version} is available. Would you like to update now?',
        releaseNotes: 'Release Notes',
        noUpdate: 'Up to Date',
        noUpdateMsg: 'You are already using the latest version',
        downloading: 'Downloading Update',
        downloadProgress: 'Progress: {progress}%',
        downloadComplete: 'Download complete, preparing to install...',
        installConfirm: 'Update downloaded. Restart now to install?',
        error: 'Update Failed',
        errorMsg: 'Error checking for updates: {error}',
      },
      // Image Host Settings
      imageHost: {
        title: 'Image Host Settings',
        enableLabel: 'Enable Image Host Upload',
        enableDescription: 'When enabled, images will be uploaded to cloud host; otherwise use local storage',
        storageType: {
          label: 'Configuration Storage',
          tauriStore: 'Use App Internal Storage (Recommended)',
          picgoNative: 'Use PicGo Native Config File',
        },
        save: 'Save',
        cancel: 'Cancel',
        testConnection: 'Test Connection',
        saveSuccess: 'Image host configuration saved successfully',
        saveFailed: 'Failed to save image host configuration',
        testSuccess: 'Connection test successful',
        testFailed: 'Connection test failed',
        selectHostType: 'Please select an image host type',
        fillRequiredFields: 'Please fill in required fields',
        importConfig: 'Import PicGo Config',
        importSuccess: 'PicGo config imported successfully',
        importFailed: 'PicGo config import failed, please check if config file exists',
        resetConfig: 'Reset Config',
        // Form validation messages
        validationMessages: {
          tokenRequired: 'Token is required',
          repoRequired: 'Repository is required',
          ownerRequired: 'Owner is required',
          accessKeyIdRequired: 'AccessKey ID is required',
          accessKeySecretRequired: 'AccessKey Secret is required',
          bucketRequired: 'Bucket name is required',
          areaRequired: 'Storage area is required',
        },
        // Form labels
        labels: {
          repo: 'Repository',
          branch: 'Branch',
          token: 'Token',
          path: 'Storage Path',
          customUrl: 'Custom URL',
          owner: 'Owner',
          accessKeyId: 'AccessKey ID',
          accessKeySecret: 'AccessKey Secret',
          bucket: 'Bucket Name',
          area: 'Storage Area',
          options: 'URL Suffix',
          backupDomain: 'Backup Domain',
        },
        // Form placeholders
        placeholders: {
          repo: 'Format: username/repo',
          branch: 'Default: master',
          token: 'Personal Access Token',
          path: 'e.g. images/ (optional)',
          customUrl: 'e.g. https://cdn.jsdelivr.net/gh/... (optional)',
          owner: 'Username or organization of the repository',
          ownerRepo: 'Repository name',
          giteeToken: 'Private token',
          giteeCustomUrl: 'e.g. https://gitee.com/.../raw/... (optional)',
          bucket: 'Storage space name',
          area: 'e.g. oss-cn-hangzhou',
          aliyunCustomUrl: 'e.g. https://your-domain.com (optional)',
          options: 'e.g. ?imgslim (optional)',
          backupDomain: 'e.g. smms.app (optional)',
          smmsToken: 'Please enter SM.MS Token',
        },
      },
    },
  },

  // 日文
  ja_JP: {
    menu: {
      file: 'ファイル',
      new: '新規作成',
      open: '開く',
      save: '保存',
      export: 'エクスポート',
      exportMd: 'Markdown でエクスポート',
      exportPdf: 'PDF でエクスポート',
      exportHtml: 'HTML でエクスポート',
      print: '印刷',
      appearance: '外観',
      settings: '設定',
      help: 'ヘルプ',
      viewLog: 'ログを表示',
      devTools: '開発者ツール',
      about: 'について',
      checkUpdate: 'アップデートを確認',
      scrollRemember: '閲覧位置を記憶',
      multiTabMode: 'マルチタブモード',
      zenMode: 'Zen モード',
      imageHostSettings: '画像ホスト設定',
      fontSizeSettings: 'フォントサイズ',
    },
    windowTitle: {
      appName: 'Tauri Markdown',
      untitled: '無題',
      modifiedMarker: '*',
      tabSeparator: ' - ',
    },
    shortcuts: {
      new: 'Ctrl+N',
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
      print: 'Ctrl+P',
      zenMode: 'F11',
    },
    language: {
      label: '言語',
      chinese: '中文',
      english: 'English',
      japanese: '日本語',
      korean: '한국어',
    },
    theme: {
      label: 'テーマ',
      auto: 'システムに従う',
      light: 'ライト',
      dark: 'ダーク',
    },
    dragDrop: {
      hint: 'ドロップしてMarkdownファイルを開く',
      title: 'サポート外の形式',
      unsupported: 'Markdownファイル以外はドラッグ&ドロップに対応していません',
    },
    findReplace: {
      find: '検索',
      replace: '置換',
      findPlaceholder: '検索...',
      replacePlaceholder: '置換...',
      previous: '前へ',
      next: '次へ',
      replaceCurrent: '置換',
      replaceAll: 'すべて置換',
      noResults: '結果なし',
      matchCount: '{current} / {total}',
      showReplace: '置換を表示',
      hideReplace: '置換を非表示',
      tooltip: '検索/置換 (Ctrl+F)',
    },
    revealInFolder: {
      tooltip: 'フォルダーで表示',
      noFile: '現在のドキュメントは未保存のため、フォルダーを開けません',
      failed: 'ファイルのあるフォルダーを開けませんでした',
    },
    fontSizeSettings: {
      title: 'フォントサイズ',
      description: 'エディター内の Markdown 表示フォントサイズを調整します。ファイル内容は変更されません。',
      unit: 'px',
      reset: 'デフォルトに戻す',
      confirm: 'OK',
    },
    zenTipEnter: 'Zen モードに入りました。ESC キーを押して終了します',
    zenTipExit: 'Zen モードを終了しました',
    notifications: {
      // タブ操作
      tabs: {
        // 新しいタブ
        newTab: {
          unsavedChanges: {
            title: 'お知らせ',
            message: '現在のタブには未保存の変更があります。新しいタブを続けて作成しますか？',
            confirmButtonText: '続行',
            cancelButtonText: 'キャンセル',
            thirdButtonText: '保存せずに続行',
          },
        },
        // タブを閉じる
        closeTab: {
          unsavedChanges: {
            title: 'お知らせ',
            message: 'タブ "{fileName}" には未保存の変更があります。保存して閉じますか？',
            confirmButtonText: '保存して閉じる',
            cancelButtonText: 'キャンセル',
            thirdButtonText: '破棄',
          },
        },
        // すべてのタブを閉じる
        closeAllTabs: {
          unsavedChanges: {
            title: 'お知らせ',
            message: '{count} 個のタブに未保存の変更があります。保存しますか？',
            confirmButtonText: 'すべて保存',
            cancelButtonText: 'すべて破棄',
            thirdButtonText: 'キャンセル',
          },
        },
      },
      newFile: {
        unsavedChanges: {
          title: 'お知らせ',
          message: '現在のドキュメントには未保存の変更があります。新規作成を続行しますか？',
          confirmButtonText: '続行',
          cancelButtonText: 'キャンセル',
          thirdButtonText: '保存せずに続行',
        },
      },
      closeWindow: {
        unsavedChanges: {
          title: 'お知らせ',
          message: '現在のドキュメントには未保存の変更があります。保存しますか？',
          confirmButtonText: '保存して閉じる',
          cancelButtonText: 'キャンセル',
          thirdButtonText: '破棄',
        },
      },
      fileConflict: {
        title: 'ファイルの競合',
        message: 'ファイル "{fileName}" は外部で変更されました。\n\n外部の変更を上書きしますか？',
        confirmButtonText: '上書き保存',
        cancelButtonText: 'キャンセル',
      },
      fileExternalChange: {
        title: 'ファイルが変更されました',
        message: 'ファイル "{fileName}" は外部で変更されました。\n\n再読み込みしますか？',
        messageWithUnsaved: 'ファイル "{fileName}" は外部で変更されました。\n\n再読み込みすると未保存の変更が失われます。続行しますか？',
        confirmButtonText: '再読み込み',
        cancelButtonText: '現在の内容を保持',
      },
      fileExternalDeleted: {
        title: 'ファイルが削除されました',
        message: 'このタブのファイル "{fileName}" は外部で削除されました。エディターの内容は保持されています。',
      },
      autoLoad: {
        fileNotExist: {
          title: 'ファイルが見つかりません',
          message: '前回開いたファイルは削除または移動されました',
        },
        success: {
          title: '前回のファイルを読み込みました',
        },
      },
      openFile: {
        unsavedChanges: {
          title: 'お知らせ',
          message: '現在のドキュメントには未保存の変更があります。開きますか？',
          confirmButtonText: '続行',
          cancelButtonText: 'キャンセル',
          thirdButtonText: '保存せずに続行',
        },
        pathError: 'ファイルパスの取得に失敗しました',
        notExist: 'ファイルが存在しません',
        success: {
          title: 'ファイルを開きました',
        },
        readError: 'ファイルの読み込みに失敗しました',
      },
      saveFile: {
        pathError: 'ファイルパスの取得に失敗しました',
        notModified: {
          title: 'お知らせ',
          message: 'コンテンツは変更されていません。保存の必要はありません',
        },
        success: {
          title: 'ファイルを保存しました',
        },
        saveError: 'ファイルの保存に失敗しました',
      },
      exportFile: {
        unsavedChanges: {
          title: 'お知らせ',
          message: '現在のドキュメントには未保存の変更があります。エクスポートしますか？',
          confirmButtonText: '続行',
          cancelButtonText: 'キャンセル',
          thirdButtonText: '保存せずに続行',
        },
        emptyContent: {
          title: 'お知らせ',
          message: 'エディタのコンテンツが空のため、エクスポートできません',
        },
        pathError: 'ファイルパスの取得に失敗しました',
        success: {
          title: 'ファイルをエクスポートしました',
        },
        exportError: {
          title: 'エクスポート失敗',
          message: 'ファイルのエクスポートに失敗しました',
        },
      },
      exportPdf: {
        emptyContent: {
          title: 'お知らせ',
          message: 'エディタのコンテンツが空のため、PDFエクスポートできません',
        },
        converting: {
          title: 'お知らせ',
          message: '変換中、少々お待ちください...',
        },
        processingImages: {
          title: '画像を処理中',
          message: '{count}枚の画像を処理中です。お待ちください...',
        },
        imageProgress: {
          message: '画像を処理中 ({current}/{total})...',
        },
        success: {
          title: 'PDFエクスポート成功',
        },
        exportError: {
          title: 'PDFエクスポート失敗',
          message: 'PDFエクスポートに失敗しました',
        },
        cancelled: {
          title: 'キャンセル済み',
          message: 'PDFエクスポートがキャンセルされました',
        },
        fileSaved: 'PDFファイルを保存しました',
      },
      about: {
        title: 'について',
      },
      // 导出HTML
      exportHtml: {
        emptyContent: {
          title: 'お知らせ',
          message: 'エディタのコンテンツが空のため、HTMLエクスポートできません',
        },
        converting: {
          title: 'お知らせ',
          message: 'HTMLファイルを生成中、少々お待ちください...',
        },
        processingImages: {
          title: '画像を処理中',
          message: '{count}枚の画像を処理中です。お待ちください...',
        },
        imageProgress: {
          message: '画像を処理中 ({current}/{total})...',
        },
        success: {
          title: 'HTMLエクスポート成功',
        },
        exportError: {
          title: 'HTMLエクスポート失敗',
          message: 'HTMLエクスポートに失敗しました',
        },
        cancelled: {
          title: 'キャンセル済み',
          message: 'HTMLエクスポートがキャンセルされました',
        },
        fileSaved: 'HTMLファイルを保存しました',
      },
      uploading: {
        title: 'アップロード中',
        message: 'ファイルをアップロード中...',
      },
      uploadSuccess: {
        title: 'アップロード成功',
        message: '{count} ファイルを正常にアップロードしました',
      },
      uploadFailed: {
        title: 'アップロード失敗',
        message: '{count} ファイルのアップロードに失敗しました。ファイルの権限とストレージ容量を確認してください',
      },
      uploadNoFile: {
        title: 'ファイルを先に保存してください',
        message: '現在のドキュメントはローカルに保存されていません。アップロードする前に、ファイルを保存(Ctrl+S)してください。',
        confirmButtonText: '了解',
      },
      updater: {
        available: 'アップデートがあります',
        availableMsg: 'バージョン {version} が利用可能です。今すぐアップデートしますか？',
        releaseNotes: 'リリースノート',
        noUpdate: '最新バージョンです',
        noUpdateMsg: '現在のバージョンは最新です',
        downloading: 'アップデートをダウンロード中',
        downloadProgress: '進行状況: {progress}%',
        downloadComplete: 'ダウンロード完了、インストール準備中...',
        installConfirm: 'アップデートのダウンロードが完了しました。今すぐ再起動してインストールしますか？',
        error: 'アップデートエラー',
        errorMsg: 'アップデート確認中にエラーが発生しました: {error}',
      },
      // 画像ホスト設定
      imageHost: {
        title: '画像ホスト設定',
        enableLabel: '画像ホストアップロードを有効化',
        enableDescription: '有効にすると、画像はクラウドホストにアップロードされます。無効ならローカルストレージを使用します',
        storageType: {
          label: '設定の保存方法',
          tauriStore: 'アプリ内部ストレージを使用（推奨）',
          picgoNative: 'PicGo ネイティブ設定ファイルを使用',
        },
        save: '保存',
        cancel: 'キャンセル',
        testConnection: '接続テスト',
        saveSuccess: '画像ホスト設定が正常に保存されました',
        saveFailed: '画像ホスト設定の保存に失敗しました',
        testSuccess: '接続テストに成功しました',
        testFailed: '接続テストに失敗しました',
        selectHostType: '画像ホストタイプを選択してください',
        fillRequiredFields: '必須項目を入力してください',
        importConfig: 'PicGo 設定をインポート',
        importSuccess: 'PicGo 設定のインポートに成功しました',
        importFailed: 'PicGo 設定のインポートに失敗しました。設定ファイルの存在を確認してください',
        resetConfig: '設定をリセット',
        // フォーム検証メッセージ
        validationMessages: {
          tokenRequired: 'トークンは必須です',
          repoRequired: 'リポジトリは必須です',
          ownerRequired: 'オーナーは必須です',
          accessKeyIdRequired: 'AccessKey ID は必須です',
          accessKeySecretRequired: 'AccessKey Secret は必須です',
          bucketRequired: 'バケット名は必須です',
          areaRequired: 'ストレージエリアは必須です',
        },
        // フォームラベル
        labels: {
          repo: 'リポジトリ',
          branch: 'ブランチ',
          token: 'Token',
          path: 'ストレージパス',
          customUrl: 'カスタムURL',
          owner: 'オーナー',
          accessKeyId: 'AccessKey ID',
          accessKeySecret: 'AccessKey Secret',
          bucket: 'Bucket 名',
          area: 'ストレージエリア',
          options: 'URL サフィックス',
          backupDomain: 'バックアップドメイン',
        },
        // フォームプレースホルダー
        placeholders: {
          repo: '形式: username/repo',
          branch: 'デフォルト: master',
          token: 'Personal Access Token',
          path: '例: images/ (オプション)',
          customUrl: '例: https://cdn.jsdelivr.net/gh/... (オプション)',
          owner: 'リポジトリのユーザー名または組織',
          ownerRepo: 'リポジトリ名',
          giteeToken: 'プライベートトークン',
          giteeCustomUrl: '例: https://gitee.com/.../raw/... (オプション)',
          bucket: 'ストレージスペース名',
          area: '例: oss-cn-hangzhou',
          aliyunCustomUrl: '例: https://your-domain.com (オプション)',
          options: '例: ?imgslim (オプション)',
          backupDomain: '例: smms.app (オプション)',
          smmsToken: 'SM.MS Token を入力してください',
        },
      },
    },
  },

  // 韩文
  ko_KR: {
    menu: {
      file: '파일',
      new: '새로 만들기',
      open: '열기',
      save: '저장',
      export: '내보내기',
      exportMd: 'Markdown으로 내보내기',
      exportPdf: 'PDF로 내보내기',
      exportHtml: 'HTML로 내보내기',
      print: '인쇄',
      appearance: '모양',
      settings: '설정',
      help: '도움말',
      viewLog: '로그 보기',
      devTools: '개발자 도구',
      about: '정보',
      checkUpdate: '업데이트 확인',
      scrollRemember: '읽기 위치 기억',
      multiTabMode: '멀티탭 모드',
      zenMode: 'Zen 모드',
      imageHostSettings: '이미지 호스트 설정',
      fontSizeSettings: '글꼴 크기',
    },
    windowTitle: {
      appName: 'Tauri Markdown',
      untitled: '제목 없음',
      modifiedMarker: '*',
      tabSeparator: ' - ',
    },
    shortcuts: {
      new: 'Ctrl+N',
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
      print: 'Ctrl+P',
      zenMode: 'F11',
    },
    language: {
      label: '언어',
      chinese: '中文',
      english: 'English',
      japanese: '日本語',
      korean: '한국어',
    },
    theme: {
      label: '테마',
      auto: '시스템 따르기',
      light: '라이트',
      dark: '다크',
    },
    dragDrop: {
      hint: '드롭하여 Markdown 파일 열기',
      title: '지원되지 않는 형식',
      unsupported: 'Markdown 파일만 드래그 앤 드롭이 가능합니다',
    },
    findReplace: {
      find: '찾기',
      replace: '바꾸기',
      findPlaceholder: '찾기...',
      replacePlaceholder: '바꾸기...',
      previous: '이전',
      next: '다음',
      replaceCurrent: '바꾸기',
      replaceAll: '모두 바꾸기',
      noResults: '결과 없음',
      matchCount: '{current} / {total}',
      showReplace: '바꾸기 표시',
      hideReplace: '바꾸기 숨기기',
      tooltip: '찾기/바꾸기 (Ctrl+F)',
    },
    revealInFolder: {
      tooltip: '폴더에서 표시',
      noFile: '현재 문서가 아직 저장되지 않아 폴더를 열 수 없습니다',
      failed: '파일이 있는 폴더를 열 수 없습니다',
    },
    fontSizeSettings: {
      title: '글꼴 크기',
      description: '편집기 내 Markdown 표시 글꼴 크기를 조정합니다. 파일 내용은 변경되지 않습니다.',
      unit: 'px',
      reset: '기본값으로',
      confirm: '확인',
    },
    zenTipEnter: 'Zen 모드로 진입했습니다. ESC 키를 눌러 종료하세요',
    zenTipExit: 'Zen 모드를 종료했습니다',
    notifications: {
      // 탭 작업
      tabs: {
        // 새 탭
        newTab: {
          unsavedChanges: {
            title: '알림',
            message: '현재 탭에 저장되지 않은 변경 사항이 있습니다. 새 탭을 계속 만드시겠습니까?',
            confirmButtonText: '계속',
            cancelButtonText: '취소',
            thirdButtonText: '저장하지 않고 계속',
          },
        },
        // 탭 닫기
        closeTab: {
          unsavedChanges: {
            title: '알림',
            message: '탭 "{fileName}"에 저장되지 않은 변경 사항이 있습니다. 저장 후 닫으시겠습니까?',
            confirmButtonText: '저장 후 닫기',
            cancelButtonText: '취소',
            thirdButtonText: '버리기',
          },
        },
        // 모든 탭 닫기
        closeAllTabs: {
          unsavedChanges: {
            title: '알림',
            message: '{count}개의 탭에 저장되지 않은 변경 사항이 있습니다. 저장하시겠습니까?',
            confirmButtonText: '모두 저장',
            cancelButtonText: '모두 버리기',
            thirdButtonText: '취소',
          },
        },
      },
      newFile: {
        unsavedChanges: {
          title: '알림',
          message: '현재 문서에 저장되지 않은 변경 사항이 있습니다. 새로 만들기를 계속하시겠습니까?',
          confirmButtonText: '계속',
          cancelButtonText: '취소',
          thirdButtonText: '저장하지 않고 계속',
        },
      },
      closeWindow: {
        unsavedChanges: {
          title: '알림',
          message: '현재 문서에 저장되지 않은 변경 사항이 있습니다. 저장하시겠습니까?',
          confirmButtonText: '저장 후 닫기',
          cancelButtonText: '취소',
          thirdButtonText: '버리기',
        },
      },
      fileConflict: {
        title: '파일 충돌',
        message: '파일 "{fileName}"이(가) 외부에서 수정되었습니다.\n\n외부 변경 사항을 덮어쓰시겠습니까?',
        confirmButtonText: '덮어쓰기',
        cancelButtonText: '취소',
      },
      fileExternalChange: {
        title: '파일이 변경됨',
        message: '파일 "{fileName}"이(가) 외부에서 수정되었습니다.\n\n다시 불러오시겠습니까?',
        messageWithUnsaved: '파일 "{fileName}"이(가) 외부에서 수정되었습니다.\n\n다시 불러오면 저장하지 않은 변경 사항이 사라집니다. 계속하시겠습니까?',
        confirmButtonText: '다시 불러오기',
        cancelButtonText: '현재 내용 유지',
      },
      fileExternalDeleted: {
        title: '파일이 삭제됨',
        message: '이 탭의 파일 "{fileName}"이(가) 외부에서 삭제되었습니다. 편집기 내용은 유지됩니다.',
      },
      autoLoad: {
        fileNotExist: {
          title: '파일을 찾을 수 없습니다',
          message: '이전에 열었던 파일이 삭제되었거나 이동되었습니다',
        },
        success: {
          title: '이전 파일 로드됨',
        },
      },
      openFile: {
        unsavedChanges: {
          title: '알림',
          message: '현재 문서에 저장되지 않은 변경 사항이 있습니다. 열기를 계속하시겠습니까?',
          confirmButtonText: '계속',
          cancelButtonText: '취소',
          thirdButtonText: '저장하지 않고 계속',
        },
        pathError: '파일 경로를 가져오지 못했습니다',
        notExist: '파일이 존재하지 않습니다',
        success: {
          title: '파일을 열었습니다',
        },
        readError: '파일 읽기에 실패했습니다',
      },
      saveFile: {
        pathError: '파일 경로를 가져오지 못했습니다',
        notModified: {
          title: '알림',
          message: '콘텐츠가 변경되지 않았습니다. 저장할 필요가 없습니다',
        },
        success: {
          title: '파일을 저장했습니다',
        },
        saveError: '파일 저장에 실패했습니다',
      },
      exportFile: {
        unsavedChanges: {
          title: '알림',
          message: '현재 문서에 저장되지 않은 변경 사항이 있습니다. 내보내기를 계속하시겠습니까?',
          confirmButtonText: '계속',
          cancelButtonText: '취소',
          thirdButtonText: '저장하지 않고 계속',
        },
        emptyContent: {
          title: '알림',
          message: '편집기 콘텐츠가 비어 있어 내보낼 수 없습니다',
        },
        pathError: '파일 경로를 가져오지 못했습니다',
        success: {
          title: '파일을 내보냈습니다',
        },
        exportError: {
          title: '내보내기 실패',
          message: '파일 내보내기에 실패했습니다',
        },
      },
      exportPdf: {
        emptyContent: {
          title: '알림',
          message: '편집기 콘텐츠가 비어 있어 PDF 내보낼 수 없습니다',
        },
        converting: {
          title: '알림',
          message: '변환 중입니다, 잠시만 기다려주세요...',
        },
        processingImages: {
          title: '이미지 처리 중',
          message: '{count}개의 이미지를 처리 중입니다. 잠시만 기다려주세요...',
        },
        imageProgress: {
          message: '이미지 처리 중 ({current}/{total})...',
        },
        success: {
          title: 'PDF 내보내기 성공',
        },
        exportError: {
          title: 'PDF 내보내기 실패',
          message: 'PDF 내보내기에 실패했습니다',
        },
        cancelled: {
          title: '취소됨',
          message: 'PDF 내보내기가 취소되었습니다',
        },
        fileSaved: 'PDF 파일이 저장되었습니다',
      },
      about: {
        title: '정보',
      },
      // 导出HTML
      exportHtml: {
        emptyContent: {
          title: '알림',
          message: '편집기 콘텐츠가 비어 있어 HTML 내보낼 수 없습니다',
        },
        converting: {
          title: '알림',
          message: 'HTML 파일 생성 중입니다, 잠시만 기다려주세요...',
        },
        processingImages: {
          title: '이미지 처리 중',
          message: '{count}개의 이미지를 처리 중입니다. 잠시만 기다려주세요...',
        },
        imageProgress: {
          message: '이미지 처리 중 ({current}/{total})...',
        },
        success: {
          title: 'HTML 내보내기 성공',
        },
        exportError: {
          title: 'HTML 내보내기 실패',
          message: 'HTML 내보내기에 실패했습니다',
        },
        cancelled: {
          title: '취소됨',
          message: 'HTML 내보내기가 취소되었습니다',
        },
        fileSaved: 'HTML 파일이 저장되었습니다',
      },
      uploading: {
        title: '업로드 중',
        message: '파일 업로드 중...',
      },
      uploadSuccess: {
        title: '업로드 성공',
        message: '{count} 파일을 성공적으로 업로드했습니다',
      },
      uploadFailed: {
        title: '업로드 실패',
        message: '{count} 파일 업로드에 실패했습니다. 파일 권한과 저장 공간을 확인해주세요',
      },
      uploadNoFile: {
        title: '파일을 먼저 저장하세요',
        message: '현재 문서가 로컬에 저장되지 않았습니다. 업로드하기 전에 파일을 저장(Ctrl+S)해주세요.',
        confirmButtonText: '확인',
      },
      updater: {
        available: '업데이트 가능',
        availableMsg: '버전 {version}이(가) 있습니다. 지금 업데이트하시겠습니까?',
        releaseNotes: '릴리스 노트',
        noUpdate: '최신 버전입니다',
        noUpdateMsg: '현재 버전이 최신입니다',
        downloading: '업데이트 다운로드 중',
        downloadProgress: '진행률: {progress}%',
        downloadComplete: '다운로드 완료, 설치 준비 중...',
        installConfirm: '업데이트 다운로드가 완료되었습니다. 지금 재시작하여 설치하시겠습니까?',
        error: '업데이트 오류',
        errorMsg: '업데이트 확인 중 오류 발생: {error}',
      },
      // 이미지 호스트 설정
      imageHost: {
        title: '이미지 호스트 설정',
        enableLabel: '이미지 호스트 업로드 활성화',
        enableDescription: '활성화하면 이미지가 클라우드 호스트로 업로드됩니다. 비활성화하면 로컬 저장소를 사용합니다',
        storageType: {
          label: '설정 저장 방식',
          tauriStore: '앱 내부 저장소 사용 (권장)',
          picgoNative: 'PicGo 네이티브 설정 파일 사용',
        },
        save: '저장',
        cancel: '취소',
        testConnection: '연결 테스트',
        saveSuccess: '이미지 호스트 설정이 성공적으로 저장되었습니다',
        saveFailed: '이미지 호스트 설정 저장 실패',
        testSuccess: '연결 테스트 성공',
        testFailed: '연결 테스트 실패',
        selectHostType: '이미지 호스트 유형을 선택하세요',
        fillRequiredFields: '필수 항목을 입력하세요',
        importConfig: 'PicGo 설정 가져오기',
        importSuccess: 'PicGo 설정 가져오기 성공',
        importFailed: 'PicGo 설정 가져오기 실, 설정 파일이 존재하는지 확인하세요',
        resetConfig: '설정 초기화',
        // 폼 검증 메시지
        validationMessages: {
          tokenRequired: 'Token 이 필요합니다',
          repoRequired: '저장소가 필요합니다',
          ownerRequired: '소유자가 필요합니다',
          accessKeyIdRequired: 'AccessKey ID가 필요합니다',
          accessKeySecretRequired: 'AccessKey Secret이 필요합니다',
          bucketRequired: '버킷 이름이 필요합니다',
          areaRequired: '저장 영역이 필요합니다',
        },
        // 폼 라벨
        labels: {
          repo: '저장소',
          branch: '브랜치',
          token: 'Token',
          path: '저장소 경로',
          customUrl: '사용자 정의 URL',
          owner: '소유자',
          accessKeyId: 'AccessKey ID',
          accessKeySecret: 'AccessKey Secret',
          bucket: 'Bucket 이름',
          area: '저장 영역',
          options: 'URL 접미사',
          backupDomain: '백업 도메인',
        },
        // 폼 플레이스홀더
        placeholders: {
          repo: '형식: username/repo',
          branch: '기본값: master',
          token: 'Personal Access Token',
          path: '예: images/ (선택사항)',
          customUrl: '예: https://cdn.jsdelivr.net/gh/... (선택사항)',
          owner: '저장소의 사용자 이름 또는 조직',
          ownerRepo: '저장소 이름',
          giteeToken: '개인 토큰',
          giteeCustomUrl: '예: https://gitee.com/.../raw/... (선택사항)',
          bucket: '저장 공간 이름',
          area: '예: oss-cn-hangzhou',
          aliyunCustomUrl: '예: https://your-domain.com (선택사항)',
          options: '예: ?imgslim (선택사항)',
          backupDomain: '예: smms.app (선택사항)',
          smmsToken: 'SM.MS Token 을 입력하세요',
        },
      },
    },
  },
};
