import svgIcons from "./vditor-toolbar-svg.js";

export default {
  options: {
    // mode: 'sv', 默认为即时渲染ir模式
    // cdn: '..',
    // lang: self.lang,
    cache: {
      enable: false,
    },
    // placeholder: self.welcome,
    minHeight: 600,
    width: 'auto',
    outline: {
      enable: true, // 大纲模式
      position: 'left',
    },
    counter: {
      enable: true, // 计数，提示角标问题
      // max: 102400
    },
    toolbarConfig: {
      pin: true,
    },
    preview: {
      delay: 300,
      markdown: {
        toc: true,
        mark: true,
        footnotes: true,
        autoSpace: true,
      },
      math: {
        engine: 'KaTeX',
      },
      hljs: {
        enable: true,
        lineNumber: true,
      },
      theme: {
        current: 'light',
        list: {"ant-design": "Ant Design", dark: "Dark", light: "Light", wechat: "WeChat"},
      },
    },
    hint: {
      parse: true,
      delay: 500,
    },
    tab: '\t',
    after: () => {
      // this.vditor.setValue('# 🎉️ Welcome to use Tauri Vditor!')
    },
  },
  toolbar: [
    "|",
    {
      hotkey: '⌘z',
      name: 'undo',
      tipPosition: 's',
    },
    {
      hotkey: '⌘y',
      name: 'redo',
      tipPosition: 's',
      // tip: '恢复',
    },
    "|",
    {
      hotkey: '⌘e',
      name: 'emoji',
      tipPosition: 's',
    },
    {
      hotkey: '',
      name: 'headings',
      tipPosition: 's',
    },
    {
      hotkey: '⌘b',
      name: 'bold',
      tipPosition: 's',
    },
    {
      hotkey: '⌘i',
      name: 'italic',
      tipPosition: 's',
    },
    {
      hotkey: '',
      name: 'strike',
      tipPosition: 's',
    },
    {
      hotkey: '⌘k',
      name: 'link',
      tipPosition: 's',
    },
    "|",
    {
      hotkey: '⌘l',
      name: 'list',
      tipPosition: 's',
    },
    {
      hotkey: '',
      name: 'ordered-list',
      tipPosition: 's',
    },
    {
      hotkey: '⌘j',
      name: 'check',
      tipPosition: 's',
    },
    {
      hotkey: '',
      name: 'indent',
      tipPosition: 's',
    },
    {
      hotkey: '',
      name: 'outdent',
      tipPosition: 's',
    },
    "|",
    {
      hotkey: '⌘;',
      name: 'quote',
      tipPosition: 's',
      icon: svgIcons.quote
    },
    {
      hotkey: '⌘-',
      name: 'line',
      tipPosition: 's',
    },
    {
      hotkey: '⌘u',
      name: 'code',
      tipPosition: 's',
    },
    {
      hotkey: '',
      name: 'inline-code',
      tipPosition: 's',
    },
    {
      hotkey: '⌘m',
      name: 'table',
      tipPosition: 's',
    },
    {
      hotkey: '',
      name: 'insert-before',
      tipPosition: 's',
    },
    {
      hotkey: '',
      name: 'insert-after',
      tipPosition: 's',
    },
    // "|",
    // "upload",
    // "record",
    "|",
    {
      // hotkey: '',
      name: 'edit-mode',
      tipPosition: 's',
    },
  ]
}