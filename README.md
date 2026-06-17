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

## Multi-Tab Editor

TMD supports opening multiple files at the same time, each in its own tab.

**Features:**
- Open multiple Markdown files simultaneously, each in an independent tab
- Unsaved changes are indicated by a `●` marker on the tab title
- Tab state (open files, active tab) is automatically saved and restored on app restart
- Drag and drop files onto the tab bar to open them in new tabs

**Keyboard Shortcuts:**

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | Open a new empty tab |
| `Ctrl+W` | Close the current tab |
| `Ctrl+Tab` | Switch to the next tab |

## Download

Get the latest version from [GitHub Releases](https://github.com/jeeinn/tauri-markdown/releases).

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
