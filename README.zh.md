# Tauri Markdown
一个简单的本地 Markdown 工具, 使用 Tauri &amp; Vditor &amp; Vue3

我们也可以叫它 `TMD` ? 🤔

[English](README.md)

(tag v0.1.0 used vue2)

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