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
