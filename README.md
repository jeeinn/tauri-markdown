# tauri-markdown
A simple local markdown tool, use Tauri &amp; editor &amp; vue

## Install Tauri & tauri-bundler

See Tauri's official [docs](https://tauri.studio/en/docs/getting-started/intro)

## Project setup

```
npm install
```

### Compiles and hot-reloads for development

```
npm run serve
```
### Open another Terminal

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

* Tauri cannot use the hotkey `copy/paste` see: https://github.com/tauri-apps/tauri/pull/644

## TODO
- [x] Open `*.md` file
- [x] Save `*.md` file
- [ ] Design `tauri-markdown` App icon
- [ ] Toolbar multiple language (eg: en_US, ja_JP, ko_KR, zh_CN)
- [ ] Open recently `*.md` file
- [ ] Auto save (Maybe need tauri support, eg: cookie, LocalStorage)