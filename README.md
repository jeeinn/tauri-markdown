# Tauri Markdown
A simple local markdown tool, use Tauri &amp; Vditor &amp; Vue3

Maybe we can call it `TMD` ? 🤔

[简体中文](README.zh.md)

(tag v0.1.0 used vue2)

## Screenshots

### Light Theme
![Light Theme](imgs/tmd_theme_light.png)

### Dark Theme
![Dark Theme](imgs/tmd_theme_dark.png)

## 📥 Download

Get the latest version from [GitHub Releases](https://github.com/jeeinn/tauri-markdown/releases).

### Windows

| Version | Description |
|---------|-------------|
| **Portable ZIP** ⭐ | Full portable package with config files stored alongside executable. Perfect for USB drives! |
| Standalone EXE | Minimal package with only the executable. Create `.portable` file manually to enable portable mode. |
| NSIS Installer | Standard Windows installer with Start Menu shortcuts |
| MSI Package | Windows Installer package for enterprise deployment |

> 💡 **Portable ZIP vs Standalone EXE:**
> - **Portable ZIP**: Includes `.portable` marker file, README, and resources. Configs auto-saved in same directory.
> - **Standalone EXE**: Only the executable. Add `.portable` file manually if you want portable behavior.

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
> - ✅ All configs stored alongside the executable
> - ✅ Carry it on USB drive anywhere
> - ✅ No traces left on your system
> - ✅ Delete folder = complete uninstall

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for all version updates.

## Develop

### Install Tauri && tauri-bundler

See Tauri official: [docs](https://tauri.app/v1/guides/)

### Project setup

```
npm install
```

### Compiles and hot-reloads for development

```
npm run tauri dev
```

### Compiles and minifies for production

```
npm run tauri build
```

## Roadmap
see: https://github.com/jeeinn/tauri-markdown/discussions/1

## Links 
* [LINUX DO](https://linux.do/)

## Thanks
* [tauri](https://github.com/tauri-apps/tauri)
* [vditor](https://github.com/Vanessa219/vditor)
* [element-plus](https://github.com/element-plus/element-plus)

> Project 0.3.0+ was jointly programmed by Alibaba Lingma and Xiaomi Mimo-v2.5-pro.
