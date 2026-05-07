/**
 * 自定义应用菜单栏的国际化配置
 * 用于顶部应用栏（文件、帮助菜单）和语言切换器
 */

export default {
  // 中文简体
  zh_CN: {
    menu: {
      file: '文件',
      open: '打开',
      save: '保存',
      export: '导出',
      help: '帮助',
      about: '关于',
    },
    shortcuts: {
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
    },
    language: '语言',
    notifications: {
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
        emptyContent: {
          title: '提示',
          message: '编辑器内容为空，无法导出',
        },
        pathError: '文件路径获取失败',
        success: {
          title: '文件导出成功',
        },
        exportError: '文件导出失败',
      },
      // 关于对话框
      about: {
        title: '关于程序',
      },
    },
  },
  
  // 英文
  en_US: {
    menu: {
      file: 'File',
      open: 'Open',
      save: 'Save',
      export: 'Export',
      help: 'Help',
      about: 'About',
    },
    shortcuts: {
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
    },
    language: 'Language',
    notifications: {
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
        emptyContent: {
          title: 'Notice',
          message: 'Editor content is empty, cannot export',
        },
        pathError: 'Failed to get file path',
        success: {
          title: 'File Exported Successfully',
        },
        exportError: 'Failed to export file',
      },
      about: {
        title: 'About',
      },
    },
  },
  
  // 日文
  ja_JP: {
    menu: {
      file: 'ファイル',
      open: '開く',
      save: '保存',
      export: 'エクスポート',
      help: 'ヘルプ',
      about: 'について',
    },
    shortcuts: {
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
    },
    language: '言語',
    notifications: {
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
        emptyContent: {
          title: 'お知らせ',
          message: 'エディタのコンテンツが空のため、エクスポートできません',
        },
        pathError: 'ファイルパスの取得に失敗しました',
        success: {
          title: 'ファイルをエクスポートしました',
        },
        exportError: 'ファイルのエクスポートに失敗しました',
      },
      about: {
        title: 'について',
      },
    },
  },
  
  // 韩文
  ko_KR: {
    menu: {
      file: '파일',
      open: '열기',
      save: '저장',
      export: '내보내기',
      help: '도움말',
      about: '정보',
    },
    shortcuts: {
      open: 'Ctrl+O',
      save: 'Ctrl+S',
      export: 'Ctrl+Shift+S',
    },
    language: '언어',
    notifications: {
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
        saveError: '파일 저장에 패했습니다',
      },
      exportFile: {
        emptyContent: {
          title: '알림',
          message: '편집기 콘텐츠가 비어 있어 내보낼 수 없습니다',
        },
        pathError: '파일 경로를 가져오지 못했습니다',
        success: {
          title: '파일을 내보냈습니다',
        },
        exportError: '파일 내보내기에 실패했습니다',
      },
      about: {
        title: '정보',
      },
    },
  },
}
