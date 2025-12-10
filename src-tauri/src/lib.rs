use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::thread;
use std::time::Duration;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn start_simple_server(port: u16, dir: PathBuf) {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
        .expect(&format!("Failed to bind to port {}", port));

    println!("静态文件服务器启动: http://127.0.0.1:{} -> {:?}", port, dir);

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let dir_clone = dir.clone();
                thread::spawn(move || {
                    handle_request(stream, dir_clone);
                });
            }
            Err(e) => {
                eprintln!("连接错误: {}", e);
            }
        }
    }
}

fn handle_request(mut stream: TcpStream, base_dir: PathBuf) {
    let mut buffer = [0; 1024];
    if let Ok(_) = stream.read(&mut buffer) {
        let request = String::from_utf8_lossy(&buffer);

        // 解析请求路径
        let mut path = "/index.html";
        if let Some(first_line) = request.lines().next() {
            let parts: Vec<&str> = first_line.split_whitespace().collect();
            if parts.len() > 1 && parts[0] == "GET" {
                path = parts[1];
                if path == "/" {
                    path = "/index.html";
                }
            }
        }

        // 构建文件路径
        let file_path = base_dir.join(path.trim_start_matches('/'));

        // 读取文件并响应
        if let Ok(contents) = fs::read(&file_path) {
            let content_type = get_content_type(&file_path);
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
                content_type,
                contents.len()
            );

            let _ = stream.write_all(response.as_bytes());
            let _ = stream.write_all(&contents);
        } else {
            let response = "HTTP/1.1 404 NOT FOUND\r\n\r\n404 Not Found";
            let _ = stream.write_all(response.as_bytes());
        }

        let _ = stream.flush();
    }
}

fn get_content_type(path: &PathBuf) -> &'static str {
    if let Some(ext) = path.extension() {
        match ext.to_str().unwrap_or("") {
            "html" => "text/html",
            "css" => "text/css",
            "js" => "application/javascript",
            "json" => "application/json",
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "gif" => "image/gif",
            "svg" => "image/svg+xml",
            "ico" => "image/x-icon",
            _ => "text/plain",
        }
    } else {
        "text/plain"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // 在开发模式下使用相对路径，生产模式使用资源目录
            let base_dir = if cfg!(debug_assertions) {
                // 开发模式：从 src-tauri 目录向上找到项目根目录，然后进入 src-tauri/resources
                std::env::current_dir()
                    .unwrap()
                    .parent()  // 从 src-tauri 回到项目根目录
                    .unwrap()
                    .join("src-tauri/resources")
            } else {
                // 生产模式：使用打包后的资源目录
                app_handle.path().resource_dir().unwrap()
            };

            println!("资源目录: {:?}", base_dir);

            // 启动三个静态文件服务器
            let studio_dir = base_dir.join("studio/dist");
            let project2_dir = base_dir.join("project2/dist");
            let project3_dir = base_dir.join("project3/dist");

            // Studio 项目 - 端口 8001
            if studio_dir.exists() {
                let studio_path = studio_dir.clone();
                thread::spawn(move || {
                    start_simple_server(8001, studio_path);
                });
            } else {
                println!("Studio 目录不存在: {:?}", studio_dir);
            }

            // Project2 - 端口 8002
            if project2_dir.exists() {
                let project2_path = project2_dir.clone();
                thread::spawn(move || {
                    start_simple_server(8002, project2_path);
                });
            } else {
                println!("Project2 目录不存在: {:?}", project2_dir);
            }

            // Project3 - 端口 8003
            if project3_dir.exists() {
                let project3_path = project3_dir.clone();
                thread::spawn(move || {
                    start_simple_server(8003, project3_path);
                });
            } else {
                println!("Project3 目录不存在: {:?}", project3_dir);
            }

            // 等待服务器启动
            thread::sleep(Duration::from_millis(500));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
