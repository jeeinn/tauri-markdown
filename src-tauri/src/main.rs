#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::http::{header::CONTENT_TYPE, Request, Response};
use tauri::{Manager, State, UriSchemeContext};

/// 当前打开的 md 文件所在目录，由 JS 端在打开/切换文件时更新
struct CurrentDir(Mutex<Option<PathBuf>>);

/// JS 端调用，设置当前 md 文件所在目录
#[tauri::command]
fn set_current_dir(dir: String, state: State<'_, CurrentDir>) {
    *state.0.lock().unwrap() = Some(PathBuf::from(&dir));
}

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
    let ext = PathBuf::from(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "avif" => "image/avif",
        _ => "application/octet-stream",
    }
    .to_string()
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
            return Response::builder()
                .status(400)
                .header(CONTENT_TYPE, "text/plain")
                .body(b"No current file directory set".to_vec())
                .unwrap();
        }
    };

    let full_path = base.join(&relative_path);

    let canonical = match std::fs::canonicalize(&full_path) {
        Ok(p) => p,
        Err(_) => {
            return Response::builder()
                .status(404)
                .header(CONTENT_TYPE, "text/plain")
                .body(format!("File not found: {}", relative_path).into_bytes())
                .unwrap();
        }
    };

    let content = match std::fs::read(&canonical) {
        Ok(c) => c,
        Err(_) => {
            return Response::builder()
                .status(500)
                .header(CONTENT_TYPE, "text/plain")
                .body(b"Failed to read file".to_vec())
                .unwrap();
        }
    };

    let mime = guess_mime(&relative_path);

    Response::builder()
        .status(200)
        .header(CONTENT_TYPE, mime)
        .body(content)
        .unwrap()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(CurrentDir(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![set_current_dir])
        .register_uri_scheme_protocol("tmd", tmd_protocol_handler)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
