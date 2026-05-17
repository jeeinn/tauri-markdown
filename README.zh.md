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

## 📥 下载

从 [GitHub Releases](https://github.com/jeeinn/tauri-markdown/releases) 获取最新版本。

### Windows

| 版本 | 说明 |
|------|------|
| **便携版 ZIP** ⭐推荐 | 无需安装，解压即用。适合 U 盘携带！ |
| 独立 EXE 版 | 单个可执行文件，最小化包 |
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
> - ✅ 所有配置文件与可执行文件存储在同目录
> - ✅ 可放在 U 盘中随身携带
> - ✅ 不在系统中留下任何痕迹
> - ✅ 删除文件夹 = 完全卸载

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