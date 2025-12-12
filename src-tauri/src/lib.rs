// 导入 Tauri 框架的 Manager trait，用于管理应用程序
use tauri::Manager;
use serde::{Deserialize, Serialize};

// WebView 配置结构体
#[derive(Debug, Serialize, Deserialize)]
struct WebViewConfig {
    #[serde(rename = "projectId")]
    project_id: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    visible: bool,
}

// 简化的窗口管理命令 - 使用现有的 window API 而非 webview API
#[tauri::command]
async fn create_project_window(
    app_handle: tauri::AppHandle,
    config: WebViewConfig,
) -> Result<(), String> {
    let window_label = format!("project_{}", config.project_id);
    let url = format!("myapp://{}/", config.project_id);

    // 检查窗口是否已存在
    if app_handle.get_webview_window(&window_label).is_some() {
        return Ok(()); // 已存在，直接返回
    }

    // 创建新窗口
    let _window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        &window_label,
        tauri::WebviewUrl::External(url.parse().map_err(|e| format!("URL解析失败: {}", e))?),
    )
    .inner_size(config.width, config.height)
    .position(config.x, config.y)
    .resizable(true)
    .visible(config.visible)
    .title(&format!("项目: {}", config.project_id))
    .build()
    .map_err(|e| format!("创建窗口失败: {}", e))?;

    println!("✅ 项目窗口创建成功: {}", config.project_id);
    Ok(())
}

// 显示项目窗口 - 修改参数名为projectId
#[tauri::command]
async fn show_project_window(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    println!("收到显示窗口请求，项目ID: {}", project_id);
    let window_label = format!("project_{}", project_id);

    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.show().map_err(|e| format!("显示窗口失败: {}", e))?;
        window.set_focus().map_err(|e| format!("聚焦窗口失败: {}", e))?;
        println!("🔄 项目窗口显示成功: {}", project_id);
    } else {
        return Err(format!("窗口不存在: {}", project_id));
    }

    Ok(())
}

// 隐藏项目窗口 - 修改参数名为projectId
#[tauri::command]
async fn hide_project_window(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    println!("收到隐藏窗口请求，项目ID: {}", project_id);
    let window_label = format!("project_{}", project_id);

    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.hide().map_err(|e| format!("隐藏窗口失败: {}", e))?;
        println!("🙈 项目窗口隐藏成功: {}", project_id);
    }

    Ok(())
}

// 关闭项目窗口 - 修改参数名为projectId
#[tauri::command]
async fn close_project_window(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let window_label = format!("project_{}", project_id);

    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.close().map_err(|e| format!("关闭窗口失败: {}", e))?;
        println!("🗑️ 项目窗口关闭成功: {}", project_id);
    }

    Ok(())
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

// 简单的命令 - 前端会使用 iframe，这里不需要复杂的窗口管理
// 保留这个命令以防未来需要
#[tauri::command]
fn get_project_url(project_id: String) -> String {
    format!("myapp://{}/", project_id)
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
        // 初始化插件
        .plugin(tauri_plugin_opener::init())
        // 注册 Tauri 命令处理器
        .invoke_handler(tauri::generate_handler![
            greet,
            get_resource_dir,
            get_project_url,
            create_project_window,
            show_project_window,
            hide_project_window,
            close_project_window
        ])
        // 运行 Tauri 应用程序，使用自动生成的上下文
        .run(tauri::generate_context!())
        // 如果运行失败，输出错误信息并终止程序
        .expect("error while running tauri application");
}
