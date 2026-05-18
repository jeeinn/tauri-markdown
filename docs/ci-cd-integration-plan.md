# CI/CD 集成与便携版发布方案

## 📋 概述

本文档说明如何将 Windows 便携版打包功能集成到 GitHub Actions CI/CD 流程中，并更新软件包下载建议。

---

## 🎯 目标

1. **自动化构建便携版**：在每次发布时自动生成便携版 ZIP
2. **统一发布流程**：将便携版与其他安装包一起发布到 GitHub Release
3. **更新下载文档**：在 README 和 Release 说明中添加便携版下载选项
4. **保持向后兼容**：不影响现有的 MSI/NSIS 构建流程

---

## 🔧 实施方案

### 方案一：在现有 workflow 中添加便携版构建（推荐）

#### 优点
- ✅ 复用现有的构建基础设施
- ✅ 所有安装包在同一 Release 中
- ✅ 维护成本低
- ✅ 统一的版本管理

#### 实施步骤

**1. 修改 `.github/workflows/release.yml`**

在 `build-upload` job 的 Windows 构建步骤后添加便携版构建：

```yaml
      - name: Build portable version (Windows)
        if: matrix.platform == 'windows-latest'
        shell: pwsh
        run: |
          # Extract version from tag
          $version = "${{ github.ref_name }}" -replace '^v', ''
          
          # Build portable version
          npm run build:portable -- -Version $version
          
          # Upload portable ZIP to release
          $portableZip = Get-ChildItem -Path "src-tauri/target/release/bundle" -Filter "*_portable.zip" | Select-Object -First 1
          if ($portableZip) {
            Write-Host "Uploading portable ZIP: $($portableZip.Name)"
            # The tauri-action will automatically upload all artifacts from bundle directory
          }
```

**2. 更新 Release Body**

在 `create-release` job 的 body 中添加便携版信息：

```yaml
body: |
  ## 📦 安装包下载 / Download Packages
  
  ### Windows
  
  | 格式 | 文件名 | 说明 |
  |------|--------|------|
  | **Portable ZIP** ⭐推荐 | `tauri-markdown_{version}_x64_portable.zip` | 便携版，无需安装，解压即用 |
  | NSIS 安装程序 | `TauriMarkdown_{version}_x64-setup.exe` | 标准安装程序 |
  | MSI 安装包 | `TauriMarkdown_{version}_x64_en-US.msi` | Windows Installer |
  
  > 💡 **便携版优势**：
  > - 所有配置文件存储在可执行文件同目录
  > - 可放在 U 盘中随身携带
  > - 不会在系统中留下任何痕迹
  > - 删除文件夹即完全卸载
```

---

### 方案二：创建独立的便携版构建 workflow

#### 优点
- ✅ 独立的构建流程，互不影响
- ✅ 可以单独触发便携版构建
- ✅ 更灵活的调度策略

#### 缺点
- ❌ 维护成本较高
- ❌ 需要额外的 Runner 时间
- ❌ 版本号同步复杂

#### 实施步骤

创建新文件 `.github/workflows/portable-build.yml`：

```yaml
name: Portable Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:  # 允许手动触发
    inputs:
      version:
        description: 'Version to build (e.g., 0.5.1)'
        required: true
        type: string

jobs:
  build-portable:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'
      
      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build portable version
        shell: pwsh
        run: |
          $version = "${{ github.event.inputs.version || github.ref_name }}" -replace '^v', ''
          npm run build:portable -- -Version $version
      
      - name: Upload to Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/release/bundle/*_portable.zip
            src-tauri/target/release/bundle/*_standalone.zip
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📝 推荐方案：方案一（集成到现有 workflow）

### 完整的 workflow 修改

```yaml
name: Release Build

on:
  push:
    tags:
      - 'v*'

jobs:
  create-release:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - name: Create GitHub release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: "Tauri Markdown ${{ github.ref_name }}"
          draft: true
          prerelease: true
          body: |
            ## 📦 安装包下载 / Download Packages
            
            ### Windows
            
            | 格式 | 文件名 | 说明 |
            |------|--------|------|
            | **Portable ZIP** ⭐推荐 | `tauri-markdown_{version}_x64_portable.zip` | 便携版，无需安装，解压即用 |
            | Standalone EXE | `tauri-markdown_{version}_x64_standalone.zip` | 独立 EXE 版 |
            | NSIS 安装程序 | `TauriMarkdown_{version}_x64-setup.exe` | 标准安装程序 |
            | MSI 安装包 | `TauriMarkdown_{version}_x64_en-US.msi` | Windows Installer |
            
            > 💡 **便携版优势**：
            > - ✅ 所有配置文件存储在可执行文件同目录
            > - ✅ 可放在 U 盘中随身携带
            > - ✅ 不会在系统中留下任何痕迹
            > - ✅ 删除文件夹即完全卸载
            > 
            > 💡 macOS: 解压后将 `.app` 拖入「应用程序」文件夹
            > 💡 Linux deb: `sudo dpkg -i <file>.deb`
            > 💡 Linux AppImage: `chmod +x <file>.AppImage && ./<file>.AppImage`
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-upload:
    needs: create-release
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            rust_targets: aarch64-apple-darwin,x86_64-apple-darwin
          - platform: ubuntu-22.04
            rust_targets: ''
          - platform: windows-latest
            rust_targets: ''

    runs-on: ${{ matrix.platform }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.rust_targets }}

      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install frontend dependencies
        run: npm ci

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "Tauri Markdown ${{ github.ref_name }}"
          releaseDraft: true
          prerelease: true
          updaterJsonPreferNsis: true

      - name: Build portable version (Windows only)
        if: matrix.platform == 'windows-latest'
        shell: pwsh
        run: |
          # Extract version from tag (remove 'v' prefix)
          $version = "${{ github.ref_name }}" -replace '^v', ''
          
          Write-Host "Building portable version $version..."
          
          # Build portable version using our script
          npm run build:portable -- -Version $version
          
          Write-Host "Portable build completed!"
          
          # List generated files
          Get-ChildItem -Path "src-tauri/target/release/bundle" -Filter "*.zip" | 
            ForEach-Object { Write-Host "Generated: $($_.Name)" }

      - name: Upload portable artifacts to release
        if: matrix.platform == 'windows-latest'
        uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/release/bundle/*_portable.zip
            src-tauri/target/release/bundle/*_standalone.zip
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📚 README 更新建议

### 在 README.md 中添加下载部分

在 `## Screenshots` 之后添加：

```markdown
## 📥 Download

Get the latest version from [GitHub Releases](https://github.com/jeeinn/tauri-markdown/releases).

### Windows

| Version | Description |
|---------|-------------|
| **Portable ZIP** ⭐ | No installation required, just extract and run. Perfect for USB drives! |
| NSIS Installer | Standard Windows installer with Start Menu shortcuts |
| MSI Package | Windows Installer package for enterprise deployment |

### macOS

| Architecture | Format |
|--------------|--------|
| Apple Silicon (M1/M2/M3) | DMG |
| Intel | DMG |

### Linux

| Distribution | Format |
|--------------|--------|
| Debian/Ubuntu | DEB |
| Fedora/RHEL | RPM |
| Any distro | AppImage |

> 💡 **Why choose Portable version?**
> - All configs stored alongside the executable
> - Carry it on USB drive anywhere
> - No traces left on your system
> - Delete folder = complete uninstall
```

### 中文 README (README.zh.md) 同步更新

```markdown
## 📥 下载

从 [GitHub Releases](https://github.com/jeeinn/tauri-markdown/releases) 获取最新版本。

### Windows

| 版本 | 说明 |
|------|------|
| **便携版 ZIP** ⭐推荐 | 无需安装，解压即用。适合 U 盘携带！ |
| NSIS 安装程序 | 标准 Windows 安装程序，创建开始菜单快捷方式 |
| MSI 安装包 | Windows Installer 包，适合企业部署 |

### macOS

| 架构 | 格式 |
|------|------|
| Apple Silicon (M1/M2/M3) | DMG |
| Intel | DMG |

### Linux

| 发行版 | 格式 |
|--------|------|
| Debian/Ubuntu | DEB |
| Fedora/RHEL | RPM |
| 任意发行版 | AppImage |

> 💡 **为什么选择便携版？**
> - 所有配置文件与可执行文件存储在同目录
> - 可放在 U 盘中随身携带
> - 不在系统中留下任何痕迹
> - 删除文件夹 = 完全卸载
```

---

## 🚀 实施步骤

### 第 1 步：更新 Workflow

1. 备份当前的 `release.yml`
2. 按照上述方案修改 workflow
3. 提交更改到 `feature/windows-portable-build` 分支

### 第 2 步：更新 README

1. 在 `README.md` 中添加下载部分
2. 在 `README.zh.md` 中同步更新
3. 提交更改

### 第 3 步：测试

1. 创建一个测试标签（如 `v0.5.2-beta`）
2. 推送到远程触发 CI/CD
3. 验证便携版是否正确生成和上传
4. 检查 Release 页面的下载链接

### 第 4 步：正式发布

1. 删除测试标签
2. 创建正式版本标签
3. 监控构建过程
4. 确认所有安装包都已上传

---

## 📊 预期效果

### GitHub Release 页面示例

```
## 📦 安装包下载 / Download Packages

### Windows

| 格式 | 文件名 | 说明 |
|------|--------|------|
| **Portable ZIP** ⭐推荐 | `tauri-markdown_0.5.1_x64_portable.zip` | 便携版，无需安装，解压即用 |
| Standalone EXE | `tauri-markdown_0.5.1_x64_standalone.zip` | 独立 EXE 版 |
| NSIS 安装程序 | `TauriMarkdown_0.5.1_x64-setup.exe` | 标准安装程序 |
| MSI 安装包 | `TauriMarkdown_0.5.1_x64_en-US.msi` | Windows Installer |

Assets:
📦 tauri-markdown_0.5.1_x64_portable.zip (10.57 MB)
📦 tauri-markdown_0.5.1_x64_standalone.zip (10.55 MB)
📦 TauriMarkdown_0.5.1_x64-setup.exe (12.3 MB)
📦 TauriMarkdown_0.5.1_x64_en-US.msi (11.8 MB)
```

---

## ⚠️ 注意事项

### 1. 构建时间

- 便携版构建会增加约 2-3 分钟的构建时间
- 只在 Windows runner 上执行，不影响其他平台

### 2. 存储空间

- 每个 Release 会增加约 21 MB（两个 ZIP 文件）
- GitHub Release 有充足的存储空间

### 3. 版本同步

- 确保便携版版本号与其他安装包一致
- 使用 `${{ github.ref_name }}` 自动提取版本号

### 4. 错误处理

- 如果便携版构建失败，不应影响其他平台的构建
- 使用 `continue-on-error: true`（可选）

---

## 🔄 后续优化

### 短期（1-2 周）

1. **添加构建缓存**：加速依赖安装
2. **并行构建**：同时构建多个平台
3. **构建通知**：Slack/Discord 通知构建状态

### 中期（1-2 月）

1. **自动化测试**：构建后自动运行测试
2. **代码签名**：对便携版 EXE 进行代码签名
3. **病毒扫描**：集成 VirusTotal API 扫描

### 长期（3-6 月）

1. **CDN 分发**：使用 CDN 加速下载
2. **增量更新**：支持便携版的增量更新机制
3. **多语言 Release**：自动生成多语言 Release 说明

---

## 📞 技术支持

如有问题，请查看：
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Tauri CI/CD 指南](https://tauri.app/v1/guides/building/ci/)
- [PowerShell 最佳实践](https://docs.microsoft.com/en-us/powershell/scripting/dev-cross-plat/vscode/using-vscode?view=powershell-7.4)

---

**最后更新**: 2026-05-17  
**适用版本**: v0.5.1+
