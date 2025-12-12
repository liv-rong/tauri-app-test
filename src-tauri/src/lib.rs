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

// 创建子 WebView 并销毁其他所有子 WebView
#[tauri::command]
async fn create_child_webview(
    app_handle: tauri::AppHandle,
    config: WebViewConfig,
) -> Result<(), String> {
    let webview_label = format!("child_{}", config.project_id);
    let url = format!("myapp://{}/", config.project_id);

    // 获取主窗口 (作为 Window 类型,不是 WebviewWindow)
    let main_window = app_handle
        .get_window("main")
        .ok_or("主窗口不存在")?;

    // 先销毁所有其他的子 WebView
    println!("🗑️ 销毁所有其他子 WebView...");
    let webviews_to_remove: Vec<String> = main_window
        .webviews()
        .into_iter()
        .filter_map(|webview| {
            let label = webview.label();
            if label.starts_with("child_") && label != webview_label.as_str() {
                Some(label.to_string())
            } else {
                None
            }
        })
        .collect();

    // 销毁收集到的 WebView
    for label in &webviews_to_remove {
        if let Some(window) = app_handle.get_webview_window(label) {
            if let Err(e) = window.close() {
                println!("⚠️ 销毁 WebView 失败 {}: {}", label, e);
            } else {
                println!("✅ 已销毁 WebView: {}", label);
            }
        }
    }

    // 检查目标 WebView 是否已存在
    if main_window.get_webview(&webview_label).is_some() {
        println!("ℹ️ 目标 WebView 已存在: {}", config.project_id);
        return Ok(()); // 已存在，直接返回
    }

    // 创建新的子 WebView
    let webview_builder = tauri::webview::WebviewBuilder::new(
        &webview_label,
        tauri::WebviewUrl::External(url.parse().map_err(|e| format!("URL解析失败: {}", e))?)
    );

    // 将 WebView 作为子视图添加到主窗口
    main_window
        .add_child(
            webview_builder,
            tauri::LogicalPosition::new(config.x, config.y),
            tauri::LogicalSize::new(config.width, config.height),
        )
        .map_err(|e| format!("创建子 WebView 失败: {}", e))?;

    println!("✅ 子 WebView 创建成功: {}", config.project_id);
    Ok(())
}

// 显示子 WebView - 隐藏其他，显示目标
#[tauri::command]
async fn show_child_webview(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    println!("🔄 切换显示子 WebView，项目ID: {}", project_id);
    let target_label = format!("child_{}", project_id);

    // 获取主窗口 (作为 Window 类型)
    let main_window = app_handle
        .get_window("main")
        .ok_or("主窗口不存在")?;

    // 遍历所有 WebView
    for webview in main_window.webviews() {
        let label = webview.label();
        if label.starts_with("child_") {
            if label == target_label {
                // 显示目标 WebView - 使用 display:block
                let show_script = r#"
                    document.documentElement.style.display = 'block';
                    document.body.style.display = 'block';
                "#;
                if let Err(e) = webview.eval(show_script) {
                    println!("⚠️ 显示子 WebView 失败 {}: {}", label, e);
                } else {
                    println!("✅ 显示子 WebView: {}", label);
                }
            } else {
                // 隐藏其他 WebView - 使用 display:none
                let hide_script = r#"
                    document.documentElement.style.display = 'none';
                    document.body.style.display = 'none';
                "#;
                if let Err(e) = webview.eval(hide_script) {
                    println!("⚠️ 隐藏子 WebView 失败 {}: {}", label, e);
                } else {
                    println!("🙈 隐藏子 WebView: {}", label);
                }
            }
        }
    }

    println!("✅ 子 WebView 切换成功: {}", project_id);
    Ok(())
}

// 隐藏子 WebView
#[tauri::command]
async fn hide_child_webview(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let webview_label = format!("child_{}", project_id);

    // 获取主窗口 (作为 Window 类型)
    let main_window = app_handle
        .get_window("main")
        .ok_or("主窗口不存在")?;

    if let Some(webview) = main_window.get_webview(&webview_label) {
        webview.eval("document.documentElement.style.visibility = 'hidden'; document.documentElement.style.zIndex = '-1';")
            .map_err(|e| format!("隐藏子 WebView 失败: {}", e))?;
        println!("🙈 子 WebView 隐藏成功: {}", project_id);
    }

    Ok(())
}

// 同步所有子 WebView 的位置和大小（当主窗口移动或调整大小时调用）
#[tauri::command]
async fn sync_child_webviews_position(
    app_handle: tauri::AppHandle,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    println!("📏 同步子 WebView 位置和大小: x={}, y={}, w={}, h={}", x, y, width, height);

    // 获取主窗口
    let main_window = app_handle
        .get_window("main")
        .ok_or("主窗口不存在")?;

    // 更新所有子 WebView 的位置和大小
    for webview in main_window.webviews() {
        let label = webview.label();
        if label.starts_with("child_") {
            // 先设置位置
            if let Err(e) = webview.set_position(tauri::LogicalPosition::new(x, y)) {
                println!("⚠️ 更新子 WebView 位置失败 {}: {}", label, e);
            }
            // 再设置大小
            if let Err(e) = webview.set_size(tauri::LogicalSize::new(width, height)) {
                println!("⚠️ 更新子 WebView 大小失败 {}: {}", label, e);
            } else {
                println!("✅ 更新子 WebView 位置和大小成功: {}", label);
            }
        }
    }

    Ok(())
}

// 关闭子 WebView（用于清理）
#[tauri::command]
async fn close_project_window(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let webview_label = format!("child_{}", project_id);

    // 获取主窗口 (作为 Window 类型)
    let main_window = app_handle
        .get_window("main")
        .ok_or("主窗口不存在")?;

    if let Some(webview) = main_window.get_webview(&webview_label) {
        // Tauri 2.0 的 WebView 不能直接 close，需要通过其他方式移除
        // 暂时隐藏即可
        webview.eval("document.documentElement.style.visibility = 'hidden'; document.documentElement.style.zIndex = '-1';")
            .map_err(|e| format!("隐藏子 WebView 失败: {}", e))?;
        println!("🗑️ 子 WebView 隐藏成功: {}", project_id);
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

            // URL 解码路径（处理 %20 等编码字符）
            let path = match urlencoding::decode(path) {
                Ok(decoded) => decoded.to_string(),
                Err(_) => path.to_string(),
            };

            // 检查是否是 API 请求（如 /session/xxx, /ai/xxx 等）
            // 这些请求应该返回 404 或空响应，因为它们是后端 API 调用
            if path.contains("/session/") || path.contains("/ai/") || path.contains("/api/") {
                println!("⚠️ API 请求，返回 404: {}", path);
                return tauri::http::Response::builder()
                    .status(404)
                    .header("Content-Type", "application/json")
                    .body(r#"{"error":"API endpoint not available in desktop app"}"#.as_bytes().to_vec())
                    .unwrap();
            }

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
                Ok(mut content) => {
                    println!("✅ 文件读取成功，大小: {} bytes", content.len());

                    // 根据文件扩展名设置 Content-Type
                    let mime_type = match file_path.extension().and_then(|s| s.to_str()) {
                        Some("html") => {
                            // 为所有 HTML 注入返回首页按钮
                            if let Ok(html_content) = String::from_utf8(content.clone()) {
                                let inject_script = r#"
<style>
/* 返回首页按钮容器 */
#tauri-back-home-container {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
  font-family: system-ui, -apple-system, sans-serif !important;
}

#tauri-back-home-btn {
  position: absolute !important;
  top: 16px !important;
  left: 16px !important;
  z-index: 2147483647 !important;
  padding: 12px 18px !important;
  border-radius: 25px !important;
  border: 2px solid rgba(255,255,255,0.3) !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #fff !important;
  font-weight: 700 !important;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
  cursor: pointer !important;
  font-size: 15px !important;
  font-family: system-ui, -apple-system, sans-serif !important;
  pointer-events: auto !important;
  opacity: 0.95 !important;
  transform: none !important;
  transition: all 0.3s ease !important;
  backdrop-filter: blur(10px) !important;
  user-select: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

#tauri-back-home-btn:hover {
  opacity: 1 !important;
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6) !important;
}

#tauri-back-home-btn:active {
  transform: translateY(0px) scale(0.98) !important;
}

/* 键盘提示 */
#tauri-keyboard-hint {
  position: absolute !important;
  top: 16px !important;
  right: 16px !important;
  background: rgba(0,0,0,0.7) !important;
  color: #fff !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  pointer-events: none !important;
  opacity: 0.8 !important;
  backdrop-filter: blur(10px) !important;
}
</style>
<script>
(function(){
  const containerId = 'tauri-back-home-container';
  const btnId = 'tauri-back-home-btn';
  const hintId = 'tauri-keyboard-hint';

  // 回首页的候选 URL：优先 app://localhost（打包）、其次 dev 端口
  const homeTargets = [
    'app://localhost/',
    'app://localhost/index.html',
    'http://localhost:1420/',
    'http://localhost:1420/index.html'
  ];

  function goHome() {
    console.log('🏠 返回首页: candidates ->', homeTargets, 'history.length=', window.history?.length);

    // 1) 优先尝试历史回退，回到原始按钮页（如果存在）
    try {
      if (window.history && window.history.length > 1) {
        window.history.back();
        setTimeout(() => window.history.back(), 50); // 再尝试一次兜底
        return;
      }
    } catch (e) {
      console.warn('history.back 失败，尝试直接跳转', e);
    }

    // 2) 直接跳转候选首页
    for (const url of homeTargets) {
      try {
        window.location.href = url;
        setTimeout(() => { window.location.replace(url); }, 50);
        return;
      } catch (e) {
        console.warn('跳转失败，尝试下一个', url, e);
      }
    }
  }

  function createBackButton() {
    // 清理旧容器
    const old = document.getElementById(containerId);
    if (old) old.remove();

    const container = document.createElement('div');
    container.id = containerId;

    const btn = document.createElement('button');
    btn.id = btnId;
    btn.innerHTML = '🏠 返回首页';

    const hint = document.createElement('div');
    hint.id = hintId;
    hint.innerHTML = 'Alt+H 返回首页';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      goHome();
    }, true);

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, true);

    container.appendChild(btn);
    container.appendChild(hint);
    (document.body || document.documentElement).appendChild(container);
    console.log('✅ 返回首页按钮已创建');
  }

  function setupKeyboardShortcut() {
    document.addEventListener('keydown', function(e) {
      if ((e.altKey && e.key.toLowerCase() === 'h') || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        goHome();
      }
    }, true);
  }

  function init() {
    createBackButton();
    setupKeyboardShortcut();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
"#;

                                let modified_html = html_content.replace(
                                    "</head>",
                                    &format!("{}\n</head>", inject_script)
                                );
                                content = modified_html.into_bytes();
                            }
                            "text/html"
                        },
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
            create_child_webview,
            show_child_webview,
            hide_child_webview,
            sync_child_webviews_position,
            close_project_window  // 保留用于清理
        ])
        // 运行 Tauri 应用程序，使用自动生成的上下文
        .run(tauri::generate_context!())
        // 如果运行失败，输出错误信息并终止程序
        .expect("error while running tauri application");
}
