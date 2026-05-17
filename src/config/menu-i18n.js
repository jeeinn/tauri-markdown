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
      appearance: '外观',
      settings: '设置',
      help: '帮助',
      viewLog: '查看日志',
      about: '关于',
      scrollRemember: '记住浏览位置',
      zenMode: 'Zen 模式',
    },
    windowTitle: {
      appName: 'Tauri Markdown',
      untitled: '未命名',
      modifiedMarker: '●',
    },
    shortcuts: {
      new: 'Ctrl+N',
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
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
    zenTipEnter: '已进入 Zen 模式，按 ESC 退出',
    zenTipExit: '已退出 Zen 模式',
    notifications: {
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
      appearance: 'Appearance',
      settings: 'Settings',
      help: 'Help',
      viewLog: 'View Log',
      about: 'About',
      scrollRemember: 'Remember Reading Position',
      zenMode: 'Zen Mode',
    },
    windowTitle: {
      appName: 'Tauri Markdown',
      untitled: 'Untitled',
      modifiedMarker: '●',
    },
    shortcuts: {
      new: 'Ctrl+N',
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
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
    zenTipEnter: 'Entered Zen Mode, press ESC to exit',
    zenTipExit: 'Exited Zen Mode',
    notifications: {
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
      appearance: '外観',
      settings: '設定',
      help: 'ヘルプ',
      viewLog: 'ログを表示',
      about: 'について',
      scrollRemember: '閲覧位置を記憶',
      zenMode: 'Zen モード',
    },
    windowTitle: {
      appName: 'Tauri Markdown',
      untitled: '無題',
      modifiedMarker: '●',
    },
    shortcuts: {
      new: 'Ctrl+N',
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
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
    zenTipEnter: 'Zen モードに入りました。ESC キーを押して終了します',
    zenTipExit: 'Zen モードを終了しました',
    notifications: {
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
        message: '現在のドキュメントはローカルに保存されていません。アップロードする前に、ファイルを保存（Ctrl+S）してください。',
        confirmButtonText: '了解',
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
      appearance: '모양',
      settings: '설정',
      help: '도움말',
      viewLog: '로그 보기',
      about: '정보',
      scrollRemember: '읽기 위치 기억',
      zenMode: 'Zen 모드',
    },
    windowTitle: {
      appName: 'Tauri Markdown',
      untitled: '제목 없음',
      modifiedMarker: '●',
    },
    shortcuts: {
      new: 'Ctrl+N',
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
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
    zenTipEnter: 'Zen 모드로 진입했습니다. ESC 키를 눌러 종료하세요',
    zenTipExit: 'Zen 모드를 종료했습니다',
    notifications: {
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
    },
  },
};
