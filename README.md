# Tauri Markdown
A simple local markdown tool, use Tauri &amp; Vditor &amp; Vue3

Maybe we can call it `TMD` ? 🤔

[简体中文](README.zh.md)

(tag v0.1.0 used vue2)

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