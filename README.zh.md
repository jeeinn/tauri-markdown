# Tauri Markdown
一个简单的本地 Markdown 工具, 使用 Tauri &amp; Vditor &amp; Vue3

我们也可以叫它 `TMD` ? 🤔

[English](README.md)

(tag v0.1.0 used vue2)

## 截图展示

### 浅色主题
![浅色主题](imgs/tmd_theme_light.png)

### 深色主题
![深色主题](imgs/tmd_theme_dark.png)

## 多标签页编辑器

TMD 支持同时打开多个文件，每个文件都有独立的标签页。

**功能特性：**
- 同时打开多个 Markdown 文件，每个文件在独立标签页中编辑
- 有未保存更改的标签页标题会显示 `●` 标记
- 标签页状态（打开的文件、当前激活标签）会自动保存，重启应用后自动恢复
- 支持将文件拖放到标签栏来在新标签页中打开

**键盘快捷键：**

| 快捷键 | 操作 |
|--------|------|
| `Ctrl+T` | 打开新标签页 |
| `Ctrl+W` | 关闭当前标签页 |
| `Ctrl+Tab` | 切换到下一个标签页 |

## 下载

从 [GitHub Releases](https://github.com/jeeinn/tauri-markdown/releases) 获取最新版本。

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解所有版本更新。

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

## 路线图
查看: https://github.com/jeeinn/tauri-markdown/discussions/1

## 感谢
* [tauri](https://github.com/tauri-apps/tauri)
* [vditor](https://github.com/Vanessa219/vditor)
* [element-plus](https://github.com/element-plus/element-plus)

> 项目 0.3.0+ 由阿里 Lingma 和小米 Mimo-v2.5-pro 合力编程完成。