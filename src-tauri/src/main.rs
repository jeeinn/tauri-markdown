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
        .manage(CurrentDir(Mutex::new(None)))
        .manage(OpenedFile(Mutex::new(opened_file)))
        .invoke_handler(tauri::generate_handler![
            set_current_dir,
            take_opened_file,
            log_message,
            open_log_folder,
            save_image_host_config,
            get_image_host_config,
            test_image_host_connection,
            upload_to_image_host
        ])
        .manage(PortableMode(is_portable))
        .invoke_handler(tauri::generate_handler![set_current_dir, take_opened_file, log_message, open_log_folder, get_portable_mode, get_store_path, open_devtools])
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

/// SM.MS 图床配置
#[derive(Serialize, Deserialize, Clone, Debug)]
struct SmmsConfig {
    token: String,
    #[serde(default)]
    backup_domain: Option<String>,
}

/// GitHub 图床配置
#[derive(Serialize, Deserialize, Clone, Debug)]
struct GithubConfig {
    repo: String,
    #[serde(default = "default_main_branch")]
    branch: String,
    token: String,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    custom_domain: Option<String>,
}

fn default_main_branch() -> String {
    "main".to_string()
}

/// Gitee 图床配置
#[derive(Serialize, Deserialize, Clone, Debug)]
struct GiteeConfig {
    repo: String,
    #[serde(default = "default_master_branch")]
    branch: String,
    token: String,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    custom_domain: Option<String>,
}

fn default_master_branch() -> String {
    "master".to_string()
}

/// 阿里云 OSS 图床配置
#[derive(Serialize, Deserialize, Clone, Debug)]
struct AliyunOssConfig {
    access_key_id: String,
    access_key_secret: String,
    bucket: String,
    #[serde(default = "default_area")]
    area: String,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    options: Option<String>,
}

fn default_area() -> String {
    "z0".to_string()
}

/// 图床总配置
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

/// 保存图床配置
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

/// 从 Tauri Store 保存配置
async fn save_to_tauri_store(app_handle: &tauri::AppHandle, config: &ImageHostConfig) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app_handle.store("store.json").map_err(|e| e.to_string())?;
    store.set("image_host_config", serde_json::to_value(config).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;

    log("图床配置已保存到 Tauri Store");
    Ok(())
}

/// 保存到 PicGo 原生配置文件
async fn save_to_picgo_config(config: &ImageHostConfig) -> Result<(), String> {
    let picgo_config = convert_to_picgo_format(config);
    let config_path = get_picgo_config_path()?;

    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    let json = serde_json::to_string_pretty(&picgo_config).map_err(|e| e.to_string())?;
    std::fs::write(&config_path, json).map_err(|e| format!("写入文件失败: {}", e))?;

    log(&format!("图床配置已保存到 PicGo 配置: {:?}", config_path));
    Ok(())
}

/// 转换为 PicGo 格式
fn convert_to_picgo_format(config: &ImageHostConfig) -> serde_json::Value {
    let mut picgo_bed = serde_json::Map::new();
    picgo_bed.insert("current".to_string(), serde_json::Value::String(config.current.clone()));
    picgo_bed.insert("uploader".to_string(), serde_json::Value::String(config.current.clone()));

    // 添加各图床配置
    if let Some(smms) = &config.smms {
        let mut sm = serde_json::Map::new();
        sm.insert("token".to_string(), serde_json::Value::String(smms.token.clone()));
        if let Some(domain) = &smms.backup_domain {
            sm.insert("backupDomain".to_string(), serde_json::Value::String(domain.clone()));
        }
        picgo_bed.insert("smms".to_string(), serde_json::Value::Object(sm));
    }

    if let Some(github) = &config.github {
        let mut gh = serde_json::Map::new();
        gh.insert("repo".to_string(), serde_json::Value::String(github.repo.clone()));
        gh.insert("branch".to_string(), serde_json::Value::String(github.branch.clone()));
        gh.insert("token".to_string(), serde_json::Value::String(github.token.clone()));
        if let Some(path) = &github.path {
            gh.insert("path".to_string(), serde_json::Value::String(path.clone()));
        }
        if let Some(domain) = &github.custom_domain {
            gh.insert("customUrl".to_string(), serde_json::Value::String(domain.clone()));
        }
        picgo_bed.insert("github".to_string(), serde_json::Value::Object(gh));
    }

    // Gitee 和 Aliyun OSS 类似处理...

    let mut root = serde_json::Map::new();
    root.insert("picBed".to_string(), serde_json::Value::Object(picgo_bed));

    serde_json::Value::Object(root)
}

/// 获取 PicGo 配置文件路径
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

/// 获取图床配置
#[tauri::command]
async fn get_image_host_config(app_handle: tauri::AppHandle) -> Result<Option<ImageHostConfig>, String> {
    log("get_image_host_config called");

    // 优先从 Tauri Store 读取
    if let Ok(config) = load_from_tauri_store(&app_handle).await {
        log("从 Tauri Store 加载配置成功");
        return Ok(Some(config));
    }

    // 尝试从 PicGo 原生配置读取
    if let Ok(config) = load_from_picgo_config().await {
        log("从 PicGo 配置加载成功");
        return Ok(Some(config));
    }

    log("未找到图床配置");
    Ok(None)
}

/// 从 Tauri Store 加载配置
async fn load_from_tauri_store(app_handle: &tauri::AppHandle) -> Result<ImageHostConfig, String> {
    use tauri_plugin_store::StoreExt;

    let store = app_handle.store("store.json").map_err(|e| e.to_string())?;
    let value = store.get("image_host_config").ok_or("配置不存在")?;
    let config: ImageHostConfig = serde_json::from_value(value).map_err(|e| e.to_string())?;
    Ok(config)
}

/// 从 PicGo 原生配置加载
async fn load_from_picgo_config() -> Result<ImageHostConfig, String> {
    let config_path = get_picgo_config_path()?;
    let content = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let picgo_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // 转换 PicGo 格式为我们的格式
    convert_from_picgo_format(&picgo_data)
}

/// 从 PicGo 格式转换
fn convert_from_picgo_format(picgo_data: &serde_json::Value) -> Result<ImageHostConfig, String> {
    let pic_bed = picgo_data.get("picBed").ok_or("无效的 PicGo 配置")?;

    let current = pic_bed.get("current")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let config = ImageHostConfig {
        enabled: true,
        current,
        ..Default::default()
    };

    // 解析各图床配置...
    // 这里简化处理,实际需要根据具体图床类型解析

    Ok(config)
}

/// 测试图床连接
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

/// 测试 SM.MS 连接
async fn test_smms_connection(smms_config: SmmsConfig) -> Result<serde_json::Value, String> {
    let client = tauri_plugin_http::reqwest::Client::new();

    let response = client.get("https://sm.ms/api/v2/profile")
        .header("Authorization", smms_config.token)
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
        .header("User-Agent", "TauriMarkdown")
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

    let url = format!("https://gitee.com/api/v5/repos/{}/branches/{}", gitee_config.repo, gitee_config.branch);

    let response = client.get(&url)
        .query(&[("access_token", &gitee_config.token)])
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

/// 测试阿里云 OSS 连接
async fn test_aliyun_oss_connection(oss_config: AliyunOssConfig) -> Result<serde_json::Value, String> {
    // 简化测试:只验证配置格式
    if oss_config.access_key_id.is_empty() || oss_config.access_key_secret.is_empty() || oss_config.bucket.is_empty() {
        return Err("配置不完整".to_string());
    }

    Ok(serde_json::json!({ "success": true, "message": "配置格式正确" }))
}

/// 上传图片到图床
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

/// 上传到 SM.MS
async fn upload_to_smms(file_path: String, smms_config: SmmsConfig) -> Result<String, String> {
    // 注意: tauri-plugin-http 的 reqwest 不支持 multipart
    // 这里返回错误,提示用户暂时不支持 SM.MS
    Err("SM.MS 上传需要 multipart 支持,当前版本暂不支持。请使用 GitHub 或 Gitee 图床。".to_string())
}

/// 上传到 GitHub
async fn upload_to_github(file_path: String, github_config: GithubConfig) -> Result<String, String> {
    use tauri_plugin_http::reqwest;

    let client = reqwest::Client::new();
    let file_content = std::fs::read(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let base64_content = base64::engine::general_purpose::STANDARD.encode(&file_content);

    let path = github_config.path.unwrap_or_else(|| "images".to_string());
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image.png");

    let file_path_in_repo = format!("{}/{}", path.trim_end_matches('/'), file_name);

    let url = format!("https://api.github.com/repos/{}/contents/{}", github_config.repo, file_path_in_repo);

    let body = serde_json::json!({
        "message": "Upload image via Tauri Markdown",
        "content": base64_content,
        "branch": github_config.branch
    });

    let response = client.put(&url)
        .header("Authorization", format!("token {}", github_config.token))
        .header("User-Agent", "TauriMarkdown")
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&body).map_err(|e| e.to_string())?)
        .send()
        .await
        .map_err(|e| format!("上传请求失败: {}", e))?;

    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| format!("解析响应失败: {}", e))?;

    let mut download_url = json["content"]["download_url"].as_str()
        .ok_or("响应中缺少下载 URL")?
        .to_string();

    // 如果使用自定义域名,替换 URL
    if let Some(custom_domain) = github_config.custom_domain {
        if let Some(raw_part) = download_url.split("raw.githubusercontent.com/").nth(1) {
            download_url = format!("{}/{}", custom_domain.trim_end_matches('/'), raw_part);
        }
    }

    Ok(download_url)
}

/// 上传到 Gitee
async fn upload_to_gitee(file_path: String, gitee_config: GiteeConfig) -> Result<String, String> {
    use tauri_plugin_http::reqwest;

    let client = reqwest::Client::new();
    let file_content = std::fs::read(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let base64_content = base64::engine::general_purpose::STANDARD.encode(&file_content);

    let path = gitee_config.path.unwrap_or_else(|| "images".to_string());
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image.png");

    let file_path_in_repo = format!("{}/{}", path.trim_end_matches('/'), file_name);

    let url = format!("https://gitee.com/api/v5/repos/{}/contents/{}", gitee_config.repo, file_path_in_repo);

    let body = serde_json::json!({
        "access_token": gitee_config.token,
        "content": base64_content,
        "message": "Upload image via Tauri Markdown",
        "branch": gitee_config.branch
    });

    let response = client.post(&url)
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&body).map_err(|e| e.to_string())?)
        .send()
        .await
        .map_err(|e| format!("上传请求失败: {}", e))?;

    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| format!("解析响应失败: {}", e))?;

    let mut download_url = json["content"]["download_url"].as_str()
        .ok_or("响应中缺少下载 URL")?
        .to_string();

    // 如果使用自定义域名,替换 URL
    if let Some(custom_domain) = gitee_config.custom_domain {
        download_url = format!("{}/{}", custom_domain.trim_end_matches('/'),
            download_url.split("gitee.com/").nth(1).unwrap_or(""));
    }

    Ok(download_url)
}

/// 上传到阿里云 OSS
async fn upload_to_aliyun_oss(file_path: String, oss_config: AliyunOssConfig) -> Result<String, String> {
    // 阿里云 OSS 上传需要签名,这里简化处理
    // 实际项目中需要使用 hmac-sha1 进行签名
    Err("阿里云 OSS 上传功能待实现".to_string())
}
