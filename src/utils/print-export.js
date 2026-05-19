/**
 * 打印工具模块
 * 通过浏览器 window.print() 打印当前文档
 */

/**
 * 打印当前文档
 * @param {Object} component - MyVditor 组件实例
 * @returns {Promise<boolean>} 是否成功
 */
export async function printPage(component) {
  const vditor = component?.vditor
  if (!vditor) return false

  const content = vditor.getValue()
  if (!content.trim()) return false

  // 设置打印页标题为当前文档名
  const originalTitle = document.title
  const filePath = component.currentFilePath
  if (filePath) {
    const fileName = filePath.split('/').pop().split('\\').pop().replace(/\.md$/i, '')
    document.title = fileName
  } else {
    document.title = 'TauriMarkdown'
  }

  // Vditor 会根据容器尺寸动态计算 inline style（width、padding-left 等），
  // 最大化窗口后这些值会很大。@media print CSS 无法覆盖 inline style，
  // 因此需要在打印前清除这些 inline style，打印后恢复。

  const layoutProps = [
    'width', 'height', 'maxHeight', 'minHeight', 'maxWidth', 'minWidth',
    'overflow', 'overflowX', 'overflowY',
    'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
    'marginLeft', 'marginRight', 'marginTop', 'marginBottom',
    'position', 'flex', 'flexShrink', 'flexGrow',
    'top', 'left', 'right', 'bottom',
    'transform', 'boxSizing'
  ]

  // 容器元素：可以安全清除所有布局属性（包括 display）
  const containerSelectors = ['#app', '.vditor-container', '.vditor-outline']
  // 内容元素：只清除布局属性，保留 display（避免让隐藏的非活动编辑模式显示出来）
  const contentSelectors = ['.vditor', '.vditor-content', '.vditor-ir', '.vditor-wysiwyg', '.vditor-sv', '.vditor-reset']

  const containerEls = containerSelectors.map(s => document.querySelector(s)).filter(Boolean)
  const contentEls = contentSelectors.map(s => document.querySelector(s)).filter(Boolean)

  // 保存原始 inline style
  const saveStyles = (els, props) => els.map(el => {
    const saved = {}
    props.forEach(prop => { saved[prop] = el.style[prop] })
    return { el, styles: saved }
  })

  const containerSaved = saveStyles(containerEls, [...layoutProps, 'display'])
  const contentSaved = saveStyles(contentEls, layoutProps)

  // 清除 inline style，让 @media print CSS 生效
  const clearStyles = (els, props) => {
    els.forEach(el => {
      props.forEach(prop => {
        el.style.removeProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase())
      })
    })
  }

  clearStyles(containerEls, [...layoutProps, 'display'])
  clearStyles(contentEls, layoutProps)

  // 清除代码块和表格的高度限制（vditor 可能通过 inline style 设置了固定高度）
  const codeProps = ['height', 'maxHeight', 'display', 'overflow']
  const codeEls = document.querySelectorAll('.vditor-reset pre > code, .vditor-reset table')
  const codeSaved = saveStyles(Array.from(codeEls), codeProps)
  clearStyles(Array.from(codeEls), codeProps)

  // 延迟执行打印，确保样式已应用
  return new Promise(resolve => {
    setTimeout(() => {
      try {
        window.print()
      } finally {
        // 打印完成后恢复原始 inline style
        setTimeout(() => {
          const restoreStyles = (savedList) => {
            savedList.forEach(({ el, styles }) => {
              Object.entries(styles).forEach(([prop, value]) => {
                el.style[prop] = value
              })
            })
          }

          restoreStyles(containerSaved)
          restoreStyles(contentSaved)
          restoreStyles(codeSaved)

          document.title = originalTitle
          resolve(true)
        }, 100)
      }
    }, 100)
  })
}
