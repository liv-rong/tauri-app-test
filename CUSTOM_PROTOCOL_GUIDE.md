# 使用自定义协议打开新窗口加载不同 Dist 项目

## 概述

本项目实现了类似 Electron 的功能：点击不同按钮，在新窗口中使用自定义协议（`asset://`）加载不同项目的 dist 文件。

## 实现原理

### 1. **Tauri 的 asset:// 协议**

Tauri 内置了 `asset://` 协议，用于安全地访问应用资源目录中的文件。使用 `WebviewUrl::App()` 会自动将路径转换为 `asset://` 协议。

```rust
// 路径："studio/dist/index.html"
// 自动转换为：asset://localhost/studio/dist/index.html
WebviewUrl::App("studio/dist/index.html".into())
```

### 2. **资源目录结构**

```
src-tauri/
├── resources/
│   ├── studio/
│   │   └── dist/
│   │       └── index.html
│   ├── project2/
│   │   └── dist/
│   │       └── index.html
│   └── project3/
│       └── dist/
│           └── index.html
└── tauri.conf.json
```

### 3. **配置 asset:// 协议权限**

在 `tauri.conf.json` 中配置协议范围：

```json
{
  "app": {
    "security": {
      "assetProtocol": {
        "enable": true,
        "scope": [
          "$RESOURCE/**",
          "$RESOURCE/studio/**/*",
          "$RESOURCE/project2/**/*",
          "$RESOURCE/project3/**/*"
        ]
      }
    }
  },
  "bundle": {
    "resources": [
      "resources/studio",
      "resources/project2",
      "resources/project3"
    ]
  }
}
```

## 使用方法

### 步骤 1：配置项目

在 `src/projectsConfig.ts` 中定义项目：

```typescript
export const projects: ProjectConfig[] = [
  {
    id: 'studio',
    name: 'Studio 项目',
    description: 'Studio 应用项目',
    localPath: 'studio/dist/index.html',
    windowConfig: {
      width: 1400,
      height: 900,
      resizable: true
    }
  },
  {
    id: 'project2',
    name: '项目 2',
    description: '第二个应用项目',
    localPath: 'project2/dist/index.html',
    windowConfig: {
      width: 1200,
      height: 800,
      resizable: true
    }
  }
];
```

### 步骤 2：在前端调用

在 React 组件中点击按钮打开项目：

```typescript
import { invoke } from '@tauri-apps/api/core';

const openProject = async (project: ProjectConfig) => {
  try {
    await invoke('open_project', {
      projectName: project.id,
      windowConfig: project.windowConfig || null
    });
    console.log('✅ 项目窗口创建成功');
  } catch (error) {
    console.error('❌ 打开项目失败:', error);
  }
};
```

### 步骤 3：运行应用

```bash
# 开发模式
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

## 核心功能

### 1. **打开新窗口**

点击项目按钮会创建一个新的独立窗口：

```rust
WebviewWindowBuilder::new(
    &app_handle,
    window_label,
    WebviewUrl::App(dist_path.into())  // 使用 asset:// 协议
)
.title(format!("项目 - {}", project_name))
.inner_size(width, height)
.build()
```

### 2. **防止重复窗口**

如果窗口已存在，会聚焦该窗口而不是创建新的：

```rust
if let Some(existing_window) = app_handle.get_webview_window(&window_label) {
    existing_window.set_focus()?;
    return Ok(());
}
```

### 3. **自定义窗口配置**

支持从前端传递窗口配置：

```rust
#[derive(Debug, Serialize, Deserialize)]
struct WindowConfig {
    width: Option<f64>,
    height: Option<f64>,
    resizable: Option<bool>,
    fullscreen: Option<bool>,
}
```

### 4. **调试日志**

后端会输出详细的调试信息：

```
🚀 正在打开项目: studio
📁 Dist 路径: studio/dist/index.html
🏷️  窗口标签: project-studio
⚙️  窗口配置: WindowConfig { width: Some(1400.0), height: Some(900.0), ... }
🔨 开始构建窗口...
✅ 窗口创建成功: project-studio
```

## 优势

✅ **安全性高**：使用 Tauri 的内置协议，有沙盒保护
✅ **性能好**：直接加载本地文件，无需 HTTP 服务器
✅ **配置灵活**：支持自定义窗口大小、是否可调整等
✅ **防重复**：自动检测并聚焦已存在的窗口
✅ **易于维护**：代码清晰，调试方便

## 对比 Electron 实现

| 特性 | Tauri | Electron |
|------|-------|----------|
| 自定义协议 | `asset://` (内置) | `app://` (需要手动注册) |
| 安全性 | 更高（Rust + 沙盒） | 较低（需要手动配置） |
| 性能 | 更快（原生 WebView） | 较慢（Chromium） |
| 包大小 | 更小（~3MB） | 更大（~100MB+） |
| 开发体验 | 类似 | 类似 |

## 常见问题

### Q1: 为什么资源加载失败？

**A:** 检查以下几点：
1. 确保资源文件在 `src-tauri/resources/` 目录下
2. 确保 `tauri.conf.json` 中配置了正确的 scope
3. 确保 `bundle.resources` 包含了资源目录
4. 查看控制台日志，检查路径是否正确

### Q2: 如何添加新项目？

**A:** 三个步骤：
1. 将项目的 dist 文件放到 `src-tauri/resources/新项目名/dist/`
2. 在 `tauri.conf.json` 的 `bundle.resources` 和 `assetProtocol.scope` 中添加
3. 在 `src/projectsConfig.ts` 中添加项目配置

### Q3: 窗口打开后显示空白？

**A:** 检查：
1. `dist/index.html` 文件是否存在
2. 资源路径是否正确（使用相对路径）
3. 浏览器控制台是否有 CORS 或加载错误
4. 检查 CSP 配置是否允许资源加载

### Q4: 如何自定义窗口样式？

**A:** 在 `projectsConfig.ts` 中配置 `windowConfig`：

```typescript
windowConfig: {
  width: 1600,
  height: 1000,
  resizable: true,
  fullscreen: false
}
```

## 测试步骤

1. **启动应用**
   ```bash
   cd /Users/rwr/repo/tauri-app-test
   pnpm tauri dev
   ```

2. **点击不同项目按钮**
   - 点击 "Studio 项目" → 打开 Studio 窗口
   - 点击 "项目 2" → 打开 Project2 窗口
   - 点击 "项目 3" → 打开 Project3 窗口

3. **验证功能**
   - ✅ 每个项目打开独立窗口
   - ✅ 不同窗口显示不同内容
   - ✅ 再次点击同一项目会聚焦现有窗口
   - ✅ 窗口大小符合配置

4. **查看日志**
   - 前端日志：浏览器控制台
   - 后端日志：终端输出

## 参考资源

- [Tauri Asset Protocol 文档](https://tauri.app/v1/guides/building/resources)
- [Tauri Window Management](https://tauri.app/v1/guides/features/window)
- [WebviewUrl API](https://docs.rs/tauri/latest/tauri/enum.WebviewUrl.html)

## 总结

该实现完全模拟了 Electron 的自定义协议功能，使用 Tauri 的 `asset://` 协议安全高效地加载本地资源。点击不同按钮会在新窗口中渲染不同的 dist 项目，每个窗口都是独立的，可以自定义大小和行为。

**核心实现文件：**
- 后端：`src-tauri/src/lib.rs` (open_project 命令)
- 前端：`src/App.tsx` (openProject 函数)
- 配置：`src/projectsConfig.ts` (项目列表)
- Tauri 配置：`src-tauri/tauri.conf.json` (协议权限)
