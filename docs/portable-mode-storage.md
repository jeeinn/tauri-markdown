# 便携版配置文件存储机制说明

## 📋 概述

TauriMarkdown v0.5.1+ 支持真正的便携模式，所有用户数据（配置、日志等）都存储在可执行文件同目录下，方便 U 盘携带和多电脑使用。

---

## 🔍 工作原理

### 1. 便携模式检测

应用在启动时会自动检测是否存在 `.portable` 标记文件：

```rust
// src-tauri/src/main.rs
let exe_path = std::env::current_exe().unwrap_or_default();
let exe_dir = exe_path.parent().unwrap_or_else(|| std::path::Path::new("."));
let portable_marker = exe_dir.join(".portable");
let is_portable = portable_marker.exists();
```

**检测逻辑**：
- ✅ 如果 `tauri-markdown.exe` 同目录存在 `.portable` 文件 → **便携模式**
- ❌ 如果不存在 `.portable` 文件 → **正常模式**

### 2. 数据存储路径对比

| 数据类型 | 便携模式 | 正常模式（安装版） |
|---------|---------|------------------|
| **配置文件** (`store.json`) | `.\store.json` | `%APPDATA%\com.jeeinn.tauri-markdown\store.json` |
| **日志文件** (`app.log`) | `.\app.log` | `%APPDATA%\com.jeeinn.tauri-markdown\app.log` |
| **用户资源** (图片/附件) | `.\assets\` | 相对于 Markdown 文件的位置 |

### 3. 前端 Store 初始化

```javascript
// src/utils/store.js
async function checkPortableMode() {
  if (isPortableMode === null) {
    isPortableMode = await invoke('get_portable_mode')
    console.log('[DEBUG Store] Portable mode:', isPortableMode)
  }
  return isPortableMode
}

async function getStore() {
  const portable = await checkPortableMode()
  
  // Tauri Store 插件在便携模式下会自动使用 exe 同目录
  storeInstance = await Store.load('store.json')
}
```

---

## 📦 便携版打包流程

### 自动化脚本

运行 `npm run build:portable` 时，脚本会：

1. **构建应用**：编译 Tauri 应用（仅 MSI bundle）
2. **创建便携目录**：`src-tauri/target/release/bundle/portable/`
3. **添加标记文件**：创建空的 `.portable` 文件
4. **复制可执行文件**：`tauri-markdown.exe`
5. **复制资源文件**：`resources/` 目录（如果有）
6. **生成 README**：使用说明文档
7. **打包 ZIP**：创建 `tauri-markdown_0.5.1_x64_portable.zip`

### 生成的文件结构

```
tauri-markdown_0.5.1_x64_portable.zip
├── .portable              ← 便携模式标记文件（空文件）
├── tauri-markdown.exe     ← 主程序
├── resources/             ← 资源文件夹（如果有）
└── README.txt            ← 使用说明
```

### 运行时文件结构

用户解压并运行后，会在同目录生成：

```
D:\USB\TauriMarkdown\
├── .portable              ← 标记文件（已存在）
├── tauri-markdown.exe     ← 主程序
├── store.json             ← ✨ 自动生成的配置文件
├── app.log                ← ✨ 自动生成的日志文件
├── assets/                ← 用户上传的图片/附件
│   ├── images/
│   └── files/
└── README.txt
```

---

## 🎯 关键特性

### ✅ 完全便携

- **配置文件跟随**：`store.json` 存储在 exe 同目录
- **日志文件跟随**：`app.log` 存储在 exe 同目录
- **即插即用**：复制到任何位置即可使用
- **无残留**：删除文件夹即完全卸载

### ✅ 自动切换

- **智能检测**：通过 `.portable` 文件自动识别模式
- **无需配置**：用户无需手动设置任何选项
- **向后兼容**：不影响现有的安装版用户

### ✅ 数据安全

- **独立存储**：便携版和安装版的数据完全隔离
- **不会冲突**：两种模式可以同时存在于同一台电脑
- **易于备份**：直接复制整个文件夹即可备份所有数据

---

## 🔧 技术实现细节

### Rust 后端

#### 1. 便携模式状态管理

```rust
struct PortableMode(bool);

#[tauri::command]
fn get_portable_mode(state: State<'_, PortableMode>) -> bool {
    state.0
}
```

#### 2. 日志路径动态切换

```rust
fn switch_log_to_app_data(app_handle: &tauri::AppHandle) {
    let exe_path = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let portable_marker = exe_dir.join(".portable");
    let is_portable = portable_marker.exists();
    
    let new_path = if is_portable {
        exe_dir.join("app.log")  // 便携模式
    } else {
        let dir = app_handle.path().app_data_dir().unwrap();
        dir.join("app.log")      // 正常模式
    };
    
    // ... 迁移日志文件
}
```

### JavaScript 前端

#### 1. 便携模式检测

```javascript
import { invoke } from '@tauri-apps/api/core'

async function checkPortableMode() {
  isPortableMode = await invoke('get_portable_mode')
  return isPortableMode
}
```

#### 2. Store 初始化

```javascript
import { Store } from '@tauri-apps/plugin-store'

async function getStore() {
  const portable = await checkPortableMode()
  
  // Tauri Store 插件会根据应用上下文自动选择存储路径
  // 便携模式下会使用 exe 同目录
  storeInstance = await Store.load('store.json')
}
```

---

## 📝 注意事项

### ⚠️ 重要提示

1. **不要删除 `.portable` 文件**
   - 删除后应用会切换到正常模式
   - 会导致找不到之前的配置数据

2. **权限要求**
   - 便携版需要对所在目录有写入权限
   - 某些受保护的目录（如 `C:\Program Files`）可能需要管理员权限

3. **路径长度限制**
   - Windows 路径最大长度为 260 字符
   - 避免将便携版放在过深的目录结构中

4. **防病毒软件**
   - 某些杀毒软件可能误报便携版应用
   - 建议将整个文件夹添加到白名单

### 💡 最佳实践

1. **U 盘使用**
   ```
   E:\
   └── Apps\
       └── TauriMarkdown\
           ├── .portable
           ├── tauri-markdown.exe
           ├── store.json
           └── ...
   ```

2. **云同步**
   - 可以将整个文件夹放入 OneDrive/Dropbox
   - 实现多电脑同步配置和数据

3. **备份策略**
   - 定期复制整个文件夹到备份位置
   - 或直接压缩成 ZIP 存档

---

## 🆚 版本对比

| 特性 | v0.5.0 及之前 | v0.5.1+（当前） |
|------|--------------|----------------|
| 便携版支持 | ❌ 不支持 | ✅ 完全支持 |
| 配置文件位置 | 仅 `%APPDATA%` | 根据模式自动选择 |
| 日志文件位置 | 仅 `%APPDATA%` | 根据模式自动选择 |
| 便携模式检测 | N/A | `.portable` 标记文件 |
| 自动切换 | N/A | ✅ 自动检测 |

---

## 🐛 故障排除

### 问题 1：便携版仍然在 `%APPDATA%` 生成文件

**原因**：`.portable` 标记文件丢失或未被检测到

**解决**：
1. 检查 exe 同目录是否存在 `.portable` 文件
2. 如果不存在，手动创建一个空文件命名为 `.portable`
3. 重启应用

### 问题 2：无法保存配置

**原因**：目录权限不足

**解决**：
1. 右键点击文件夹 → 属性 → 安全
2. 确保当前用户有"写入"权限
3. 或移动到用户有权限的目录（如 `D:\Apps\`）

### 问题 3：从便携版切换到安装版后找不到配置

**原因**：两种模式的数据是隔离的

**解决**：
1. 手动复制 `store.json` 到 `%APPDATA%\com.jeeinn.tauri-markdown\`
2. 或继续使用便携版（推荐）

---

## 📚 相关文档

- [Windows 便携版构建指南](./windows-portable-build.md)
- [Tauri Store 插件文档](https://v2.tauri.app/reference/javascript/api/namespacetauripluginstore/)
- [Tauri Path API](https://v2.tauri.app/reference/javascript/api/namespacetauriapi.path/)

---

**最后更新**：2026-05-17  
**适用版本**：TauriMarkdown v0.5.1+
