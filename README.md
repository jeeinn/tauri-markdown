# Tauri Markdown
A simple local markdown tool, use Tauri &amp; Vditor &amp; Vue3

Maybe we can call it `TMD` ? 🤔

(tag v0.1.0 used vue2)

## Install Tauri & tauri-bundler

See Tauri official: [docs](https://tauri.app/v1/guides/)

## Project setup

```
npm install
```

### Compiles and hot-reloads for development

```
npm run tauri dev
```

### Compiles and minifies for production

```
npm run build && npm run tauri build
```

### Lints and fixes files

```
npm run lint
```

## Known issue

- [x] Tauri cannot use the hotkey `copy/paste` see: https://github.com/tauri-apps/tauri/pull/644

## TODO List
- [x] Open `*.md` file
- [x] Save `*.md` file
- [ ] Design `tauri-markdown` App icon
- [x] Hotkey support eg: save file `Ctrl + s`, open file `Ctrl + o`
- [ ] Toolbar multiple language (eg: en_US, ja_JP, ko_KR, zh_CN)
- [ ] Dark mode support
- [ ] Export multiple format support (eg: html,json,pdf)
- [ ] Open recently `*.md` files
- [ ] Auto save (Maybe need tauri support, eg: cookie, LocalStorage)

## Roadmap
see: https://github.com/jeeinn/tauri-markdown/discussions/1

## Thanks
* [tauri](https://github.com/tauri-apps/tauri)
* [vditor](https://github.com/Vanessa219/vditor)