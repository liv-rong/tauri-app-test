// 导入 Tauri 框架的 Manager trait，用于管理应用程序
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use serde::{Deserialize, Serialize};

// 窗口配置结构体，用于接收前端传递的窗口配置参数
#[derive(Debug, Serialize, Deserialize)]
struct WindowConfig {
    width: Option<f64>,
    height: Option<f64>,
    resizable: Option<bool>,
    fullscreen: Option<bool>,
}

// 了解更多关于 Tauri 命令的信息，请访问 https://tauri.app/develop/calling-rust/
// 这是一个 Tauri 命令的宏，标记这个函数可以被前端 JavaScript 调用
#[tauri::command]
// 定义一个问候函数，接收一个字符串引用作为名字参数，返回一个字符串
fn greet(name: &str) -> String {
    // 使用 format! 宏格式化字符串，将名字插入到问候语中
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 定义一个获取资源目录路径的命令，返回资源目录的字符串路径
// 这个函数用于前端获取资源目录路径，以便使用 asset:// 协议加载本地文件
#[tauri::command]
// 接收应用程序句柄，返回资源目录路径的字符串
fn get_resource_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    // 尝试获取资源目录路径
    match app_handle.path().resource_dir() {
        // 如果成功获取路径
        Ok(path) => {
            // 将路径转换为字符串，如果失败则返回错误
            path.to_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "无法将路径转换为字符串".to_string())
        }
        // 如果获取失败，返回错误信息
        Err(e) => Err(format!("获取资源目录失败: {}", e)),
    }
}

// 打开项目的命令，创建新窗口并加载对应项目的 dist 文件
// 使用自定义协议 myapp:// 加载本地资源文件
#[tauri::command]
fn open_project(
    app_handle: tauri::AppHandle,
    project_name: String,
    window_config: Option<WindowConfig>,
) -> Result<(), String> {
    // 构建使用自定义协议的 URL，只使用项目名作为路径
    // 协议处理器会自动添加 dist/index.html
    // 这样 URL 会是 myapp://studio/ 而不是 myapp://studio/dist/index.html
    // 这对于客户端路由（如 Expo Router）很重要
    let custom_url = format!("myapp://{}/", project_name);
    println!("🚀 正在打开项目: {}", project_name);
    println!("🔗 使用自定义协议 URL: {}", custom_url);

    // 生成唯一的窗口标签，避免重复窗口
    let window_label = format!("project-{}", project_name);
    println!("🏷️  窗口标签: {}", window_label);

    // 检查窗口是否已经存在
    if let Some(existing_window) = app_handle.get_webview_window(&window_label) {
        // 如果窗口已存在，聚焦并显示该窗口
        println!("♻️  窗口已存在，聚焦窗口: {}", window_label);
        existing_window
            .set_focus()
            .map_err(|e| format!("聚焦窗口失败: {}", e))?;
        return Ok(());
    }

    // 获取窗口配置，如果没有传递则使用默认值
    let config = window_config.unwrap_or(WindowConfig {
        width: Some(1200.0),
        height: Some(800.0),
        resizable: Some(true),
        fullscreen: Some(false),
    });
    println!("⚙️  窗口配置: {:?}", config);

    // 创建新窗口，使用自定义协议 myapp:// 加载本地文件
    let mut builder = WebviewWindowBuilder::new(
        &app_handle,
        window_label.clone(),
        WebviewUrl::External(custom_url.parse().unwrap())
    )
        .title(format!("项目 - {}", project_name))
        .min_inner_size(800.0, 600.0);

    // 应用窗口配置
    if let Some(width) = config.width {
        if let Some(height) = config.height {
            builder = builder.inner_size(width, height);
        }
    }

    if let Some(resizable) = config.resizable {
        builder = builder.resizable(resizable);
    }

    if let Some(fullscreen) = config.fullscreen {
        if fullscreen {
            builder = builder.fullscreen(true);
        }
    }

    // 构建并显示窗口
    println!("🔨 开始构建窗口...");
    match builder.build() {
        Ok(_) => {
            println!("✅ 窗口创建成功: {}", window_label);
            println!("🎉 窗口将加载: {}", custom_url);
            Ok(())
        }
        Err(e) => {
            println!("❌ 窗口创建失败: {}", e);
            Err(format!("打开窗口失败: {}", e))
        }
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
        // 注册自定义协议 "myapp"
        .register_uri_scheme_protocol("myapp", |app_handle, request| {
            // 获取请求的 URL
            let uri = request.uri().to_string();
            println!("🔗 收到自定义协议请求: {}", uri);

            // 解析 URL，移除 "myapp://" 前缀
            let path = uri.strip_prefix("myapp://").unwrap_or(&uri);
            println!("📂 解析后的路径: {}", path);

            // 去掉查询参数和 hash
            let path = path.split('?').next().unwrap_or(path);
            let path = path.split('#').next().unwrap_or(path);

            // 处理路径开头的 "./" 或 "/"
            let path = path.trim_start_matches("./").trim_start_matches('/');

            // 如果路径为空或以 "/" 结尾，默认加载 index.html
            let path = if path.is_empty() || path.ends_with('/') {
                format!("{}index.html", path)
            } else {
                path.to_string()
            };

            println!("🎯 最终路径: {}", path);

            // 获取资源目录路径
            let resource_dir = if cfg!(debug_assertions) {
                // 开发模式：使用项目目录下的 resources
                std::env::current_dir()
                    .unwrap()
                    .join("resources")
            } else {
                // 生产模式：使用打包后的资源目录
                app_handle.app_handle().path().resource_dir()
                    .expect("无法获取资源目录")
            };

            // 拼接完整的文件路径
            let file_path = resource_dir.join(&path);
            println!("📁 完整文件路径: {:?}", file_path);

            // 检查文件是否存在
            if !file_path.exists() {
                println!("❌ 文件不存在: {:?}", file_path);
                return tauri::http::Response::builder()
                    .status(404)
                    .body(format!("文件不存在: {}", path).into_bytes())
                    .unwrap();
            }

            // 读取文件内容
            match std::fs::read(&file_path) {
                Ok(content) => {
                    println!("✅ 文件读取成功，大小: {} bytes", content.len());

                    // 根据文件扩展名设置 Content-Type
                    let mime_type = match file_path.extension().and_then(|s| s.to_str()) {
                        Some("html") => "text/html",
                        Some("css") => "text/css",
                        Some("js") => "application/javascript",
                        Some("json") => "application/json",
                        Some("png") => "image/png",
                        Some("jpg") | Some("jpeg") => "image/jpeg",
                        Some("svg") => "image/svg+xml",
                        Some("woff") | Some("woff2") => "font/woff2",
                        Some("ttf") => "font/ttf",
                        _ => "application/octet-stream",
                    };

                    println!("📝 Content-Type: {}", mime_type);

                    tauri::http::Response::builder()
                        .status(200)
                        .header("Content-Type", mime_type)
                        .body(content)
                        .unwrap()
                }
                Err(e) => {
                    println!("❌ 文件读取失败: {}", e);
                    tauri::http::Response::builder()
                        .status(500)
                        .body(format!("读取文件失败: {}", e).into_bytes())
                        .unwrap()
                }
            }
        })
        // 设置应用程序初始化逻辑
        .setup(|app| {
            // 获取应用程序句柄，用于后续操作
            let app_handle = app.handle().clone();

            // 在开发模式下打印资源目录路径，方便调试
            if cfg!(debug_assertions) {
                let dev_resource_dir = std::env::current_dir()
                    .unwrap()
                    .join("resources");
                println!("🔧 开发模式资源目录: {:?}", dev_resource_dir);
            } else {
                if let Ok(resource_dir) = app_handle.path().resource_dir() {
                    println!("📦 生产模式资源目录: {:?}", resource_dir);
                }
            }

            Ok(())
        })
        // 注册 Tauri 命令处理器，将 greet、get_resource_dir 和 open_project 函数注册为可调用的命令
        .invoke_handler(tauri::generate_handler![greet, get_resource_dir, open_project])
        // 运行 Tauri 应用程序，使用自动生成的上下文
        .run(tauri::generate_context!())
        // 如果运行失败，输出错误信息并终止程序
        .expect("error while running tauri application");
}
