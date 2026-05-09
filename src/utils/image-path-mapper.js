/**
 * 图片/文件路径映射工具
 * 用于管理 tmd:// URL 和相对路径之间的转换
 *
 * 生命周期: 内存维护，应用关闭后清空
 */

class ImagePathMapper {
  constructor() {
    // 存储映射关系: tmdUrl -> relativePath
    this.mapping = new Map();

    // 匹配图片语法 ![alt](url) 和文件链接 [name](url)
    // 两种模式分开匹配，确保保留 ! 前缀
    this.imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    this.linkPattern = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;

    // 匹配 Markdown 中的相对路径（图片和文件）
    this.relativePathPattern = /(?:!?\[([^\]]*)\])\(\.\/(assets\/(?:images|files)\/([^)]+))\)/g;
  }

  /**
   * 添加映射关系
   * @param {string} tmdUrl - tmd 协议的 URL
   * @param {string} relativePath - 相对路径 ./assets/images/xxx.jpg 或 ./assets/files/xxx.pdf
   */
  addMapping(tmdUrl, relativePath) {
    if (!tmdUrl || !relativePath) {
      console.warn('[ImagePathMapper] 添加映射失败:参数不能为空');
      return;
    }
    this.mapping.set(tmdUrl, relativePath);
    console.log('[ImagePathMapper] 添加映射:', tmdUrl, '->', relativePath);
  }

  /**
   * 根据 tmd URL 获取相对路径
   * @param {string} tmdUrl
   * @returns {string|null} 相对路径或 null
   */
  getRelativePath(tmdUrl) {
    return this.mapping.get(tmdUrl) || null;
  }

  /**
   * 将内容中的 tmd URL 转换为相对路径（保存时使用）
   * 同时处理图片 ![alt](url) 和文件链接 [name](url)
   *
   * @param {string} content - Markdown 内容
   * @returns {string} 转换后的内容
   */
  convertToRelative(content) {
    if (!content) return content;

    let result = content;

    for (const [tmdUrl, relativePath] of this.mapping.entries()) {
      // 替换图片语法 ![alt](tmdUrl) -> ![alt](relativePath)
      const imgRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${this._escapeRegex(tmdUrl)}\\)`, 'g');
      result = result.replace(imgRegex, `![$1](${relativePath})`);

      // 替换文件链接 [name](tmdUrl) -> [name](relativePath)
      const linkRegex = new RegExp(`(?<!!)\\[([^\\]]*)\\]\\(${this._escapeRegex(tmdUrl)}\\)`, 'g');
      result = result.replace(linkRegex, `[$1](${relativePath})`);
    }

    return result;
  }

  /**
   * 将内容中的相对路径转换为 tmd URL（加载时使用）
   * 同时处理 ./assets/images/ 和 ./assets/files/
   *
   * @param {string} content - Markdown 内容
   * @returns {string} 转换后的内容
   */
  convertToAssetUrl(content) {
    if (!content) return content;

    let result = content;
    let match;

    this.relativePathPattern.lastIndex = 0;

    while ((match = this.relativePathPattern.exec(content)) !== null) {
      const [fullMatch, alt, relPath, fileName] = match;

      try {
        const tmdUrl = `http://tmd.localhost/./${relPath}`;
        const relativePath = `./${relPath}`;
        this.addMapping(tmdUrl, relativePath);

        result = result.replace(fullMatch, fullMatch.replace(`./${relPath}`, tmdUrl));
      } catch (error) {
        console.error('[ImagePathMapper] 转换失败:', fileName, error);
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
   * 获取映射数量（用于调试）
   * @returns {number}
   */
  get size() {
    return this.mapping.size;
  }

  /**
   * 转义正则特殊字符
   * @private
   */
  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default new ImagePathMapper();
