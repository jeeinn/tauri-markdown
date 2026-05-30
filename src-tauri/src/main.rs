#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::http::{header::CONTENT_TYPE, Request, Response};
use tauri::{Manager, State, UriSchemeContext};
use serde::{Serialize, Deserialize};
use base64::Engine;

// ── 日志 ──────────────────────────────────────────────

/// 全局日志路径（启动时用 temp 目录，setup 后切换到 app_data_dir）
static LOG_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

/// 获取当前日志路径
fn current_log_path() -> PathBuf {
    LOG_PATH
        .lock()
        .unwrap()
        .clone()
        .unwrap_or_else(|| std::env::temp_dir().join("tauri-markdown-app.log"))
}

/// 写入一行日志（追加模式）
fn log(msg: &str) {
    let ts = chrono_now();
    let line = format!("[{ts}] {msg}\n");
    let path = current_log_path();
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = f.write_all(line.as_bytes());
    }
}

/// UTC 时间戳
fn chrono_now() -> String {
    let d = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = d.as_secs();
    let s = secs % 60;
    let mins = (secs / 60) % 60;
    let hours = (secs / 3600) % 24;
    format!("{hours:02}:{mins:02}:{s:02} UTC")
}

/// 启动时初始化日志（temp 目录，截断旧文件）
fn init_log() {
    let path = std::env::temp_dir().join("tauri-markdown-app.log");
    *LOG_PATH.lock().unwrap() = Some(path.clone());
    let _ = std::fs::write(&path, "");
    log("=== TauriMarkdown started ===");
}

/// setup 阶段：将日志路径切换到正式的 app_data_dir 或便携目录
fn switch_log_to_app_data(app_handle: &tauri::AppHandle) {
    // 检测便携模式
    let exe_path = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let portable_marker = exe_dir.join(".portable");
    let is_portable = portable_marker.exists();

    let new_path = if is_portable {
        // 便携模式：日志存储在可执行文件同目录
        log("Using portable mode for log file");
        exe_dir.join("app.log")
    } else {
        // 正常模式：日志存储在 app_data_dir
        let Ok(dir) = app_handle.path().app_data_dir() else { return };
        dir.join("app.log")
    };

    let _ = std::fs::create_dir_all(new_path.parent().unwrap());

    // 将已有日志内容迁移到新路径
    let old_path = current_log_path();
    if old_path != new_path {
        if let Ok(content) = std::fs::read_to_string(&old_path) {
            let _ = std::fs::write(&new_path, content);
        }
        *LOG_PATH.lock().unwrap() = Some(new_path.clone());
    }
    log(&format!("log_path switched to: {:?}", new_path));
}

// ── 应用状态 ──────────────────────────────────────────

/// 当前打开的 md 文件所在目录，由 JS 端在打开/切换文件时更新
struct CurrentDir(Mutex<Option<PathBuf>>);

/// JS 端调用，设置当前 md 文件所在目录
#[tauri::command]
fn set_current_dir(dir: String, state: State<'_, CurrentDir>) {
    log(&format!("set_current_dir: {dir}"));
    *state.0.lock().unwrap() = Some(PathBuf::from(&dir));
}

/// 便携模式标记（通过 .portable 文件检测）
struct PortableMode(bool);

/// JS 端调用，获取便携模式状态
#[tauri::command]
fn get_portable_mode(state: State<'_, PortableMode>) -> bool {
    state.0
}

#[tauri::command]
fn get_store_path(state: State<'_, PortableMode>) -> String {
    if state.0 {
        // 便携模式：返回 exe 同目录的绝对路径
        let exe_path = std::env::current_exe().unwrap_or_default();
        let exe_dir = exe_path.parent().unwrap_or_else(|| std::path::Path::new("."));
        let store_path = exe_dir.join("store.json");
        log(&format!("[Rust] Store path (portable): {:?}", store_path));
        store_path.to_string_lossy().to_string()
    } else {
        // 正常模式：返回相对路径，让 Tauri 自动处理
        log("[Rust] Store path (normal): store.json");
        "store.json".to_string()
    }
}

/// 通过"打开方式"传入的文件路径（首次启动时由命令行参数获取）
struct OpenedFile(Mutex<Option<PathBuf>>);

/// JS 端调用，获取并消费通过"打开方式"传入的文件路径（取一次即清空）
#[tauri::command]
fn take_opened_file(state: State<'_, OpenedFile>) -> Option<String> {
    let result = state.0.lock().unwrap().take().map(|p| p.to_string_lossy().into_owned());
    log(&format!("take_opened_file called, returning: {:?}", result));
    result
}

/// JS 端调用，写入日志（前端也能输出到 app.log）
#[tauri::command]
fn log_message(msg: String) {
    log(&format!("[JS] {msg}"));
}

/// JS 端调用，在文件管理器中打开日志文件所在目录并选中该文件
#[tauri::command]
fn open_log_folder() {
    let path = current_log_path();
    log(&format!("open_log_folder: {:?}", path));
    #[cfg(target_os = "windows")]
    { let _ = std::process::Command::new("explorer").args(["/select,", &path.to_string_lossy()]).spawn(); }
    #[cfg(target_os = "macos")]
    { let _ = std::process::Command::new("open").args(["-R", &path.to_string_lossy()]).spawn(); }
    #[cfg(target_os = "linux")]
    { let _ = std::process::Command::new("xdg-open").arg(path.parent().unwrap_or(&path)).spawn(); }
}

/// JS 端调用，打开开发者工具
#[tauri::command]
fn open_devtools(app_handle: tauri::AppHandle) {
    log("open_devtools called");
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.open_devtools();
        log("DevTools opened");
    } else {
        log("Failed to get main window");
    }
}

// ── tmd 协议 ─────────────────────────────────────────

/// 从 request URI 中提取相对路径
fn extract_path(uri: &tauri::http::Uri) -> String {
    let path = uri.path();
    let rel = path.strip_prefix('/').unwrap_or(path);
    urldecode(rel)
}

/// URL 解码
fn urldecode(input: &str) -> String {
    let mut result = Vec::new();
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(byte) = u8::from_str_radix(
                std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or(""),
                16,
            ) {
                result.push(byte);
                i += 3;
                continue;
            }
        }
        if bytes[i] == b'+' {
            result.push(b' ');
            i += 1;
            continue;
        }
        result.push(bytes[i]);
        i += 1;
    }
    String::from_utf8(result).unwrap_or_default()
}

/// 根据扩展名猜测 MIME Type
fn guess_mime(path: &str) -> String {
    mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string()
}

/// 1x1 透明 PNG 占位图（67 字节），用于错误响应避免浏览器显示破损图标
const PLACEHOLDER_PNG: &[u8] = &[
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
    0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
];

fn placeholder_response() -> Response<Vec<u8>> {
    Response::builder()
        .status(200)
        .header(CONTENT_TYPE, "image/png")
        .body(PLACEHOLDER_PNG.to_vec())
        .unwrap()
}

/// tmd 自定义协议 handler
fn tmd_protocol_handler<R: tauri::Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let relative_path = extract_path(request.uri());

    let app_handle = ctx.app_handle();
    let state: State<CurrentDir> = app_handle.state();
    let base_dir = state.0.lock().unwrap().clone();

    let base = match base_dir {
        Some(dir) => dir,
        None => {
            return placeholder_response();
        }
    };

    let full_path = base.join(&relative_path);

    let canonical = match std::fs::canonicalize(&full_path) {
        Ok(p) => p,
        Err(_) => {
            return placeholder_response();
        }
    };

    let content = match std::fs::read(&canonical) {
        Ok(c) => c,
        Err(_) => {
            return placeholder_response();
        }
    };

    let mime = guess_mime(&relative_path);

    Response::builder()
        .status(200)
        .header(CONTENT_TYPE, mime)
        .body(content)
        .unwrap()
}

// ── 启动 ─────────────────────────────────────────────

/// 从命令行参数中提取被打开的文件路径（Windows / Linux "打开方式" 传入）
fn extract_opened_file() -> Option<PathBuf> {
    log("extract_opened_file: scanning args...");
    let args: Vec<String> = std::env::args().collect();
    log(&format!("  total args: {}", args.len()));
    for (i, arg) in args.iter().enumerate() {
        log(&format!("  args[{i}]: {arg}"));
    }

    let result = args
        .into_iter()
        .skip(1)
        .find(|arg| !arg.starts_with('-'))
        .and_then(|arg| {
            log(&format!("  candidate arg: {arg}"));
            // 只有 file:// 开头才走 URL 路径转换；Windows 盘符路径（C:\...）会被
            // url::Url::parse 误识别为 scheme，所以其余情况一律按文件路径处理
            if arg.starts_with("file://") {
                if let Ok(url) = url::Url::parse(&arg) {
                    log(&format!("  parsed as file URL: {url}"));
                    return url.to_file_path().ok().filter(|p| {
                        let exists = p.exists();
                        log(&format!("  file_path: {:?}, exists: {}", p, exists));
                        exists
                    });
                }
            }
            let p = PathBuf::from(&arg);
            let exists = p.exists();
            log(&format!("  treated as path: {:?}, exists: {}", p, exists));
            if exists { Some(p) } else { None }
        });

    log(&format!("extract_opened_file result: {:?}", result));
    result
}

fn main() {
    init_log();

    let opened_file = extract_opened_file();
    log(&format!("opened_file from args: {:?}", opened_file));

    // 检测便携模式：检查可执行文件目录下是否存在 .portable 标记文件
    let exe_path = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let portable_marker = exe_dir.join(".portable");
    let is_portable = portable_marker.exists();

    log(&format!("Portable mode detected: {}", is_portable));
    if is_portable {
        log(&format!("Using portable data directory: {:?}", exe_dir));
    }

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(CurrentDir(Mutex::new(None)))
        .manage(OpenedFile(Mutex::new(opened_file)))
        .manage(PortableMode(is_portable))
        .invoke_handler(tauri::generate_handler![
            set_current_dir,
            take_opened_file,
            log_message,
            open_log_folder,
            get_portable_mode,
            get_store_path,
            open_devtools,
            save_image_host_config,
            get_image_host_config,
            import_picgo_config,
            test_image_host_connection,
            upload_to_image_host
        ])
        .register_uri_scheme_protocol("tmd", tmd_protocol_handler)
        .setup(|app| {
            switch_log_to_app_data(app.handle());
            log("setup completed");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // 使用 App::run(callback) 接收事件
    app.run(|app, event| {
        // macOS/iOS/Android：通过 RunEvent::Opened 接收"打开方式"传入的文件
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
        if let tauri::RunEvent::Opened { urls } = event {
            log(&format!("RunEvent::Opened received, urls: {:?}", urls));
            for url in urls {
                if let Ok(path) = url.to_file_path() {
                    log(&format!("  opened file: {:?}", path));
                    let state: State<OpenedFile> = app.state();
                    *state.0.lock().unwrap() = Some(path);
                    break;
                }
            }
        }
        // 抑制 Windows/Linux 上未使用变量的警告
        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
        let _ = (app, event);
    });
}

// ── 图床配置 ─────────────────────────────────────────

/// SM.MS 图床配置 (兼容 PicGo picBed.smms)
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SmmsConfig {
    token: String,
    #[serde(default)]
    backup_domain: Option<String>,
}

/// GitHub 图床配置 (兼容 PicGo picBed.github)
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct GithubConfig {
    repo: String,
    #[serde(default = "default_master_branch")]
    branch: String,
    token: String,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    custom_url: Option<String>,
}

/// Gitee 图床配置 (兼容 PicGo picBed.gitee 插件)
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct GiteeConfig {
    #[serde(default)]
    owner: Option<String>,
    repo: String,
    #[serde(default = "default_master_branch")]
    branch: String,
    token: String,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    custom_url: Option<String>,
    #[serde(default)]
    message: Option<String>,
}

fn default_master_branch() -> String {
    "master".to_string()
}

/// 阿里云 OSS 图床配置 (兼容 PicGo picBed.aliyun)
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct AliyunOssConfig {
    access_key_id: String,
    access_key_secret: String,
    bucket: String,
    #[serde(default = "default_area")]
    area: String,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    custom_url: Option<String>,
    #[serde(default)]
    options: Option<String>,
}

fn default_area() -> String {
    "oss-cn-hangzhou".to_string()
}

/// 图床总配置 (兼容 PicGo picBed 结构)
#[derive(Serialize, Deserialize, Clone, Debug)]
struct ImageHostConfig {
    enabled: bool,
    current: String,
    #[serde(default)]
    smms: Option<SmmsConfig>,
    #[serde(default)]
    github: Option<GithubConfig>,
    #[serde(default)]
    gitee: Option<GiteeConfig>,
    #[serde(default)]
    aliyun_oss: Option<AliyunOssConfig>,
}

impl Default for ImageHostConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            current: String::new(),
            smms: None,
            github: None,
            gitee: None,
            aliyun_oss: None,
        }
    }
}

// ── 配置保存/加载 ────────────────────────────────────

#[tauri::command]
async fn save_image_host_config(
    app_handle: tauri::AppHandle,
    config: ImageHostConfig,
    storage_type: String,
) -> Result<(), String> {
    log(&format!("save_image_host_config: storage_type={}", storage_type));

    match storage_type.as_str() {
        "tauri_store" => save_to_tauri_store(&app_handle, &config).await,
        "picgo_native" => save_to_picgo_config(&config).await,
        _ => Err("Invalid storage type".to_string()),
    }
}

async fn save_to_tauri_store(app_handle: &tauri::AppHandle, config: &ImageHostConfig) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app_handle.store("store.json").map_err(|e| e.to_string())?;
    store.set("image_host_config", serde_json::to_value(config).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;

    log("图床配置已保存到 Tauri Store");
    Ok(())
}

async fn save_to_picgo_config(config: &ImageHostConfig) -> Result<(), String> {
    let picgo_config = convert_to_picgo_format(config);
    let config_path = get_picgo_config_path()?;

    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    // 如果已存在 PicGo 配置,合并而非覆盖
    let mut root = if let Ok(content) = std::fs::read_to_string(&config_path) {
        serde_json::from_str::<serde_json::Value>(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // 只更新 picBed 部分
    if let Some(obj) = root.as_object_mut() {
        obj.insert("picBed".to_string(), picgo_config);
    }

    let json = serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?;
    std::fs::write(&config_path, json).map_err(|e| format!("写入文件失败: {}", e))?;

    log(&format!("图床配置已保存到 PicGo 配置: {:?}", config_path));
    Ok(())
}

/// 转换为 PicGo picBed 格式
fn convert_to_picgo_format(config: &ImageHostConfig) -> serde_json::Value {
    let mut picgo_bed = serde_json::Map::new();
    picgo_bed.insert("current".to_string(), serde_json::Value::String(config.current.clone()));
    picgo_bed.insert("uploader".to_string(), serde_json::Value::String(config.current.clone()));

    // SM.MS
    if let Some(smms) = &config.smms {
        let mut sm = serde_json::Map::new();
        sm.insert("token".to_string(), serde_json::Value::String(smms.token.clone()));
        if let Some(domain) = &smms.backup_domain {
            sm.insert("backupDomain".to_string(), serde_json::Value::String(domain.clone()));
        }
        picgo_bed.insert("smms".to_string(), serde_json::Value::Object(sm));
    }

    // GitHub
    if let Some(github) = &config.github {
        let mut gh = serde_json::Map::new();
        gh.insert("repo".to_string(), serde_json::Value::String(github.repo.clone()));
        gh.insert("branch".to_string(), serde_json::Value::String(github.branch.clone()));
        gh.insert("token".to_string(), serde_json::Value::String(github.token.clone()));
        if let Some(path) = &github.path {
            gh.insert("path".to_string(), serde_json::Value::String(path.clone()));
        }
        if let Some(url) = &github.custom_url {
            gh.insert("customUrl".to_string(), serde_json::Value::String(url.clone()));
        }
        picgo_bed.insert("github".to_string(), serde_json::Value::Object(gh));
    }

    // Gitee (PicGo 插件使用 owner/repo 分开的格式)
    if let Some(gitee) = &config.gitee {
        let mut ge = serde_json::Map::new();
        if let Some(owner) = &gitee.owner {
            ge.insert("owner".to_string(), serde_json::Value::String(owner.clone()));
        }
        ge.insert("repo".to_string(), serde_json::Value::String(gitee.repo.clone()));
        ge.insert("token".to_string(), serde_json::Value::String(gitee.token.clone()));
        if let Some(path) = &gitee.path {
            ge.insert("path".to_string(), serde_json::Value::String(path.clone()));
        }
        if let Some(msg) = &gitee.message {
            ge.insert("message".to_string(), serde_json::Value::String(msg.clone()));
        }
        picgo_bed.insert("gitee".to_string(), serde_json::Value::Object(ge));
    }

    // 阿里云 OSS
    if let Some(oss) = &config.aliyun_oss {
        let mut al = serde_json::Map::new();
        al.insert("accessKeyId".to_string(), serde_json::Value::String(oss.access_key_id.clone()));
        al.insert("accessKeySecret".to_string(), serde_json::Value::String(oss.access_key_secret.clone()));
        al.insert("bucket".to_string(), serde_json::Value::String(oss.bucket.clone()));
        al.insert("area".to_string(), serde_json::Value::String(oss.area.clone()));
        if let Some(path) = &oss.path {
            al.insert("path".to_string(), serde_json::Value::String(path.clone()));
        }
        if let Some(url) = &oss.custom_url {
            al.insert("customUrl".to_string(), serde_json::Value::String(url.clone()));
        }
        if let Some(opts) = &oss.options {
            al.insert("options".to_string(), serde_json::Value::String(opts.clone()));
        }
        picgo_bed.insert("aliyun".to_string(), serde_json::Value::Object(al));
    }

    serde_json::Value::Object(picgo_bed)
}

fn get_picgo_config_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "无法获取用户主目录".to_string())?;

    #[cfg(target_os = "windows")]
    let path = PathBuf::from(home).join("AppData").join("Roaming").join("picgo").join("data.json");

    #[cfg(target_os = "macos")]
    let path = PathBuf::from(home).join("Library").join("Application Support").join("picgo").join("data.json");

    #[cfg(target_os = "linux")]
    let path = PathBuf::from(home).join(".config").join("picgo").join("data.json");

    Ok(path)
}

#[tauri::command]
async fn get_image_host_config(app_handle: tauri::AppHandle) -> Result<Option<ImageHostConfig>, String> {
    log("get_image_host_config called");

    if let Ok(config) = load_from_tauri_store(&app_handle).await {
        log("从 Tauri Store 加载配置成功");
        return Ok(Some(config));
    }

    log("未找到图床配置");
    Ok(None)
}

/// 从 PicGo 原生配置文件导入
#[tauri::command]
async fn import_picgo_config() -> Result<ImageHostConfig, String> {
    log("import_picgo_config called");
    load_from_picgo_config().await
}

async fn load_from_tauri_store(app_handle: &tauri::AppHandle) -> Result<ImageHostConfig, String> {
    use tauri_plugin_store::StoreExt;

    let store = app_handle.store("store.json").map_err(|e| e.to_string())?;
    let value = store.get("image_host_config").ok_or("配置不存在")?;
    let config: ImageHostConfig = serde_json::from_value(value).map_err(|e| e.to_string())?;
    Ok(config)
}

async fn load_from_picgo_config() -> Result<ImageHostConfig, String> {
    let config_path = get_picgo_config_path()?;
    let content = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let picgo_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    convert_from_picgo_format(&picgo_data)
}

/// 从 PicGo 格式转换为我们的格式
fn convert_from_picgo_format(picgo_data: &serde_json::Value) -> Result<ImageHostConfig, String> {
    let pic_bed = picgo_data.get("picBed").ok_or("无效的 PicGo 配置")?;

    let current = pic_bed.get("current")
        .or_else(|| pic_bed.get("uploader"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // 解析 SM.MS
    let smms = pic_bed.get("smms").map(|v| SmmsConfig {
        token: v.get("token").and_then(|t| t.as_str()).unwrap_or("").to_string(),
        backup_domain: v.get("backupDomain").and_then(|d| d.as_str()).map(|s| s.to_string()),
    });

    // 解析 GitHub
    let github = pic_bed.get("github").map(|v| GithubConfig {
        repo: v.get("repo").and_then(|r| r.as_str()).unwrap_or("").to_string(),
        branch: v.get("branch").and_then(|b| b.as_str()).unwrap_or("master").to_string(),
        token: v.get("token").and_then(|t| t.as_str()).unwrap_or("").to_string(),
        path: v.get("path").and_then(|p| p.as_str()).map(|s| s.to_string()),
        custom_url: v.get("customUrl").and_then(|u| u.as_str()).map(|s| s.to_string()),
    });

    // 解析 Gitee
    let gitee = pic_bed.get("gitee").map(|v| GiteeConfig {
        owner: v.get("owner").and_then(|o| o.as_str()).map(|s| s.to_string()),
        repo: v.get("repo").and_then(|r| r.as_str()).unwrap_or("").to_string(),
        branch: v.get("branch").and_then(|b| b.as_str()).unwrap_or("master").to_string(),
        token: v.get("token").and_then(|t| t.as_str()).unwrap_or("").to_string(),
        path: v.get("path").and_then(|p| p.as_str()).map(|s| s.to_string()),
        custom_url: None,
        message: v.get("message").and_then(|m| m.as_str()).map(|s| s.to_string()),
    });

    // 解析阿里云 OSS
    let aliyun_oss = pic_bed.get("aliyun").map(|v| AliyunOssConfig {
        access_key_id: v.get("accessKeyId").and_then(|k| k.as_str()).unwrap_or("").to_string(),
        access_key_secret: v.get("accessKeySecret").and_then(|k| k.as_str()).unwrap_or("").to_string(),
        bucket: v.get("bucket").and_then(|b| b.as_str()).unwrap_or("").to_string(),
        area: v.get("area").and_then(|a| a.as_str()).unwrap_or("oss-cn-hangzhou").to_string(),
        path: v.get("path").and_then(|p| p.as_str()).map(|s| s.to_string()),
        custom_url: v.get("customUrl").and_then(|u| u.as_str()).map(|s| s.to_string()),
        options: v.get("options").and_then(|o| o.as_str()).map(|s| s.to_string()),
    });

    Ok(ImageHostConfig {
        enabled: true,
        current,
        smms,
        github,
        gitee,
        aliyun_oss,
    })
}

// ── 连接测试 ─────────────────────────────────────────

#[tauri::command]
async fn test_image_host_connection(config: ImageHostConfig) -> Result<serde_json::Value, String> {
    log(&format!("test_image_host_connection: current={}", config.current));

    match config.current.as_str() {
        "smms" => test_smms_connection(config.smms.ok_or("SM.MS 配置缺失")?).await,
        "github" => test_github_connection(config.github.ok_or("GitHub 配置缺失")?).await,
        "gitee" => test_gitee_connection(config.gitee.ok_or("Gitee 配置缺失")?).await,
        "aliyun_oss" => test_aliyun_oss_connection(config.aliyun_oss.ok_or("阿里云 OSS 配置缺失")?).await,
        _ => Err("不支持的图床类型".to_string()),
    }
}

/// 测试 SM.MS/s.ee 连接
async fn test_smms_connection(smms_config: SmmsConfig) -> Result<serde_json::Value, String> {
    let client = tauri_plugin_http::reqwest::Client::new();
    let domain = smms_config.backup_domain.as_deref().unwrap_or("s.ee");
    let profile_url = if domain == "s.ee" {
        format!("https://{}/api/v1/profile", domain)
    } else {
        format!("https://{}/api/v2/profile", domain)
    };

    let response = client.get(&profile_url)
        .header("Authorization", &smms_config.token)
        .header("User-Agent", "PicGo")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = response.status();
    if status.is_success() {
        Ok(serde_json::json!({ "success": true, "message": "连接成功" }))
    } else {
        Err(format!("连接失败: HTTP {}", status))
    }
}

/// 测试 GitHub 连接
async fn test_github_connection(github_config: GithubConfig) -> Result<serde_json::Value, String> {
    let client = tauri_plugin_http::reqwest::Client::new();
    let url = format!("https://api.github.com/repos/{}/branches/{}", github_config.repo, github_config.branch);

    let response = client.get(&url)
        .header("Authorization", format!("token {}", github_config.token))
        .header("User-Agent", "PicGo")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = response.status();
    if status.is_success() {
        Ok(serde_json::json!({ "success": true, "message": "连接成功" }))
    } else {
        Err(format!("连接失败: HTTP {}", status))
    }
}

/// 测试 Gitee 连接
async fn test_gitee_connection(gitee_config: GiteeConfig) -> Result<serde_json::Value, String> {
    let client = tauri_plugin_http::reqwest::Client::new();

    // 支持 owner/repo 或 username/repo 格式
    let repo_full = match &gitee_config.owner {
        Some(owner) => format!("{}/{}", owner, gitee_config.repo),
        None => gitee_config.repo.clone(),
    };
    
    // 使用 Gitee API v5 获取用户信息来验证 token 和仓库访问权限
    // 直接测试分支接口可能会因为仓库不存在或权限问题返回 404
    // 改为先获取用户信息验证 token，再尝试获取仓库信息
    let user_url = "https://gitee.com/api/v5/user";
    
    log(&format!("[Gitee Test] Testing connection for repo: {}", repo_full));
    
    let response = client.get(user_url)
        .query(&[("access_token", &gitee_config.token)])
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = response.status();
    if status.is_success() {
        // token 验证成功，再尝试验证仓库是否存在
        let repo_url = format!("https://gitee.com/api/v5/repos/{}", repo_full);
        let repo_response = client.get(&repo_url)
            .query(&[("access_token", &gitee_config.token)])
            .send()
            .await
            .map_err(|e| format!("验证仓库失败: {}", e))?;
        
        if repo_response.status().is_success() {
            log("[Gitee Test] Connection test successful");
            Ok(serde_json::json!({ "success": true, "message": "连接成功" }))
        } else {
            Err(format!("仓库不存在或无访问权限: HTTP {}", repo_response.status()))
        }
    } else {
        let body = response.text().await.unwrap_or_default();
        log(&format!("[Gitee Test] Token verification failed: HTTP {}", status));
        Err(format!("Token 无效或已过期: HTTP {} {}", status, body))
    }
}

/// 测试阿里云 OSS 连接 (验证配置并尝试列出 Bucket)
async fn test_aliyun_oss_connection(oss_config: AliyunOssConfig) -> Result<serde_json::Value, String> {
    use hmac::{Hmac, Mac};
    use sha1::Sha1;

    if oss_config.access_key_id.is_empty() || oss_config.access_key_secret.is_empty() || oss_config.bucket.is_empty() {
        return Err("配置不完整".to_string());
    }

    let client = tauri_plugin_http::reqwest::Client::new();
    let date = chrono_now_utc();
    let host = format!("{}.{}.aliyuncs.com", oss_config.bucket, oss_config.area);
    // PicGo 签名格式: GET\n\n\n{date}\n/{bucket}/
    let sign_string = format!("GET\n\n\n{}\n/{}/", date, oss_config.bucket);

    type HmacSha1 = Hmac<Sha1>;
    let mut mac = HmacSha1::new_from_slice(oss_config.access_key_secret.as_bytes())
        .map_err(|e| format!("HMAC 初始化失败: {}", e))?;
    mac.update(sign_string.as_bytes());
    let signature = base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes());
    let authorization = format!("OSS {}:{}", oss_config.access_key_id, signature);

    log(&format!("[Aliyun Test] Host: {}, Date: {}", host, date));
    log(&format!("[Aliyun Test] StringToSign: {:?}", sign_string));

    let url = format!("https://{}/?max-keys=1", host);
    let response = client.get(&url)
        .header("Date", &date)
        .header("Authorization", &authorization)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = response.status();
    if status.is_success() {
        Ok(serde_json::json!({ "success": true, "message": "连接成功" }))
    } else {
        let body = response.text().await.unwrap_or_default();
        Err(format!("连接失败: HTTP {} - {}", status, body))
    }
}

fn chrono_now_utc() -> String {
    // RFC 2616 date format: "Thu, 01 Jan 2026 00:00:00 GMT"
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    // 简单格式化,不引入 chrono 依赖
    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let h = time_of_day / 3600;
    let m = (time_of_day % 3600) / 60;
    let s = time_of_day % 60;

    // 计算年月日 (从 1970-01-01 开始)
    let (y, mo, d) = days_to_ymd(days);
    let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let wday = ((days + 4) % 7) as usize; // 1970-01-01 是 Thursday
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    format!("{}, {:02} {} {} {:02}:{:02}:{:02} GMT",
        weekdays[wday], d, months[(mo - 1) as usize], y, h, m, s)
}

fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    let mut y = 1970u64;
    loop {
        let days_in_year = if is_leap(y) { 366 } else { 365 };
        if days < days_in_year { break; }
        days -= days_in_year;
        y += 1;
    }
    let leap = is_leap(y);
    let month_days: [u64; 12] = [
        31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    ];
    let mut m = 1u64;
    for &md in &month_days {
        if days < md { break; }
        days -= md;
        m += 1;
    }
    (y, m, days + 1)
}

fn is_leap(y: u64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0)
}

// ── 图片上传 ─────────────────────────────────────────

#[tauri::command]
async fn upload_to_image_host(
    file_path: String,
    config: ImageHostConfig,
) -> Result<String, String> {
    log(&format!("upload_to_image_host: file={}, host={}", file_path, config.current));

    match config.current.as_str() {
        "smms" => upload_to_smms(file_path, config.smms.ok_or("SM.MS 配置缺失")?).await,
        "github" => upload_to_github(file_path, config.github.ok_or("GitHub 配置缺失")?).await,
        "gitee" => upload_to_gitee(file_path, config.gitee.ok_or("Gitee 配置缺失")?).await,
        "aliyun_oss" => upload_to_aliyun_oss(file_path, config.aliyun_oss.ok_or("阿里云 OSS 配置缺失")?).await,
        _ => Err("不支持的图床类型".to_string()),
    }
}

/// 上传到 SM.MS (兼容 s.ee 和 sm.ms)
async fn upload_to_smms(file_path: String, smms_config: SmmsConfig) -> Result<String, String> {
    use tauri_plugin_http::reqwest;

    let client = reqwest::Client::new();
    let file_content = std::fs::read(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image.png")
        .to_string();

    let domain = smms_config.backup_domain.as_deref().unwrap_or("s.ee");
    let api_path = if domain == "s.ee" { "/api/v1/file/upload" } else { "/api/v2/upload" };
    let url = format!("https://{}{}", domain, api_path);

    // multipart/form-data
    let part = reqwest::multipart::Part::bytes(file_content)
        .file_name(file_name)
        .mime_str("image/png").map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new().part("smfile", part);

    let response = client.post(&url)
        .header("Authorization", &smms_config.token)
        .header("User-Agent", "PicGo")
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("上传请求失败: {}", e))?;

    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| format!("解析响应失败: {}", e))?;

    // s.ee: { code: 200, message: "success", data: { url: "..." } }
    // sm.ms: { code: "success", data: { url: "..." } } 或 { code: 200, data: { url: "..." } }
    let code = json.get("code");
    let is_success = code.map(|c| {
        c.as_i64() == Some(200) || c.as_str() == Some("success")
    }).unwrap_or(false);

    if is_success {
        json["data"]["url"].as_str()
            .map(|u| u.to_string())
            .ok_or_else(|| "上传成功但未返回图片链接".to_string())
    } else {
        let msg = json["message"].as_str().or(json["msg"].as_str()).unwrap_or("未知错误");
        Err(format!("上传失败: {}", msg))
    }
}

/// 上传到 GitHub (兼容 PicGo github uploader)
async fn upload_to_github(file_path: String, github_config: GithubConfig) -> Result<String, String> {
    use tauri_plugin_http::reqwest;

    let client = reqwest::Client::new();
    let file_content = std::fs::read(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let base64_content = base64::engine::general_purpose::STANDARD.encode(&file_content);

    let path = github_config.path.as_deref().unwrap_or("");
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image.png");

    // 确保路径后有分隔符 /
    let path_with_slash = if path.is_empty() {
        String::new()
    } else if path.ends_with('/') {
        path.to_string()
    } else {
        format!("{}/", path)
    };
    let path_in_repo = format!("{}{}", path_with_slash, file_name);
    let url = format!("https://api.github.com/repos/{}/contents/{}", github_config.repo, path_in_repo);

    let body = serde_json::json!({
        "message": "Upload by PicGo",
        "branch": github_config.branch,
        "content": base64_content
    });

    let response = client.put(&url)
        .header("Authorization", format!("token {}", github_config.token))
        .header("User-Agent", "PicGo")
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&body).map_err(|e| e.to_string())?)
        .send()
        .await
        .map_err(|e| format!("上传请求失败: {}", e))?;

    let status = response.status();

    // 处理 422 (文件已存在) - 与 PicGo 行为一致
    if status.as_u16() == 422 {
        return build_github_url(&github_config, path, file_name);
    }

    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| format!("解析响应失败: {}", e))?;

    if json["content"]["sha"].is_null() {
        return Err(format!("上传失败: {}", response_text));
    }

    // 手动构建预览 URL（与 PicGo github uploader 对齐）
    // 对文件路径部分进行 URL 编码，处理中文和空格等特殊字符
    let file_path_str = format!("{}{}", path_with_slash, file_name);
    let encoded_file_path = urlencoding::encode(&file_path_str);
    
    build_github_url(&github_config, "", &encoded_file_path)
}

fn build_github_url(config: &GithubConfig, path: &str, file_name: &str) -> Result<String, String> {
    if let Some(custom_url) = &config.custom_url {
        if !custom_url.is_empty() {
            // 使用自定义域名（且非空）
            return Ok(format!("{}/{}{}", custom_url.trim_end_matches('/'), path, file_name));
        }
    }
    // 默认 GitHub URL（文件路径已编码）
    Ok(format!("https://raw.githubusercontent.com/{}/{}/{}{}",
        config.repo, config.branch, path, file_name))
}

/// 上传到 Gitee (兼容 PicGo gitee 插件)
async fn upload_to_gitee(file_path: String, gitee_config: GiteeConfig) -> Result<String, String> {
    use tauri_plugin_http::reqwest;

    let client = reqwest::Client::new();
    let file_content = std::fs::read(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let base64_content = base64::engine::general_purpose::STANDARD.encode(&file_content);

    let path = gitee_config.path.as_deref().unwrap_or("");
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image.png");

    let repo_full = match &gitee_config.owner {
        Some(owner) => format!("{}/{}", owner, gitee_config.repo),
        None => gitee_config.repo.clone(),
    };
    let message = gitee_config.message.as_deref().unwrap_or("Upload by PicGo");
    
    // 确保路径后有分隔符 /
    let path_with_slash = if path.is_empty() {
        String::new()
    } else if path.ends_with('/') {
        path.to_string()
    } else {
        format!("{}/", path)
    };
    let path_in_repo = format!("{}{}", path_with_slash, file_name);

    let url = format!("https://gitee.com/api/v5/repos/{}/contents/{}", repo_full, path_in_repo);

    let body = serde_json::json!({
        "access_token": gitee_config.token,
        "content": base64_content,
        "message": message
    });

    let response = client.post(&url)
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&body).map_err(|e| e.to_string())?)
        .send()
        .await
        .map_err(|e| format!("上传请求失败: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;

    if !status.is_success() {
        return Err(format!("上传失败: HTTP {} - {}", status, response_text));
    }

    // 调试日志：输出完整的响应内容（用于排查问题）
    log(&format!("[Gitee Upload] API Response: {}", response_text));

    // 解析 API 响应，确认上传成功
    let json: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}", e))?;

    // 检查是否上传成功（PicGo 方式：手动构建预览 URL）
    if json["content"]["sha"].is_null() {
        return Err(format!("上传失败: {}", response_text));
    }

    log(&format!("[Gitee Upload] repo_full={}, branch={}, path={}, file_name={}", 
        repo_full, gitee_config.branch, path, file_name));
    
    // 手动构建预览 URL（与 PicGo gitee 插件对齐）
    // 对文件路径部分进行 URL 编码，处理中文和空格等特殊字符
    let file_path_str = format!("{}{}", path_with_slash, file_name);
    let encoded_file_path = urlencoding::encode(&file_path_str);
    
    let preview_url = if let Some(custom_url) = &gitee_config.custom_url {
        if !custom_url.is_empty() {
            // 使用自定义域名（且非空）
            let custom_url = format!("{}/{}", custom_url.trim_end_matches('/'), encoded_file_path);
            log(&format!("[Gitee Upload] 使用自定义域名: {}", custom_url));
            custom_url
        } else {
            // 自定义域名为空，使用默认 Gitee URL
            let default_url = format!("https://gitee.com/{}/raw/{}/{}", 
                repo_full, gitee_config.branch, encoded_file_path);
            log(&format!("[Gitee Upload] 自定义域名为空，使用默认 URL"));
            default_url
        }
    } else {
        // 没有配置自定义域名，使用默认 Gitee URL
        let default_url = format!("https://gitee.com/{}/raw/{}/{}", 
            repo_full, gitee_config.branch, encoded_file_path);
        log(&format!("[Gitee Upload] 使用默认 URL: {}", default_url));
        default_url
    };
    
    Ok(preview_url)
}

/// 上传到阿里云 OSS (兼容 PicGo aliyun uploader)
async fn upload_to_aliyun_oss(file_path: String, oss_config: AliyunOssConfig) -> Result<String, String> {
    use hmac::{Hmac, Mac};
    use sha1::Sha1;
    use tauri_plugin_http::reqwest;

    type HmacSha1 = Hmac<Sha1>;

    let file_content = std::fs::read(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image.png");
    let path = oss_config.path.as_deref().unwrap_or("");
    
    // 确保路径后有分隔符 /
    let path_with_slash = if path.is_empty() {
        String::new()
    } else if path.ends_with('/') {
        path.to_string()
    } else {
        format!("{}/", path)
    };
    let path_in_oss = format!("{}{}", path_with_slash, file_name);

    let content_type = mime_guess::from_path(file_name)
        .first_or_octet_stream()
        .to_string();

    let date = chrono_now_utc();
    let host = format!("{}.{}.aliyuncs.com", oss_config.bucket, oss_config.area);
    // PicGo 签名格式: PUT\n\n{mime}\n{date}\n/{bucket}/{path}{filename}
    let sign_string = format!("PUT\n\n{}\n{}\n/{}/{}", content_type, date, oss_config.bucket, path_in_oss);

    let mut mac = HmacSha1::new_from_slice(oss_config.access_key_secret.as_bytes())
        .map_err(|e| format!("HMAC 初始化失败: {}", e))?;
    mac.update(sign_string.as_bytes());
    let signature = base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes());
    let authorization = format!("OSS {}:{}", oss_config.access_key_id, signature);

    let url = format!("https://{}/{}", host, path_in_oss);
    let client = reqwest::Client::new();
    let response = client.put(&url)
        .header("Host", &host)
        .header("Date", &date)
        .header("Authorization", &authorization)
        .header("Content-Type", &content_type)
        .body(file_content)
        .send()
        .await
        .map_err(|e| format!("上传请求失败: {}", e))?;

    let status = response.status();
    if status.as_u16() == 200 {
        // 手动构建预览 URL（与 PicGo aliyun uploader 对齐）
        // 对文件路径部分进行 URL 编码，处理中文和空格等特殊字符
        let encoded_path_in_oss = urlencoding::encode(&path_in_oss);
        let option_url = oss_config.options.as_deref().unwrap_or("");
        
        if let Some(custom_url) = &oss_config.custom_url {
            if !custom_url.is_empty() {
                // 使用自定义域名（且非空）
                return Ok(format!("{}/{}{}", custom_url.trim_end_matches('/'), encoded_path_in_oss, option_url));
            }
        }
        // 默认阿里云 OSS URL
        Ok(format!("https://{}/{}{}", host, encoded_path_in_oss, option_url))
    } else {
        let body = response.text().await.unwrap_or_default();
        Err(format!("上传失败: HTTP {} - {}", status, body))
    }
}
