# Print / PDF 排版优化指南

> 本文档整理了 CSS 打印样式、HTML-to-PDF 排版的最佳实践，供后续开发参考。
>
> 调研时间：2026-05-19
> 更新时间：2026-05-20（添加暗色主题导出解决方案）
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

---

## 十一、暗色主题导出问题（Tauri CSP 场景）

### 问题背景

在 Tauri 应用中，当用户处于暗色主题时导出 PDF，会出现以下问题：
- 导出的 PDF 仍然是暗色背景
- iframe 中的内联脚本被 CSP 阻止执行
- html2canvas 截图时会读取父页面的所有样式表（包括暗色代码主题）

### 根本原因

1. **CSP 限制**：Tauri 的 Content Security Policy 可能阻止 iframe 中的内联 `<script>` 标签
2. **样式表继承**：Vditor 在暗色模式下会动态注入 `github-dark.min.css` 到父页面 `<head>`，html2canvas 会读取这些样式
3. **计算样式正确但截图错误**：CSS 层面的覆盖是有效的，但 html2canvas 的实现会捕获父页面的样式表

### 解决方案：四层防护 + 外部 JS

#### 第 1 层：移除暗色 CSS 规则

从 Vditor CSS 中移除 `@media (prefers-color-scheme: dark)` 和 `.vditor--dark` 相关样式。

#### 第 2 层：增强 CSS 覆盖（使用 `!important`）

```css
/* 根元素和 body 强制浅色 */
html, body {
  background-color: #ffffff !important;
  color: #1a1a1a !important;
  color-scheme: light !important;
}

/* 移除所有可能的暗色类名影响 */
.dark, .vditor--dark, .theme-dark, .dark-theme,
[class*="dark"], [class*="Dark"] {
  background-color: #ffffff !important;
  color: #1a1a1a !important;
}

/* 暗色类名的子元素继承浅色 */
.dark *, .vditor--dark *, .theme-dark *, .dark-theme *,
[class*="dark"] *, [class*="Dark"] * {
  background-color: inherit !important;
  color: inherit !important;
}

/* Vditor 容器强制浅色 */
.vditor-reset {
  background-color: #ffffff !important;
  color: #1a1a1a !important;
}

/* 代码块强制浅色背景 */
.vditor-reset pre,
.vditor-reset code,
.vditor-reset .hljs {
  background-color: #f6f8fa !important;
  color: #24292e !important;
}
```

#### 第 3 层：加载浅色代码高亮 CSS

```javascript
// 加载 github.min.css（浅色代码主题）并内联到 iframe
const codeThemeCss = await fetch('/vditor-cdn/dist/js/highlight.js/styles/github.min.css')
```

#### 第 4 层：临时禁用父页面暗色样式表（关键）

```javascript
// 在截图前禁用父页面中的暗色代码主题
const disabledStylesheets = []
for (const sheet of document.styleSheets) {
  if (sheet.href.includes('github-dark') || sheet.href.includes('dark.min.css')) {
    sheet.disabled = true
    disabledStylesheets.push(sheet)
  }
}

// 生成 PDF...

// 截图完成后恢复
disabledStylesheets.forEach(sheet => sheet.disabled = false)
```

#### 第 5 层：使用外部 JS 文件替代内联脚本（解决 CSP 问题）

**问题**：iframe 中的内联 `<script>` 可能被 CSP 阻止。

**方案**：创建独立的外部 JS 文件，通过 `<script src>` 加载。

```javascript
// public/export-theme-switcher.js
(function() {
  'use strict';
  
  function applyLightTheme() {
    // 1. 设置 color-scheme
    document.documentElement.style.colorScheme = 'light';
    document.body.style.colorScheme = 'light';
    
    // 2. 移除暗色类名
    document.documentElement.classList.remove('dark', 'vditor--dark');
    document.body.classList.remove('dark', 'vditor--dark');
    
    // 3. 强制设置背景和文字颜色
    document.documentElement.style.setProperty('background-color', '#ffffff', 'important');
    document.documentElement.style.setProperty('color', '#1a1a1a', 'important');
    document.body.style.setProperty('background-color', '#ffffff', 'important');
    document.body.style.setProperty('color', '#1a1a1a', 'important');
    
    // 4. 处理代码块、表格、引用块等...
    const codeElements = document.querySelectorAll('pre, code, .hljs');
    codeElements.forEach(el => {
      el.style.setProperty('background-color', '#f6f8fa', 'important');
      el.style.setProperty('color', '#24292e', 'important');
    });
    
    console.log('[Export Theme] 浅色主题应用完成');
  }
  
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLightTheme);
  } else {
    setTimeout(applyLightTheme, 50);
  }
})();
```

在 HTML 中引用：

```html
<script src="/export-theme-switcher.js"></script>
```

### 实施效果

| 层次 | 方案 | 状态 | 作用 |
|------|------|------|------|
| **第1层** | 移除暗色 CSS 规则 | ✅ 有效 | 防止 CSS 中的暗色样式 |
| **第2层** | `!important` 覆盖 | ✅ 有效 | 强制浅色样式优先级 |
| **第3层** | 内联浅色代码主题 | ✅ 有效 | 提供正确的代码高亮样式 |
| **第4层** | 临时禁用父页面暗色样式 | ✅ 关键 | 阻止 html2canvas 读取暗色样式 |
| **第5层** | 外部 JS 文件 | ✅ 关键 | 解决 CSP 阻止内联脚本问题 |

### 调试技巧

添加详细日志检查脚本执行情况：

```javascript
// 检查 CSP 配置
const cspMeta = doc.head.querySelector('meta[http-equiv="Content-Security-Policy"]');
if (cspMeta) {
  console.log('[Export] ⚠️ 检测到 CSP Meta 标签:', cspMeta.content);
} else {
  console.log('[Export] ✓ 无 CSP Meta 标签（使用父页面 CSP）');
}

// 检查 script 标签
const scripts = doc.scripts;
console.log('[Export] iframe 中 script 标签数量:', scripts.length);
for (let i = 0; i < scripts.length; i++) {
  console.log(`[Export]   Script ${i}:`, scripts[i].src || 'inline');
}

// 检查外部脚本是否执行
if (iframe.contentWindow.__exportApplyLightTheme) {
  console.log('[Export] ✓ 外部脚本已加载并执行');
} else {
  console.warn('[Export] ⚠️ 外部脚本可能未执行');
}

// 检查计算后的样式
const computedStyle = iframe.contentWindow.getComputedStyle(doc.body);
console.log('[Export] backgroundColor:', computedStyle.backgroundColor);
console.log('[Export] color:', computedStyle.color);
console.log('[Export] colorScheme:', computedStyle.colorScheme);
```

### 注意事项

1. **外部 JS 文件必须放在 `public/` 目录**：确保构建后能被正确访问
2. **使用 `setProperty('important')` 而非 `style.property = value`**：确保最高优先级
3. **增加等待时间**：从 200ms 增加到 300ms，确保外部脚本执行完成
4. **try-finally 确保样式表恢复**：避免影响应用的正常使用
5. **测试生产版本**：开发环境和生产环境的 CSP 配置可能不同，必须都测试

### 参考资料

- [Tauri CSP 文档](https://tauri.app/v1/guides/features/security/#content-security-policy)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [html2canvas 跨域问题](https://html2canvas.hertzen.com/documentation/cors)
