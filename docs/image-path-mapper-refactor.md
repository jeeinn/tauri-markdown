# Vditor 图片路径映射重构需求文档

## 📋 背景

当前图片上传功能已实现,但存在以下问题:
1. 映射关系(`$imageRelativePaths`)存储在组件实例中,不够独立
2. 区分了开发/生产环境的处理逻辑,但实际上生产环境也需要 `convertFileSrc`
3. md 文档加载时,已有的 `asset://` 图片 URL 没有转换为相对路径
4. 需要保护网络图片 URL(`http://`, `https://`)不被错误转换

## 🎯 需求范围

### 1. 创建独立的图片路径映射工具模块
- **位置**: `src/utils/image-path-mapper.js`
- **生命周期**: 内存维护,应用关闭后清空
- **功能**:
  - 添加映射关系: `asset://` URL → 相对路径
  - 批量转换: 将内容中的 `asset://` URL 替换为相对路径
  - 保护网络图片: 只转换本地 asset 协议,保留 http/https

### 2. 统一图片处理策略
- **上传时**: 统一使用 `convertFileSrc` 转换本地路径为 asset URL
- **保存时**: 将内容中的 asset URL 转换为相对路径
- **加载时**: 将内容中的相对路径转换为 asset URL(让图片能显示)

### 3. 支持 md 文档加载时的图片渲染
- 打开 md 文件时,扫描内容中的相对路径图片
- 将相对路径转换为 asset URL,让图片能在编辑器中显示
- 添加新的映射关系到工具模块

## 🔧 技术方案

### 工具模块 API 设计

```javascript
// src/utils/image-path-mapper.js

class ImagePathMapper {
  constructor() {
    this.mapping = new Map(); // assetUrl -> relativePath
  }

  /**
   * 添加映射关系
   * @param {string} assetUrl - asset:// 协议的 URL
   * @param {string} relativePath - 相对路径 ./assets/images/xxx.jpg
   */
  addMapping(assetUrl, relativePath) {}

  /**
   * 根据 asset URL 获取相对路径
   * @param {string} assetUrl
   * @returns {string|null} 相对路径或 null
   */
  getRelativePath(assetUrl) {}

  /**
   * 根据相对路径获取 asset URL
   * @param {string} relativePath
   * @returns {string|null} asset URL 或 null
   */
  getAssetUrl(relativePath) {}

  /**
   * 将内容中的 asset URL 转换为相对路径(保存时使用)
   * @param {string} content - Markdown 内容
   * @returns {string} 转换后的内容
   */
  convertToRelative(content) {}

  /**
   * 将内容中的相对路径转换为 asset URL(加载时使用)
   * @param {string} content - Markdown 内容
   * @param {string} baseDir - md 文件所在目录
   * @returns {Promise<string>} 转换后的内容
   */
  async convertToAssetUrl(content, baseDir) {}

  /**
   * 清除所有映射
   */
  clear() {}
}

export default new ImagePathMapper();
```

### 关键实现细节

#### 1. 只转换 asset 协议
```javascript
// 正则表达式:匹配 ![alt](asset://...) 或 ![alt](http://asset.localhost/...)
const assetUrlRegex = /!\[([^\]]*)\]\((asset:\/\/[^)]+|http:\/\/asset\.localhost\/[^)]+)\)/g;
```

#### 2. 网络图片保护
```javascript
// 不匹配的 URL 模式
const networkUrlRegex = /^(https?:\/\/)/;
// 只处理 asset 协议,网络图片直接返回
```

#### 3. 加载时转换
```javascript
// 正则表达式:匹配 ![alt](./assets/images/xxx.jpg)
const relativePathRegex = /!\[([^\]]*)\]\(\.\/assets\/images\/([^)]+)\)/g;

// 转换为 asset URL
async convertToAssetUrl(content, baseDir) {
  const { convertFileSrc } = await import('@tauri-apps/api/core');
  const { join } = await import('@tauri-apps/api/path');
  
  return content.replace(relativePathRegex, (match, alt, fileName) => {
    const fullPath = join(baseDir, 'assets', 'images', fileName);
    const assetUrl = convertFileSrc(fullPath);
    this.addMapping(assetUrl, `./assets/images/${fileName}`);
    return `![${alt}](${assetUrl})`;
  });
}
```

## 📝 实施步骤

### Step 1: 创建工具模块
- [ ] 创建 `src/utils/image-path-mapper.js`
- [ ] 实现 `ImagePathMapper` 类
- [ ] 添加单元测试(可选)

### Step 2: 修改 MyVditor.vue - 上传逻辑
- [ ] 移除 `import.meta.env.DEV` 环境判断
- [ ] 统一使用 `convertFileSrc` 转换路径
- [ ] 使用工具模块的 `addMapping` 添加映射
- [ ] 移除组件实例上的 `$imageRelativePaths`

### Step 3: 修改 MyVditor.vue - 保存逻辑
- [ ] 在 `saveMdFile` 方法中使用工具模块的 `convertToRelative`
- [ ] 移除旧的路径转换代码

### Step 4: 修改 MyVditor.vue - 加载逻辑
- [ ] 在 `autoLoadLastFile` 或文件打开方法中
- [ ] 读取内容后,调用工具模块的 `convertToAssetUrl`
- [ ] 将转换后的内容设置到编辑器

### Step 5: 测试验证
- [ ] 测试上传图片后立即显示
- [ ] 测试保存后 .md 文件使用相对路径
- [ ] 测试打开已有 .md 文件时图片正常显示
- [ ] 测试网络图片 URL 不被转换
- [ ] 测试开发环境和生产环境都能正常工作

## ️ 注意事项

1. **路径转换时机**:
   - 上传时: 相对路径 → asset URL (显示用)
   - 保存时: asset URL → 相对路径 (存储用)
   - 加载时: 相对路径 → asset URL (显示用)

2. **映射关系管理**:
   - 内存维护,不需要持久化
   - 每次打开文件时重建映射关系

3. **正则表达式安全**:
   - 转义特殊字符避免正则注入
   - 只匹配标准的 Markdown 图片语法

4. **跨平台兼容**:
   - 使用 Tauri 的 path API 处理路径
   - Windows 和 Unix 路径分隔符统一处理

5. **网络图片保护**:
   - 只转换 `asset://` 和 `http://asset.localhost` 开头的 URL
   - `http://`, `https://` 开头的网络图片保持不变

##  影响范围

### 修改的文件
- `src/utils/image-path-mapper.js` (新建)
- `src/components/MyVditor.vue` (修改)

### 不需要修改的文件
- `src-tauri/capabilities/default.json` (权限配置不变)
- `src-tauri/tauri.conf.json` (CSP 配置不变)
- `src/config/vditor-config.js` (编辑器配置不变)
- `src/config/menu-i18n.js` (国际化配置不变)

## ✅ 验收标准

1. ✅ 上传图片后立即在编辑器中显示
2. ✅ 保存的 .md 文件中图片使用相对路径
3. ✅ 打开已有 .md 文件时图片正常显示
4. ✅ 网络图片 URL 不被错误转换
5. ✅ 开发环境和生产环境都能正常工作
6. ✅ 代码结构清晰,映射逻辑独立管理
