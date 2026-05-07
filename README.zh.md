# Tauri Markdown
一个简单的本地 Markdown 工具, 使用 Tauri &amp; Vditor &amp; Vue3

我们也可以叫它 `TMD` ? 🤔

[English](README.md)

(tag v0.1.0 used vue2)

## v0.3.0+ 新功能

### 重大升级
- **Tauri 2.x 迁移**: 从 Tauri 1.x 升级到 2.x，采用新的插件架构
- **Vue 3.5+**: 更新到最新的 Vue 3，性能更优
- **Vditor 3.11+**: 增强的 Markdown 编辑器，功能更丰富
- **Element Plus 2.13+**: 现代化的 UI 组件

### 新增功能
- **图片上传支持**: 直接拖拽或粘贴图片到编辑器，自动管理图片资源
- **文件导出**: 使用 Ctrl+Shift+S 快捷键导出 Markdown 文件
- **自动打开上次文件**: 启动时自动打开上次编辑的文件
- **动态窗口标题**: 在窗口标题中显示当前文件名和修改状态
- **主题切换**: 支持自动/浅色/深色主题，可检测系统偏好
- **多语言支持**: 完整的国际化支持，包括简体中文、繁体中文、英语、日语和韩语
- **直接保存**: 按 Ctrl+S 直接保存文件，无需对话框
- **新建文件**: 使用 Ctrl+N 创建新的 Markdown 文件
- **增强菜单栏**: 自定义顶部应用菜单，显示键盘快捷键

### 改进优化
- **更好的图片路径处理**: 使用 Tauri 的 asset 协议智能映射图片路径
- **内容变更检测**: 跟踪修改以防止不必要的保存操作
- **改进的文件操作**: 更可靠的文件打开/保存，带有适当的错误处理
- **现代化构建工具**: 更新到 Vite 8 和最新的开发依赖

## 开发说明

### 安装 Tauri && tauri-bundler

查看 Tauri 官方文档: [文档](https://tauri.app/v1/guides/)

### 项目配置

```
npm install
```

### 开发和热更新

```
npm run tauri dev
```

### 编译发布

```
npm run tauri build
```

## 已知问题

- [x] Tauri 不能使用应用热键 `copy/paste` 查看问题: https://github.com/tauri-apps/tauri/pull/644
- [ ] 大纲视图标题不能跳转 (vditor in tauri)
- [ ] 分屏模式有光标问题 (vditor in tauri on macOS)

## 路线图
查看: https://github.com/jeeinn/tauri-markdown/discussions/1

## 感谢
* [tauri](https://github.com/tauri-apps/tauri)
* [vditor](https://github.com/Vanessa219/vditor)
* [element-plus](https://github.com/element-plus/element-plus)