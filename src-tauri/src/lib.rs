// 导入标准库中的文件系统操作模块，用于读取文件
use std::fs;
// 导入标准库中的输入输出模块，包含 Read 和 Write trait，用于读写数据流
use std::io::{Read, Write};
// 导入标准库中的网络模块，TcpListener 用于监听连接，TcpStream 用于处理连接
use std::net::{TcpListener, TcpStream};
// 导入标准库中的路径模块，PathBuf 用于处理文件路径
use std::path::PathBuf;
// 导入标准库中的线程模块，用于创建新线程
use std::thread;
// 导入标准库中的时间模块，Duration 用于表示时间间隔
use std::time::Duration;
// 导入 Tauri 框架的 Manager trait，用于管理应用程序
use tauri::Manager;

// 了解更多关于 Tauri 命令的信息，请访问 https://tauri.app/develop/calling-rust/
// 这是一个 Tauri 命令的宏，标记这个函数可以被前端 JavaScript 调用
#[tauri::command]
// 定义一个问候函数，接收一个字符串引用作为名字参数，返回一个字符串
fn greet(name: &str) -> String {
    // 使用 format! 宏格式化字符串，将名字插入到问候语中
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 定义一个启动简单 HTTP 服务器的函数，接收端口号和目录路径作为参数
fn start_simple_server(port: u16, dir: PathBuf) {
    // 创建一个 TCP 监听器，绑定到本地地址 127.0.0.1 和指定端口
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
        // 如果绑定失败，使用 expect 输出错误信息并终止程序
        .expect(&format!("Failed to bind to port {}", port));

    // 打印服务器启动信息，显示服务器地址和服务的目录
    println!("静态文件服务器启动: http://127.0.0.1:{} -> {:?}", port, dir);

    // 循环监听传入的连接请求
    for stream in listener.incoming() {
        // 使用 match 匹配连接结果
        match stream {
            // 如果连接成功
            Ok(stream) => {
                // 克隆目录路径，因为要在新线程中使用
                let dir_clone = dir.clone();
                // 创建一个新线程来处理这个连接
                thread::spawn(move || {
                    // 在新线程中调用处理请求的函数
                    handle_request(stream, dir_clone);
                });
            }
            // 如果连接失败
            Err(e) => {
                // 打印连接错误信息到标准错误输出
                eprintln!("连接错误: {}", e);
            }
        }
    }
}

// 定义一个处理 HTTP 请求的函数，接收 TCP 流和基础目录路径
fn handle_request(mut stream: TcpStream, base_dir: PathBuf) {
    // 创建一个 1024 字节的缓冲区，用于读取请求数据
    let mut buffer = [0; 1024];
    // 尝试从流中读取数据到缓冲区
    if let Ok(_) = stream.read(&mut buffer) {
        // 将缓冲区中的字节转换为字符串，使用 from_utf8_lossy 处理可能的无效 UTF-8 字符
        let request = String::from_utf8_lossy(&buffer);

        // 解析请求路径
        // 默认路径设置为 /index.html
        let mut path = "/index.html";
        // 获取请求的第一行（HTTP 请求行）
        if let Some(first_line) = request.lines().next() {
            // 将第一行按空白字符分割成多个部分
            let parts: Vec<&str> = first_line.split_whitespace().collect();
            // 检查是否是 GET 请求，并且有足够的参数
            if parts.len() > 1 && parts[0] == "GET" {
                // 获取请求的路径（parts[1] 是 URL 路径）
                path = parts[1];
                // 如果路径是根路径，则默认返回 index.html
                if path == "/" {
                    path = "/index.html";
                }
            }
        }

        // 构建文件路径
        // 将请求路径去掉开头的斜杠，然后与基础目录拼接
        let file_path = base_dir.join(path.trim_start_matches('/'));

        // 读取文件并响应
        // 尝试读取文件内容
        if let Ok(contents) = fs::read(&file_path) {
            // 根据文件扩展名获取对应的 Content-Type
            let content_type = get_content_type(&file_path);
            // 构建 HTTP 响应头，包含状态码、内容类型、内容长度和跨域允许头
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
                content_type,
                contents.len()
            );

            // 将响应头写入 TCP 流
            let _ = stream.write_all(response.as_bytes());
            // 将文件内容写入 TCP 流
            let _ = stream.write_all(&contents);
        } else {
            // 如果文件读取失败，返回 404 错误响应
            let response = "HTTP/1.1 404 NOT FOUND\r\n\r\n404 Not Found";
            // 将 404 响应写入 TCP 流
            let _ = stream.write_all(response.as_bytes());
        }

        // 刷新流，确保所有数据都被发送
        let _ = stream.flush();
    }
}

// 定义一个根据文件路径获取 Content-Type 的函数，返回静态字符串引用
fn get_content_type(path: &PathBuf) -> &'static str {
    // 尝试获取文件扩展名
    if let Some(ext) = path.extension() {
        // 根据文件扩展名匹配对应的 MIME 类型
        match ext.to_str().unwrap_or("") {
            // HTML 文件
            "html" => "text/html",
            // CSS 样式文件
            "css" => "text/css",
            // JavaScript 脚本文件
            "js" => "application/javascript",
            // JSON 数据文件
            "json" => "application/json",
            // PNG 图片文件
            "png" => "image/png",
            // JPEG 图片文件（支持 jpg 和 jpeg 两种扩展名）
            "jpg" | "jpeg" => "image/jpeg",
            // GIF 动图文件
            "gif" => "image/gif",
            // SVG 矢量图文件
            "svg" => "image/svg+xml",
            // ICO 图标文件
            "ico" => "image/x-icon",
            // 其他未知类型的文件，默认返回纯文本类型
            _ => "text/plain",
        }
    } else {
        // 如果没有扩展名，默认返回纯文本类型
        "text/plain"
    }
}

// 这是一个条件编译属性，如果是移动平台，则使用移动端入口点
#[cfg_attr(mobile, tauri::mobile_entry_point)]
// 定义 Tauri 应用程序的主运行函数，这是程序的入口点
pub fn run() {
    // 使用默认配置创建 Tauri 应用构建器
    tauri::Builder::default()
        // 初始化 opener 插件，用于打开外部链接
        .plugin(tauri_plugin_opener::init())
        // 设置应用程序初始化逻辑
        .setup(|app| {
            // 克隆应用程序句柄，用于后续操作
            let app_handle = app.handle().clone();

            // 在开发模式下使用相对路径，生产模式使用资源目录
            // 根据编译模式选择资源目录路径
            let base_dir = if cfg!(debug_assertions) {
                // 开发模式：从 src-tauri 目录向上找到项目根目录，然后进入 src-tauri/resources
                // 获取当前工作目录（通常是 src-tauri 目录）
                std::env::current_dir()
                    // 如果获取失败则终止程序
                    .unwrap()
                    // 获取父目录（项目根目录）
                    .parent()  // 从 src-tauri 回到项目根目录
                    // 如果获取失败则终止程序
                    .unwrap()
                    // 拼接资源目录路径
                    .join("src-tauri/resources")
            } else {
                // 生产模式：使用打包后的资源目录
                // 获取应用程序的资源目录路径
                app_handle.path().resource_dir().unwrap()
            };

            // 打印资源目录路径，方便调试
            println!("资源目录: {:?}", base_dir);

            // 启动三个静态文件服务器
            // 构建 Studio 项目的目录路径
            let studio_dir = base_dir.join("studio/dist");
            // 构建 Project2 项目的目录路径
            let project2_dir = base_dir.join("project2/dist");
            // 构建 Project3 项目的目录路径
            let project3_dir = base_dir.join("project3/dist");

            // Studio 项目 - 端口 8001
            // 检查 Studio 目录是否存在
            if studio_dir.exists() {
                // 克隆目录路径，因为要在新线程中使用
                let studio_path = studio_dir.clone();
                // 创建新线程启动 Studio 项目的服务器
                thread::spawn(move || {
                    // 在端口 8001 上启动服务器
                    start_simple_server(8001, studio_path);
                });
            } else {
                // 如果目录不存在，打印警告信息
                println!("Studio 目录不存在: {:?}", studio_dir);
            }

            // Project2 - 端口 8002
            // 检查 Project2 目录是否存在
            if project2_dir.exists() {
                // 克隆目录路径，因为要在新线程中使用
                let project2_path = project2_dir.clone();
                // 创建新线程启动 Project2 的服务器
                thread::spawn(move || {
                    // 在端口 8002 上启动服务器
                    start_simple_server(8002, project2_path);
                });
            } else {
                // 如果目录不存在，打印警告信息
                println!("Project2 目录不存在: {:?}", project2_dir);
            }

            // Project3 - 端口 8003
            // 检查 Project3 目录是否存在
            if project3_dir.exists() {
                // 克隆目录路径，因为要在新线程中使用
                let project3_path = project3_dir.clone();
                // 创建新线程启动 Project3 的服务器
                thread::spawn(move || {
                    // 在端口 8003 上启动服务器
                    start_simple_server(8003, project3_path);
                });
            } else {
                // 如果目录不存在，打印警告信息
                println!("Project3 目录不存在: {:?}", project3_dir);
            }

            // 等待服务器启动
            // 让当前线程休眠 500 毫秒，给服务器启动时间
            thread::sleep(Duration::from_millis(500));

            // 返回 Ok 表示初始化成功
            Ok(())
        })
        // 注册 Tauri 命令处理器，将 greet 函数注册为可调用的命令
        .invoke_handler(tauri::generate_handler![greet])
        // 运行 Tauri 应用程序，使用自动生成的上下文
        .run(tauri::generate_context!())
        // 如果运行失败，输出错误信息并终止程序
        .expect("error while running tauri application");
}
