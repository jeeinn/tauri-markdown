# 国际化辅助函数使用指南

## 概述

`i18n-helper.js` 提供了一套统一的国际化文本访问方式，避免了在代码中重复编写容错逻辑。

## 主要功能

### 1. getI18nText - 获取单个国际化文本

```javascript
import { getI18nText } from '../utils/i18n-helper.js';

// 基本用法
const text = getI18nText('en_US', 'menu.file');
// 返回: 'File'

// 嵌套路径
const title = getI18nText('zh_CN', 'notifications.openFile.success.title');
// 返回: '文件打开成功'

// 自动回退（当语言不存在时，默认回退到中文）
const fallback = getI18nText('fr_FR', 'menu.file');
// 返回: '文件' (法语不存在，自动回退到中文)
```

**参数：**
- `lang`: 当前语言代码 (如: 'zh_CN', 'en_US')
- `path`: 配置路径 (如: 'menu.file', 'notifications.openFile.success.title')
- `fallbackLang`: 回退语言，默认为 'zh_CN'（可选，通常不需要传入）

**返回值：**
- 如果找到翻译，返回对应的文本
- 如果没找到，返回路径本身作为最后的兜底（便于调试）

### 2. getI18nTexts - 批量获取国际化文本

```javascript
import { getI18nTexts } from '../utils/i18n-helper.js';

const texts = getI18nTexts('en_US', [
  'menu.file',
  'menu.save',
  'notifications.openFile.success.title'
]);
// 返回: { file: 'File', save: 'Save', title: 'File Opened Successfully' }
```

**适用场景：**
- 需要一次性获取多个国际化文本
- 减少重复调用

### 3. getI18nConfig - 获取完整配置对象

```javascript
import { getI18nConfig } from '../utils/i18n-helper.js';

const config = getI18nConfig('en_US');
console.log(config.menu.file); // 'File'
console.log(config.windowTitle.appName); // 'Tauri Markdown'

// 自定义回退语言（仅在特殊场景使用）
const customConfig = getI18nConfig('fr_FR', 'en_US');
```

**适用场景：**
- 需要访问多个相关的配置项
- 在 computed 属性中使用（如 App.vue 和 MyVditor.vue）

### 4. hasLanguage - 检查语言是否存在

```javascript
import { hasLanguage } from '../utils/i18n-helper.js';

hasLanguage('zh_CN'); // true
hasLanguage('fr_FR'); // false
```

### 5. getSupportedLanguages - 获取支持的语言列表

```javascript
import { getSupportedLanguages } from '../utils/i18n-helper.js';

getSupportedLanguages();
// 返回: ['zh_CN', 'en_US', 'ja_JP', 'ko_KR']
```

## 迁移指南

### 旧的方式（不推荐）

```javascript
// ❌ 重复的容错逻辑
const menuI18n = menuI18nConfig[this.lang]?.menu || menuI18nConfig.zh_CN.menu;
const dragDrop = menuI18nConfig[this.lang]?.dragDrop || menuI18nConfig.zh_CN.dragDrop;
const title = dragDrop.title;
const message = dragDrop.unsupported;
```

### 新的方式（推荐）

```javascript
// ✅ 统一、简洁的访问方式
import { getI18nText, getI18nConfig } from '../utils/i18n-helper.js';

// 方式 1: 获取单个文本（推荐，利用默认回退）
const title = getI18nText(this.lang, 'dragDrop.title');
const message = getI18nText(this.lang, 'dragDrop.unsupported');

// 方式 2: 获取完整配置对象（推荐，利用默认回退）
const config = getI18nConfig(this.lang);
const menuI18n = config.menu;
const dragDrop = config.dragDrop;

// 方式 3: 自定义回退语言（特殊场景）
const customFallback = getI18nText(this.lang, 'some.key', 'en_US');
```

## 优势

1. **代码一致性** - 所有国际化文本都通过统一的 API 访问
2. **易于维护** - 如果需要修改回退逻辑，只需修改一处
3. **类型安全** - 避免硬编码字符串可能带来的拼写错误
4. **可扩展性** - 可以轻松添加更多的回退链或自定义逻辑
5. **调试友好** - 当翻译不存在时，会返回路径本身并输出警告日志

## 最佳实践

1. **优先使用 getI18nText** - 对于单个文本的访问
2. **使用 getI18nConfig** - 当需要访问多个相关配置项时
3. **省略默认回退语言** - 默认就是 'zh_CN'，无需显式传入，使代码更简洁
4. **自定义回退语言** - 仅在特殊场景下传入第二个参数（如回退到英文）
5. **使用点号路径** - 如 'notifications.openFile.success.title'，而不是多次访问

## 示例

### 在 Vue 组件中使用

```vue
<script>
import { getI18nText, getI18nConfig } from '../utils/i18n-helper.js';

export default {
  computed: {
    // 获取完整配置对象（推荐写法）
    menuI18n() {
      return getI18nConfig(this.currentLang).menu;
    },
    
    // 获取单个文本（推荐写法）
    dropHintText() {
      return getI18nText(this.lang, 'dragDrop.hint');
    }
  },
  
  methods: {
    showMessage() {
      ElNotification({
        title: getI18nText(this.lang, 'notifications.openFile.success.title'),
        message: getI18nText(this.lang, 'notifications.openFile.success.message'),
        type: 'success'
      });
    }
  }
}
</script>
```

## 测试

本项目使用 **Vitest** 作为测试框架，提供完整的单元测试能力。

### 运行测试

```bash
# 运行所有测试（监视模式，文件变化时自动重新运行）
npm run test

# 运行所有测试（单次运行，适合 CI）
npm run test:run

# 运行测试并打开 UI 界面
npm run test:ui

# 运行特定测试文件
npx vitest src/utils/i18n-helper.test.js

# 生成覆盖率报告
npx vitest run --coverage
```

### 测试文件位置

- 测试文件: `src/utils/i18n-helper.test.js`
- 配置文件: `vitest.config.js`

### 测试覆盖

当前测试包含 23 个测试用例，覆盖：
- ✅ `getI18nText` - 10 个测试（基本功能、嵌套路径、回退机制、边界情况）
- ✅ `getI18nTexts` - 2 个测试（批量获取、空数组处理）
- ✅ `getI18nConfig` - 5 个测试（完整配置、深合并、回退机制）
- ✅ `hasLanguage` - 2 个测试（存在/不存在检测）
- ✅ `getSupportedLanguages` - 2 个测试（语言列表、类型检查）
- ✅ 深合并功能 - 2 个测试（嵌套对象合并、字段继承）

## 相关文件

- 工具函数: `src/utils/i18n-helper.js`
- 测试文件: `src/utils/i18n-helper.test.js`
- 配置文件: `src/config/menu-i18n.js`
- 使用示例: `src/App.vue`, `src/components/MyVditor.vue`
