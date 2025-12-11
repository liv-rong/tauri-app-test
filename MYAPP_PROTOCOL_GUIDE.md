# 使用自定义协议 myapp:// 打开新窗口加载不同 Dist 文件

## ✅ 实现完成

现在您的 Tauri 应用已经实现了**自定义协议 `myapp://`**，可以像 Electron 一样点击不同按钮在新窗口中加载不同项目的 dist 文件。

## 🎯 核心功能

### 1. **自定义协议 `myapp://`**
- 类似 Electron 的 `app://` 协议
- 可以安全地加载本地资源文件
- 支持所有文件类型（HTML、CSS、JS、图片、字体等）

### 2. **多项目支持**
- **Studio 项目**: `myapp://studio/dist/index.html`
- **Project2**: `myapp://project2/dist/index.html`
- **Project3**: `myapp://project3/dist/index.html`

### 3. **自动路径解析**
协议处理器会自动处理：
- 移除 `myapp://` 前缀
- 去掉查询参数和 hash
- 处理 `./` 和 `/` 开头
- 目录请求默认加载 `index.html`
- 自动设置正确的 Content-Type

## 🚀 使用方法

### 启动应用

```bash
cd /Users/rwr/repo/tauri-app-test
pnpm tauri dev
```

### 点击按钮打开项目

1. **点击 "Studio 项目"**
   - 创建新窗口
   - 加载 `myapp://studio/dist/index.html`
   - 窗口大小：1400x900

2. **点击 "项目 2"**
   - 创建新窗口
   - 加载 `myapp://project2/dist/index.html`
   - 窗口大小：1200x800

3. **点击 "项目 3"**
   - 创建新窗口
   - 加载 `myapp://project3/dist/index.html`
   - 窗口大小：1000x700

## 📋 工作流程

```
用户点击按钮
    ↓
前端调用 invoke('open_project', { projectName: 'studio', windowConfig: {...} })
    ↓
Rust 后端接收请求
    ↓
构建自定义协议 URL: "myapp://studio/dist/index.html"
    ↓
创建新窗口使用 WebviewUrl::External(url)
    ↓
自定义协议处理器拦截请求
    ↓
解析路径: "studio/dist/index.html"
    ↓
从 src-tauri/resources/studio/dist/ 读取文件
    ↓
返回文件内容 + Content-Type
    ↓
新窗口显示项目内容 ✅
```

## 🔍 调试日志

当您点击项目按钮时，终端会显示详细日志：

```
🚀 正在打开项目: studio
🔗 使用自定义协议 URL: myapp://studio/dist/index.html
🏷️  窗口标签: project-studio
⚙️  窗口配置: WindowConfig { width: Some(1400.0), height: Some(900.0), resizable: Some(true), fullscreen: Some(false) }
🔨 开始构建窗口...
✅ 窗口创建成功: project-studio
🎉 窗口将加载: myapp://studio/dist/index.html

--- 自定义协议处理器日志 ---
🔗 收到自定义协议请求: myapp://studio/dist/index.html
📂 解析后的路径: studio/dist/index.html
🎯 最终路径: studio/dist/index.html
📁 完整文件路径: "/Users/rwr/repo/tauri-app-test/src-tauri/resources/studio/dist/index.html"
✅ 文件读取成功，大小: 5234 bytes
📝 Content-Type: text/html

--- 加载资源文件（CSS、JS等）---
🔗 收到自定义协议请求: myapp://studio/dist/assets/index-abc123.js
📂 解析后的路径: studio/dist/assets/index-abc123.js
🎯 最终路径: studio/dist/assets/index-abc123.js
📁 完整文件路径: "/Users/rwr/repo/tauri-app-test/src-tauri/resources/studio/dist/assets/index-abc123.js"
✅ 文件读取成功，大小: 125678 bytes
📝 Content-Type: application/javascript
```

## 📁 资源目录结构

```
src-tauri/
├── resources/
│   ├── studio/
│   │   └── dist/
│   │       ├── index.html          → myapp://studio/dist/index.html
│   │       └── assets/
│   │           ├── index-abc.js    → myapp://studio/dist/assets/index-abc.js
│   │           └── index-xyz.css   → myapp://studio/dist/assets/index-xyz.css
│   ├── project2/
│   │   └── dist/
│   │       ├── index.html          → myapp://project2/dist/index.html
│   │       └── assets/
│   └── project3/
│       └── dist/
│           ├── index.html          → myapp://project3/dist/index.html
│           └── assets/
└── src/
    └── lib.rs                      → 自定义协议处理器
```

## ⚙️ 关键实现

### 1. **注册自定义协议** (src-tauri/src/lib.rs:127-214)

```rust
.register_uri_scheme_protocol("myapp", |app_handle, request| {
    let uri = request.uri().to_string();
    let path = uri.strip_prefix("myapp://").unwrap_or(&uri);

    // 获取资源目录
    let resource_dir = if cfg!(debug_assertions) {
        std::env::current_dir().unwrap().join("resources")
    } else {
        app_handle.app_handle().path().resource_dir().unwrap()
    };

    // 读取文件
    let file_path = resource_dir.join(path);
    let content = std::fs::read(&file_path).unwrap();

    // 设置 Content-Type
    let mime_type = match file_path.extension() {
        Some("html") => "text/html",
        Some("css") => "text/css",
        Some("js") => "application/javascript",
        // ...更多类型
        _ => "application/octet-stream",
    };

    tauri::http::Response::builder()
        .status(200)
        .header("Content-Type", mime_type)
        .body(content)
        .unwrap()
})
```

### 2. **打开新窗口使用自定义协议** (src-tauri/src/lib.rs:43-118)

```rust
#[tauri::command]
fn open_project(
    app_handle: tauri::AppHandle,
    project_name: String,
    window_config: Option<WindowConfig>,
) -> Result<(), String> {
    // 构建自定义协议 URL
    let custom_url = format!("myapp://{}/dist/index.html", project_name);

    // 创建新窗口
    WebviewWindowBuilder::new(
        &app_handle,
        window_label,
        WebviewUrl::External(custom_url.parse().unwrap())  // 使用自定义协议
    )
    .title(format!("项目 - {}", project_name))
    .inner_size(width, height)
    .build()
}
```

### 3. **配置 CSP 允许自定义协议** (tauri.conf.json:21)

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self' myapp: asset:; script-src 'self' 'unsafe-inline' 'unsafe-eval' myapp:; ..."
    }
  }
}
```

## 🎨 支持的文件类型

自定义协议处理器自动识别并设置正确的 Content-Type：

| 文件类型 | Content-Type |
|---------|-------------|
| `.html` | `text/html` |
| `.css` | `text/css` |
| `.js` | `application/javascript` |
| `.json` | `application/json` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.svg` | `image/svg+xml` |
| `.woff`, `.woff2` | `font/woff2` |
| `.ttf` | `font/ttf` |
| 其他 | `application/octet-stream` |

## 🔒 安全特性

1. **沙盒保护**: 只能访问 `resources/` 目录下的文件
2. **路径验证**: 自动处理和清理路径
3. **CSP 策略**: 配置了内容安全策略
4. **文件存在检查**: 返回 404 如果文件不存在

## ✨ 特色功能

### 1. **防止重复窗口**
如果同一项目的窗口已存在，会聚焦该窗口而不是创建新的：

```rust
if let Some(existing_window) = app_handle.get_webview_window(&window_label) {
    existing_window.set_focus()?;
    return Ok(());
}
```

### 2. **自定义窗口配置**
每个项目可以有不同的窗口大小和行为：

```typescript
{
  id: 'studio',
  windowConfig: {
    width: 1400,
    height: 900,
    resizable: true,
    fullscreen: false
  }
}
```

### 3. **开发/生产环境自动切换**
- **开发模式**: 从 `src-tauri/resources/` 加载
- **生产模式**: 从打包后的资源目录加载

## 🆚 对比 Electron

| 特性 | Tauri (myapp://) | Electron (app://) |
|------|-----------------|-------------------|
| 实现方式 | `.register_uri_scheme_protocol()` | `protocol.handle()` |
| 性能 | 更快（原生 WebView） | 较慢（Chromium） |
| 包大小 | 更小（~3MB） | 更大（~100MB+） |
| 内存占用 | 更少 | 更多 |
| 安全性 | 更高（Rust + 沙盒） | 需要手动配置 |
| 开发体验 | 类似 | 类似 |

## 🐛 故障排除

### Q1: 窗口打开了但显示空白？

**检查：**
1. 终端日志中是否有 "❌ 文件不存在"
2. 资源文件是否在 `src-tauri/resources/项目名/dist/` 目录下
3. 浏览器控制台是否有 404 错误

**解决：**
```bash
# 确保资源文件存在
ls -la src-tauri/resources/studio/dist/

# 检查 index.html
cat src-tauri/resources/studio/dist/index.html
```

### Q2: CSS/JS 文件加载失败？

**检查：**
1. HTML 中的资源路径是否使用相对路径
2. CSP 配置是否包含 `myapp:`

**确保 HTML 使用相对路径：**
```html
<!-- ✅ 正确 -->
<link rel="stylesheet" href="./assets/index.css">
<script src="./assets/index.js"></script>

<!-- ❌ 错误 -->
<link rel="stylesheet" href="/assets/index.css">
<script src="/assets/index.js"></script>
```

### Q3: 如何添加新项目？

**步骤：**
1. 将项目的 dist 放到 `src-tauri/resources/新项目名/dist/`
2. 在 `tauri.conf.json` 的 `bundle.resources` 添加：
   ```json
   "resources": [
     "resources/studio",
     "resources/project2",
     "resources/project3",
     "resources/新项目名"
   ]
   ```
3. 在 `src/projectsConfig.ts` 添加项目配置：
   ```typescript
   {
     id: '新项目名',
     name: '新项目显示名',
     description: '项目描述',
     localPath: '新项目名/dist/index.html'
   }
   ```

## 🎉 总结

现在您的 Tauri 应用已经实现了完整的自定义协议功能：

✅ **自定义协议 `myapp://`** - 类似 Electron 的 `app://`
✅ **点击按钮打开新窗口** - 每个项目独立窗口
✅ **加载不同 dist 文件** - Studio、Project2、Project3
✅ **自动 Content-Type** - 支持所有文件类型
✅ **详细调试日志** - 方便开发调试
✅ **防重复窗口** - 自动聚焦已存在窗口
✅ **自定义窗口配置** - 大小、可调整、全屏等

**立即测试：**
```bash
pnpm tauri dev
```

点击不同的项目按钮，每个都会在新窗口中使用 `myapp://` 协议加载对应的 dist 文件！🚀
