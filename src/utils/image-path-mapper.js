/**
 * 图片路径映射工具
 * 用于管理本地图片的 asset URL 和相对路径之间的转换
 * 
 * 生命周期: 内存维护,应用关闭后清空
 */

class ImagePathMapper {
  constructor() {
    // 存储映射关系: assetUrl -> relativePath
    this.mapping = new Map();
    
    // 正则表达式:匹配 Markdown 图片语法中的 asset URL
    // 匹配 ![alt](asset://...) 或 ![alt](http://asset.localhost/...)
    this.assetUrlPattern = /!\[([^\]]*)\]\((asset:\/\/[^)]+|http:\/\/asset\.localhost\/[^)]+)\)/g;
    
    // 正则表达式:匹配 Markdown 图片语法中的相对路径
    // 匹配 ![alt](./assets/images/xxx.jpg)
    this.relativePathPattern = /!\[([^\]]*)\]\(\.\/assets\/images\/([^)]+)\)/g;
  }

  /**
   * 添加映射关系
   * @param {string} assetUrl - asset:// 协议的 URL
   * @param {string} relativePath - 相对路径 ./assets/images/xxx.jpg
   */
  addMapping(assetUrl, relativePath) {
    if (!assetUrl || !relativePath) {
      console.warn('[ImagePathMapper] 添加映射失败:参数不能为空');
      return;
    }
    this.mapping.set(assetUrl, relativePath);
    console.log('[ImagePathMapper] 添加映射:', assetUrl, '->', relativePath);
  }

  /**
   * 根据 asset URL 获取相对路径
   * @param {string} assetUrl
   * @returns {string|null} 相对路径或 null
   */
  getRelativePath(assetUrl) {
    return this.mapping.get(assetUrl) || null;
  }

  /**
   * 根据相对路径获取 asset URL
   * @param {string} relativePath
   * @returns {string|null} asset URL 或 null
   */
  getAssetUrl(relativePath) {
    for (const [assetUrl, path] of this.mapping.entries()) {
      if (path === relativePath) {
        return assetUrl;
      }
    }
    return null;
  }

  /**
   * 将内容中的 asset URL 转换为相对路径(保存时使用)
   * 只转换 asset:// 和 http://asset.localhost 开头的 URL
   * 保留 http://, https:// 开头的网络图片 URL
   * 
   * @param {string} content - Markdown 内容
   * @returns {string} 转换后的内容
   */
  convertToRelative(content) {
    if (!content) return content;
    
    let result = content;
    
    // 遍历所有映射关系,替换 asset URL 为相对路径
    for (const [assetUrl, relativePath] of this.mapping.entries()) {
      // 转义 asset URL 中的特殊字符用于正则匹配
      const escapedAssetUrl = assetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 构建正则表达式:匹配 ![alt](assetUrl) 格式
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedAssetUrl}\\)`, 'g');
      
      // 替换为相对路径
      const beforeReplace = result;
      result = result.replace(regex, `![$1](${relativePath})`);
      
      if (beforeReplace !== result) {
        console.log('[ImagePathMapper] 保存时转换:', assetUrl, '->', relativePath);
      }
    }
    
    return result;
  }

  /**
   * 将内容中的相对路径转换为 tmd URL(加载时使用)
   * @param {string} content - Markdown 内容
   * @returns {string} 转换后的内容
   */
  convertToAssetUrl(content) {
    if (!content) return content;
    
    let result = content;
    let match;
    
    // 重置正则表达式的 lastIndex
    this.relativePathPattern.lastIndex = 0;
    
    // 查找所有相对路径图片并替换
    while ((match = this.relativePathPattern.exec(content)) !== null) {
      const [fullMatch, alt, fileName] = match;
      
      try {
        // 使用 tmd 自定义协议生成 URL（支持相对路径解析）
        const assetUrl = `http://tmd.localhost/./assets/images/${fileName}`;

        // 添加映射关系
        const relativePath = `./assets/images/${fileName}`;
        this.addMapping(assetUrl, relativePath);
        
        // 替换为 asset URL
        result = result.replace(fullMatch, `![${alt}](${assetUrl})`);
        console.log('[ImagePathMapper] 加载时转换:', relativePath, '->', assetUrl);
      } catch (error) {
        console.error('[ImagePathMapper] 转换失败:', fileName, error);
        // 转换失败时保留原始内容
      }
    }
    
    return result;
  }

  /**
   * 清除所有映射
   */
  clear() {
    this.mapping.clear();
    console.log('[ImagePathMapper] 已清除所有映射');
  }

  /**
   * 获取映射数量(用于调试)
   * @returns {number}
   */
  get size() {
    return this.mapping.size;
  }
}

// 导出单例
export default new ImagePathMapper();
