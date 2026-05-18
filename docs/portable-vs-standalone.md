# Windows 便携版格式对比指南

## 📦 两种便携版格式说明

Tauri Markdown 提供两种 Windows 便携版格式，满足不同用户需求。

---

## 🔍 快速对比

| 特性 | Portable ZIP | Standalone EXE |
|------|-------------|----------------|
| **文件大小** | ~10.57 MB | ~10.55 MB |
| **包含文件** | EXE + 资源 + README + `.portable` | 仅 EXE |
| **便携模式** | ✅ 自动启用 | ❌ 需手动启用 |
| **配置存储** | exe 同目录 | %APPDATA%（默认） |
| **推荐用户** | ⭐ 所有用户 | 高级用户/开发者 |

---

## 📂 详细对比

### 1️⃣ Portable ZIP（便携版 ZIP）⭐推荐

#### 包含内容
```
tauri-markdown/
├── .portable              ← 关键！自动启用便携模式
├── tauri-markdown.exe     ← 主程序 (~22 MB)
├── resources/             ← 应用资源（如果有）
│   └── ...
├── sidecars/              ← 附属二进制文件（如果有）
│   └── ...
└── README.txt            ← 使用说明
```

#### 特点
- ✅ **开箱即用**：解压后直接运行，无需额外配置
- ✅ **真正的便携**：所有配置文件存储在 exe 同目录
- ✅ **完整文档**：包含 README 说明文件
- ✅ **资源完整**：包含所有必要的资源文件
- ✅ **无系统残留**：删除文件夹 = 完全卸载

#### 配置存储位置
```
D:\USB\TauriMarkdown\
├── .portable
├── tauri-markdown.exe
├── store.json          ← 配置文件（自动生成）
├── app.log             ← 日志文件（自动生成）
└── assets/             ← 用户上传的资源
    ├── images/
    └── files/
```

#### 适用场景
- 🎒 **U 盘携带**：放在 U 盘中，在任何电脑上使用
- 🔄 **多电脑同步**：配置和数据跟随文件夹移动
- 🧹 **不留痕迹**：不在系统中留下任何配置或日志
- 👤 **普通用户**：最简单的使用方式

#### 使用方法
1. 下载 `tauri-markdown_{version}_x64_portable.zip`
2. 解压到任意位置（如 U 盘、桌面等）
3. 双击运行 `tauri-markdown.exe`
4. 开始使用，配置自动保存

---

### 2️⃣ Standalone EXE（独立 EXE 版）

#### 包含内容
```
tauri-markdown/
└── tauri-markdown.exe     ← 只有这个文件 (~22 MB)
```

#### 特点
- 📦 **最小化**：仅包含可执行文件
- ⚙️ **灵活配置**：可以自行决定是否启用便携模式
- 🔧 **适合集成**：易于集成到自动化脚本或部署工具中
- 💾 **体积略小**：比 Portable ZIP 小约 20 KB（几乎可忽略）

#### 默认配置存储位置（未启用便携模式时）
```
C:\Users\YourName\AppData\Roaming\com.jeeinn.tauri-markdown\
├── store.json          ← 配置文件
└── app.log             ← 日志文件
```

#### 如何启用便携模式

**方法 1：手动创建 `.portable` 文件**

在 exe 同目录创建一个空的 `.portable` 文件：

```powershell
# PowerShell
New-Item -Path ".portable" -ItemType File
```

```cmd
# CMD
echo "" > .portable
```

**方法 2：使用文本编辑器**

1. 在 exe 同目录新建文本文档
2. 命名为 `.portable`（注意前面的点）
3. 保持文件为空

**验证是否启用成功：**

运行程序后，检查 exe 同目录是否生成了 `store.json` 和 `app.log`：
- ✅ 如果生成了 → 便携模式已启用
- ❌ 如果在 `%APPDATA%` 中生成 → 便携模式未启用

#### 适用场景
- 👨‍💻 **开发者**：需要最小化的分发包
- 🤖 **自动化部署**：集成到 CI/CD 或部署脚本中
- 🎯 **自定义需求**：想自己控制是否启用便携模式
- 📊 **批量分发**：需要统一管理的场景

#### 使用方法

**标准模式（默认）：**
1. 下载 `tauri-markdown_{version}_x64_standalone.zip`
2. 解压并运行 `tauri-markdown.exe`
3. 配置存储在 `%APPDATA%`

**便携模式（手动启用）：**
1. 下载并解压
2. 在 exe 同目录创建 `.portable` 文件
3. 运行 `tauri-markdown.exe`
4. 配置存储在 exe 同目录

---

## 🎯 选择建议

### 推荐使用 Portable ZIP ⭐

**适合 95% 的用户**，因为：
- ✅ 无需额外操作，开箱即用
- ✅ 自动启用便携模式
- ✅ 包含完整的使用说明
- ✅ 真正的即插即用体验

### 何时选择 Standalone EXE

**仅在以下情况考虑**：
- 🤔 你需要最小化的文件（节省 ~20 KB，几乎可忽略）
- 🤔 你要集成到自己的部署脚本中
- 🤔 你想自己控制便携模式的启用时机
- 🤔 你是开发者，需要灵活性

---

## ❓ 常见问题

### Q1: 我已经下载了 Standalone EXE，如何转换为便携模式？

**A:** 很简单，在 exe 同目录创建一个空的 `.portable` 文件即可：

```powershell
# 在 exe 所在目录执行
New-Item -Path ".portable" -ItemType File
```

然后重新运行程序，就会启用便携模式。

### Q2: 两种版本的程序功能有区别吗？

**A:** 没有区别！程序本身完全相同，只是：
- Portable ZIP 预置了 `.portable` 文件
- Standalone EXE 需要你手动添加

### Q3: 我可以从 Standalone EXE 切换到 Portable ZIP 吗？

**A:** 可以，但没必要。两者本质相同，只需：
- 如果使用 Standalone EXE：手动创建 `.portable` 文件
- 如果想用 Portable ZIP：重新下载即可

### Q4: 便携模式的配置文件会丢失吗？

**A:** 不会！只要你不删除文件夹，配置文件就会一直存在。
- Portable ZIP：配置在 exe 同目录，随文件夹移动
- Standalone EXE（便携模式）：同样在 exe 同目录

### Q5: 哪种版本更新更方便？

**A:** 
- **Portable ZIP**：下载新版本 ZIP，解压覆盖旧文件即可（配置保留）
- **Standalone EXE**：同样下载新版本覆盖，但如果启用了便携模式，行为相同

---

## 📊 技术细节

### 便携模式检测原理

程序启动时会检测 exe 同目录是否存在 `.portable` 文件：

```rust
// Rust 伪代码
let exe_path = std::env::current_exe().unwrap();
let exe_dir = exe_path.parent().unwrap();
let portable_marker = exe_dir.join(".portable");

if portable_marker.exists() {
    // 启用便携模式
    // 配置文件存储在 exe_dir
} else {
    // 标准模式
    // 配置文件存储在 %APPDATA%
}
```

### 文件对比

| 文件 | Portable ZIP | Standalone EXE |
|------|-------------|----------------|
| `tauri-markdown.exe` | ✅ | ✅ |
| `.portable` | ✅ | ❌ |
| `README.txt` | ✅ | ❌ |
| `resources/` | ✅ (如果有) | ❌ |
| `sidecars/` | ✅ (如果有) | ❌ |

### 配置路径对比

**Portable ZIP（或启用便携模式的 Standalone EXE）：**
```
./
├── tauri-markdown.exe
├── .portable
├── store.json      ← Tauri Store 配置
├── app.log         ← 应用日志
└── assets/         ← 用户资源
```

**Standalone EXE（标准模式）：**
```
C:\Users\YourName\AppData\Roaming\com.jeeinn.tauri-markdown\
├── store.json      ← Tauri Store 配置
└── app.log         ← 应用日志

D:\SomeFolder\
└── tauri-markdown.exe  ← 可执行文件（配置不在此）
```

---

## 💡 最佳实践

### 对于普通用户

1. **始终下载 Portable ZIP**
2. 解压到 U 盘或常用位置
3. 直接使用，无需额外配置
4. 备份时复制整个文件夹

### 对于开发者

1. 根据需求选择合适的版本
2. 如需便携模式，确保 `.portable` 文件存在
3. 在自动化脚本中处理文件创建
4. 测试两种模式的行为

### 对于企业部署

1. 评估是否需要便携模式
2. 如需要，使用 Portable ZIP 或创建 `.portable` 文件
3. 考虑配置管理策略
4. 文档化部署流程

---

## 📝 总结

| 方面 | Portable ZIP | Standalone EXE |
|------|-------------|----------------|
| **易用性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **灵活性** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **完整性** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **推荐度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**结论**：除非你有特殊需求，否则**始终选择 Portable ZIP**。它提供了最好的用户体验和最完整的便携功能。

---

**最后更新**: 2026-05-18  
**适用版本**: v0.5.1+
