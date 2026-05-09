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

/// setup 阶段：将日志路径切换到正式的 app_data_dir
fn switch_log_to_app_data(app_handle: &tauri::AppHandle) {
    let Ok(dir) = app_handle.path().app_data_dir() else { return };
    let _ = std::fs::create_dir_all(&dir);
    let new_path = dir.join("app.log");

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

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(CurrentDir(Mutex::new(None)))
        .manage(OpenedFile(Mutex::new(opened_file)))
        .invoke_handler(tauri::generate_handler![set_current_dir, take_opened_file, log_message, open_log_folder])
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
