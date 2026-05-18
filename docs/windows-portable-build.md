# Windows 便携版构建指南

## 概述

本项目支持生成 Windows 便携版分发包，无需安装即可运行。

## 构建方法

### 方法一：使用 npm 脚本（推荐）

```bash
npm run build:portable
```

这将自动：
1. 构建 Tauri 应用（仅生成 MSI 以节省时间）
2. 复制可执行文件和资源到便携目录
3. 创建 ZIP 压缩包
4. 同时生成立式 EXE 版本

### 方法二：手动构建

1. 正常构建应用：
   ```bash
   npm run tauri build
   ```

2. 从 `src-tauri/target/release/` 目录复制 `TauriMarkdown.exe`

3. 手动打包成 ZIP

## 输出文件

构建完成后，将在 `src-tauri/target/release/bundle/` 目录下生成：

- `portable/` - 便携版文件夹（包含所有必要文件）
- `TauriMarkdown_0.5.1_x64_portable.zip` - 便携版 ZIP 包
- `standalone/` - 独立 EXE 文件夹
- `TauriMarkdown_0.5.1_x64_standalone.zip` - 独立 EXE ZIP 包

## 系统要求

- Windows 10 20H2 或更高版本
- WebView2 Runtime（Windows 10/11 默认已安装）

## 注意事项

1. **数据存储**：
   - **便携版**：所有配置文件（`store.json`）和日志文件（`app.log`）都存储在**可执行文件同目录**
   - **安装版**：配置文件和日志存储在 `%APPDATA%\com.jeeinn.tauri-markdown\`
   - 便携版通过检测 `.portable` 标记文件自动切换存储路径

2. **自动更新**：便携版不支持 Tauri 原生自动更新功能。

3. **文件关联**：便携版不会注册文件关联，需要手动设置。

4. **代码签名**：正式发布前建议对 EXE 进行代码签名，避免 SmartScreen 拦截。

## CI/CD 集成

在 GitHub Actions 中使用：

```yaml
- name: Build Portable
  shell: pwsh
  run: npm run build:portable
```

## 故障排除

### 构建失败
- 确保已安装 Rust 和 Node.js
- 检查 PowerShell 执行策略：`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### ZIP 文件为空
- 检查 `src-tauri/target/release/` 目录是否有生成的 EXE 文件
- 确认构建过程没有错误

### WebView2 问题
- 目标机器需要安装 WebView2 Runtime
- 可在微软官网下载：https://developer.microsoft.com/microsoft-edge/webview2/
