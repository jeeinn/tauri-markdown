# Vditor 图片路径显示优化需求文档

## 📋 背景

当前图片上传功能已实现,但在编辑器中点击图片链接时,会显示 `http://asset.localhost/...` 这样的内部路径,影响用户体验。

**问题**:
- 用户看到的是内部 asset URL,不够友好
- 用户编辑时希望看到干净的相对路径
- 但图片渲染需要使用 asset URL 才能正常显示

## 🎯 需求

### 1. 三种编辑模式都支持
- ✅ IR (即时渲染) 模式
- ✅ SV (分屏预览) 模式
- ✅ WYSIWYG (所见即所得) 模式

### 2. 用户体验
- **视觉上**: 正常渲染图片,无差异
- **交互上**: 鼠标悬停/选中时显示相对路径 `![alt](./assets/images/xxx.jpg)`
- **底层**: 实际渲染使用 asset URL (对用户透明)

### 3. 保持现有逻辑
- 继续使用 `imagePathMapper` 管理映射关系
- 保存时: asset URL → 相对路径
- 加载时: 相对路径 → asset URL
- 上传时: 计算 Hash,去重保存

## 📊 当前状态

### ✅ 已实现功能
- [x] 图片上传和 Hash 去重
- [x] asset URL ↔ 相对路径的映射管理
- [x] 保存时使用相对路径
- [x] 加载时转换为 asset URL 渲染
- [x] 三种模式下图片都能正常显示
- [x] CSP 和 assetProtocol 配置正确

### ❌ 已知限制
- [ ] **编辑器中显示相对路径** (Lute 渲染器架构限制)

## 🚫 已知限制: 编辑器中无法显示相对路径

### 限制说明

经过深入调研和多次尝试,**Vditor 的 Lute 引擎当前版本不支持在编辑模式下自定义图片渲染器**。

### 尝试过的方案

#### 方案 1: 使用 `SetJSRenderers` 自定义渲染器 ❌

```javascript
// 尝试的代码
const renderers = {
  SpinVditorIRDOM: { renderImage: imageRenderer },
  SpinVditorSVDOM: { renderImage: imageRenderer },
  SpinVditorDOM: { renderImage: imageRenderer }
};

lute.SetJSRenderers({ renderers });
```

**失败原因**:
```
Error: unknown ext renderer func [SpinVditorIRDOM]
```

**分析**:
- `SetJSRenderers` 主要用于 **预览模式** (`Vditor.preview`)
- 不支持编辑模式的渲染器自定义
- 渲染器名称 `SpinVditorIRDOM` 等不被识别
- 强制使用会导致工具栏渲染异常

#### 方案 2: 使用 `after` 回调修改 DOM ❌

```javascript
// 尝试的思路
vditorConfCopy.options.after = () => {
  // 遍历所有 <img> 标签
  // 将 src 替换为相对路径,添加 data-src 存储真实 URL
};
```

**失败原因**:
- 编辑器内部会频繁重新渲染 DOM
- 修改 DOM 会被 Vditor 覆盖
- 影响编辑器的内部状态管理
- 可能导致光标位置异常

### 当前实现策略

采用**双路径策略**,在用户看不到的地方处理:

1. **渲染时**: 使用 asset URL (确保图片正常显示)
2. **编辑时**: 用户看到 asset URL (无法避免)
3. **保存时**: 自动转换为相对路径 (用户无感知)

### 影响分析

| 场景 | 用户看到的内容 | 影响 |
|------|--------------|------|
| 图片正常显示 | 正常渲染的图片 | ✅ 无影响 |
| 点击/选中图片链接 | `http://asset.localhost/...` | ⚠️ 不够友好,但功能正常 |
| 保存 .md 文件 | 相对路径 `./assets/images/xxx.jpg` | ✅ 完全符合预期 |
| 重新打开文件 | 图片正常显示 | ✅ 无影响 |

### 为什么这个限制可以接受?

1. **asset URL 只在交互时显示**
   - 正常阅读时不会看到
   - 只有点击/选中链接时才显示
   
2. **不影响核心功能**
   - 图片渲染完全正常
   - 文件保存使用相对路径
   - 可移植性不受影响
   
3. **技术架构限制**
   - Vditor 内部使用 Lute 引擎
   - 编辑模式的渲染器不可自定义
   - 需要深入修改 Vditor 源码

## 🔧 替代方案

### 方案 A: 向 Vditor 官方提 Feature Request ⭐ 推荐

向 [Vditor GitHub Issues](https://github.com/Vanessa219/vditor/issues) 提交功能请求:

**标题**: Feature Request: Custom Image Renderer in Edit Mode

**描述**:
```
希望在编辑模式下支持自定义图片渲染器,实现:
1. 渲染时使用 asset URL (确保图片显示)
2. 编辑时显示相对路径 (提升用户体验)
3. 类似 VS Code 的行为

当前只能通过 SetJSRenderers 自定义预览模式,
编辑模式的 Lute 渲染器不可扩展。
```

### 方案 B: Fork Vditor 自行修改

如果非常需要这个功能,可以:
1. Fork Vditor 仓库
2. 修改 Lute 编辑模式的渲染逻辑
3. 在 `renderImage` 中支持自定义

**缺点**:
- 维护成本高
- 难以跟随 Vditor 更新
- 需要深入了解 Lute 引擎

### 方案 C: 使用自定义 Tooltip

通过 CSS 和 JavaScript,在鼠标悬停时显示相对路径:

```javascript
// 监听图片的鼠标事件
// 从 imagePathMapper 查询相对路径
// 在 tooltip 中显示
```

**局限性**:
- 只在悬停时显示
- 编辑链接时仍显示 asset URL
- 体验不如原生支持

## ✅ 验收标准

### 当前已实现 ✅
1. ✅ IR 模式下,图片正常渲染
2. ✅ SV 模式下,图片正常渲染
3. ✅ WYSIWYG 模式下,图片正常渲染
4. ✅ 保存的 .md 文件使用相对路径
5. ✅ 打开已有 .md 文件时图片正常显示
6. ✅ 不影响现有的上传、保存、加载功能

### 无法实现 ❌
1. ❌ 编辑器中显示相对路径 (Lute 架构限制)
2.  鼠标悬停时自动显示相对路径 (需要 Vditor 原生支持)

## 📚 相关资源

- Vditor 文档: https://ld246.com/guide/markdown
- Vditor GitHub: https://github.com/Vanessa219/vditor
- Lute 引擎: https://github.com/88250/lute
- Tauri Asset Protocol: https://tauri.app/v1/references/webview-configuration/#asset-protocol

## 📝 版本记录

### v1.0 (2024-01-XX)
- ✅ 实现图片上传功能
- ✅ 实现资产路径映射
- ✅ 实现保存/加载路径转换
- ❌ 记录编辑器显示 asset URL 的已知限制

---

## 📝 说明

本文档记录了图片路径显示优化的需求、尝试过的方案以及已知限制。当前实现已经满足核心功能需求,编辑器显示 asset URL 作为已知限制被记录,等待 Vditor 官方支持或用户反馈决定是否进一步开发。
