# Print / PDF 排版优化指南

> 本文档整理了 CSS 打印样式、HTML-to-PDF 排版的最佳实践，供后续开发参考。
>
> 调研时间：2026-05-19
>
> 适用场景：浏览器 `window.print()`、html2pdf.js、Puppeteer/Playwright 等 PDF 生成方案

---

## 一、核心原则

1. **用 iframe 隔离渲染**：创建独立 HTML 文档在隐藏 iframe 中渲染，避免主页面样式干扰
2. **共享样式**：screen / print / PDF 使用同一套 CSS，一处修改全局生效
3. **用 `pt` 单位**：打印排版用 `pt`（1pt = 1/72 inch），屏幕用 `px`/`rem`
4. **同时使用新旧属性**：`break-*`（现代）+ `page-break-*`（兼容）

---

## 二、代码块处理

### 问题
- vditor 通过 inline style 设置固定高度 + `overflow: auto`，纵向截断
- 长行（URL、minified 代码）溢出页面宽度

### 方案

```css
pre {
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  white-space: pre-wrap !important;    /* 保留空白符 + 允许换行 */
  word-break: break-all !important;    /* 超长 token 强制断行 */
  break-inside: avoid;                 /* 不跨页分割 */
  page-break-inside: avoid;            /* 兼容旧属性 */
  font-size: 9pt;
  line-height: 1.45;
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 12px;
}
pre code {
  white-space: pre-wrap !important;
  word-break: break-all !important;
  background: none;
  padding: 0;
}
```

### JS 配合
打印前需清除 vditor 的 inline style（`height`、`maxHeight`、`overflow`），否则 CSS `!important` 无法覆盖 inline style。

### 注意
- `break-inside: avoid` 对超过一整页的代码块无效（浏览器必须分割）
- `pre-wrap` vs `pre`：`pre-wrap` 保留空白符但允许换行，适合打印；`pre` 不换行，适合屏幕编辑

---

## 三、表格处理

### 问题
- vditor 设置 `display: block; overflow: auto`，表格变成可滚动块
- 打印时只显示可视区域内容
- 列宽固定，长内容截断

### 方案

```css
table {
  display: table !important;           /* 恢复语义布局 */
  overflow: visible !important;
  height: auto !important;
  max-height: none !important;
  width: 100% !important;
  max-width: 100% !important;
  border-collapse: collapse !important;
  table-layout: auto !important;       /* 浏览器自动分配列宽 */
  word-break: normal !important;
  break-inside: auto;                  /* 表格本身可以跨页 */
  page-break-inside: auto;
}
thead { display: table-header-group; }  /* 跨页时重复表头 */
tfoot { display: table-footer-group; }  /* 跨页时重复表尾 */
tr {
  break-inside: avoid;                 /* 行不分割 */
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
  text-align: left;
  overflow-wrap: break-word;           /* 长内容自动换行 */
  word-break: normal;                  /* 不强制断词 */
}
th { background: #f6f8fa; font-weight: 600; }
```

### 关键点
- `display: table` 恢复语义布局（`display: block` 会破坏表格渲染）
- `table-layout: auto` 让浏览器自动分配列宽，避免固定列宽导致截断
- `break-inside: avoid` 放在 `tr` 上而非 `table` 上——允许表格跨页但禁止单行被分割
- `thead { display: table-header-group }` 让表头在每个分页重复显示
- `overflow-wrap: break-word` 比 `word-break: break-all` 更温和，只在必要时断行

### html2pdf.js 配置
```js
pagebreak: {
  mode: ['css', 'avoid-all'],
  avoid: ['img', 'pre', 'table', 'blockquote', 'tr']
}
```

---

## 四、分页控制

```css
/* 标题后不分页 */
h1, h2, h3, h4 {
  break-after: avoid;
  page-break-after: avoid;
}

/* h1 章节分页 */
h1 {
  break-before: page;
  page-break-before: always;
}

/* 关键内容不分割 */
pre, code, blockquote, img {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* 段落孤行控制 */
p, li {
  orphans: 3;    /* 页底至少 3 行 */
  widows: 3;     /* 页顶至少 3 行 */
}
```

### 属性对照表

| 现代属性 | 旧属性 | 作用 |
|---------|--------|------|
| `break-before: page` | `page-break-before: always` | 元素前分页 |
| `break-after: avoid` | `page-break-after: avoid` | 元素后不分页 |
| `break-inside: avoid` | `page-break-inside: avoid` | 元素内不分割 |

### 注意
- `break-inside: avoid` 对超过一整页的元素无效
- `orphans`/`widows` 仅对段落文本有效，对 `break-inside: avoid` 的元素无效
- Flex/Grid 容器分页行为不一致，复杂布局用 block 更可靠

---

## 五、页面设置

```css
@page {
  size: A4;                            /* 纸张尺寸 */
  margin: 15mm 14mm 20mm 14mm;         /* 上 右 下 左 */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a1a;
}

/* 保留背景色（代码块、表头等） */
* {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

### 字号建议

| 元素 | 字号 |
|------|------|
| 正文 | 11pt |
| 代码 | 9pt |
| h1 | 2em (≈22pt) |
| h2 | 1.5em (≈16.5pt) |
| h3 | 1.25em (≈13.75pt) |

---

## 六、链接处理

打印时无法点击链接，建议显示 URL：

```css
a[href^="http"]::after {
  content: " (" attr(href) ")";
  font-size: 8pt;
  color: #666;
  word-break: break-all;
}
```

---

## 七、隐藏元素

```css
@media print {
  nav, footer, .sidebar, .toolbar,
  .el-popper, .el-overlay, .el-message-box, .el-notification {
    display: none !important;
  }
}
```

---

## 八、浏览器兼容性

| 特性 | Chrome/Playwright | Firefox | Safari |
|------|-------------------|---------|--------|
| `@media print` | Yes | Yes | Yes |
| `@page { margin }` | Yes | Yes | Yes |
| `@page { size }` | Yes | No | No |
| `break-before/after` | Yes | Yes | Yes |
| `break-inside: avoid` | Yes | Yes | Partial |
| `orphans/widows` | Yes | Yes | No |
| `print-color-adjust` | Yes | Yes | Prefix |
| `<thead>` 重复 | Yes | Yes | Yes |

Chromium 系（Chrome、Tauri WebView2、Playwright）支持最完整。

---

## 九、开源参考

| 项目 | 说明 |
|------|------|
| [jez/pandoc-markdown-css-theme](https://github.com/jez/pandoc-markdown-css-theme) | 完整的 markdown 打印主题，含代码块、表格、分页控制 |
| [FireController1847 Gist](https://gist.github.com/FireController1847/0b442ec9b19b55b9e0332b9f9b2a7b9f) | GitHub markdown 打印优化脚本，表格自动列宽 + 分页安全 |
| [docmost/docmost#1803](https://github.com/docmost/docmost/pull/1803) | 表格打印溢出修复，`break-inside: avoid` on `tr` |
| [primer/css#1127](https://github.com/primer/css/issues/1127) | `display: block` 破坏表格布局的反面教材 |
| [pdf4.dev 指南](https://pdf4.dev/blog/css-print-styles-pdf-guide) | CSS 打印样式的完整指南 |
| [CSS Print Cheatsheet](https://www.customjs.space/blog/print-css-cheatsheet/) | 打印 CSS 速查表 |

---

## 十、常见陷阱

1. **inline style 优先级**：vditor 动态设置的 inline style 无法被 CSS `@media print` 覆盖，需用 JS 清除
2. **`display: block` 破坏表格**：vditor 设置 `display: block; overflow: auto` 使表格变成可滚动块，打印时截断
3. **`vw`/`vh` 单位**：打印时引用的是屏幕视口而非纸张，用 `%`/`mm`/`cm` 替代
4. **Flex/Grid 分页**：浏览器对 flex/grid 容器的分页行为不一致，复杂布局用 block 更可靠
5. **`break-inside: avoid` 失效**：当元素高度超过一整页时浏览器会忽略此规则
6. **暗色模式**：`color-scheme: dark` 会导致打印输出灰蒙蒙，需强制 `color-scheme: light`
