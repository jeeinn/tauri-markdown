# Tauri Markdown
A simple local markdown tool, use Tauri &amp; Vditor &amp; Vue3

Maybe we can call it `TMD` ? 🤔

[简体中文](README.zh.md)

(tag v0.1.0 used vue2)

## What's New in v0.3.0+

### Major Upgrades
- **Tauri 2.x Migration**: Upgraded from Tauri 1.x to 2.x with new plugin architecture
- **Vue 3.5+**: Updated to latest Vue 3 with improved performance
- **Vditor 3.11+**: Enhanced markdown editor with better features
- **Element Plus 2.13+**: Modern UI components

### New Features
- **Image Upload Support**: Drag and drop or paste images directly into the editor with automatic asset management
- **File Export**: Export markdown files with Ctrl+Shift+S shortcut
- **Auto-reopen Last File**: Automatically opens the last edited file on startup
- **Dynamic Window Title**: Shows current file name and modification status in window title
- **Theme Switching**: Support for auto/light/dark themes with system preference detection
- **Multi-language Support**: Full i18n support for Chinese (Simplified/Traditional), English, Japanese, and Korean
- **Direct Save**: Press Ctrl+S to save files directly without dialog
- **New File Creation**: Create new markdown files with Ctrl+N
- **Enhanced Menu Bar**: Custom top application menu with keyboard shortcuts display

### Improvements
- **Better Image Path Handling**: Smart path mapping for images using Tauri's asset protocol
- **Content Change Detection**: Tracks modifications to prevent unnecessary saves
- **Improved File Operations**: More reliable file open/save with proper error handling
- **Modern Build Tools**: Updated to Vite 8 and latest development dependencies

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

## Known issue

- [x] Tauri cannot use the application hotkey `copy/paste` see: https://github.com/tauri-apps/tauri/pull/644
- [ ] The outline title does not jump (vditor in tauri)
- [ ] The `sv mode` cursor problem (vditor in tauri on macOS) 

## Roadmap
see: https://github.com/jeeinn/tauri-markdown/discussions/1

## Thanks
* [tauri](https://github.com/tauri-apps/tauri)
* [vditor](https://github.com/Vanessa219/vditor)
* [element-plus](https://github.com/element-plus/element-plus)