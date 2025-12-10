# Tauri 多窗口项目管理系统

这个项目实现了一个 Tauri 多窗口应用，可以从主窗口打开多个独立的子项目窗口。

## 📁 项目结构

```
tauri-app-test/
├── projects/                    # 所有子项目存放目录
│   ├── studio/                  # Studio 项目
│   │   └── dist/
│   │       └── index.html
│   ├── project2/                # 项目 2
│   │   └── dist/
│   │       └── index.html
│   └── project3/                # 项目 3
│       └── dist/
│           └── index.html
├── src/
│   ├── App.tsx                  # 主应用（项目启动器）
│   ├── projectsConfig.ts        # 项目配置文件
│   └── BrowserNavbar/           # 浏览器导航栏组件
└── src-tauri/
    └── tauri.conf.json          # Tauri 配置
```

## 🚀 如何运行

### 开发模式
```bash
pnpm tauri dev
```

### 构建生产版本
```bash
pnpm tauri build
```

## 📝 如何添加新项目

### 1. 准备项目文件
将你的打包好的项目 dist 文件夹放到 `projects/` 目录下：

```bash
projects/
└── your-project-name/
    └── dist/
        └── index.html  # 必须有 index.html 入口文件
```

### 2. 更新项目配置
编辑 `src/projectsConfig.ts`，添加新项目配置：

```typescript
export const projects: ProjectConfig[] = [
  // ... 现有项目
  {
    id: 'your-project-id',              // 唯一标识符
    name: '你的项目名称',                // 显示名称
    description: '项目描述',             // 描述信息
    path: 'your-project-name/dist/index.html',  // 相对路径
    windowConfig: {
      width: 1200,                      // 窗口宽度
      height: 800,                      // 窗口高度
      resizable: true                   // 是否可调整大小
    }
  }
];
```

### 3. 重启应用
重新运行 `pnpm tauri dev` 或重新构建应用。

## 🎯 功能特性

- ✅ **多窗口支持** - 每个项目在独立窗口中运行
- ✅ **窗口管理** - 自动检测已打开的窗口，避免重复打开
- ✅ **资源加载** - 使用 Tauri 的 asset 协议安全加载本地文件
- ✅ **加载状态** - 显示项目加载状态
- ✅ **错误处理** - 完善的错误提示和处理
- ✅ **自定义窗口** - 为每个项目配置不同的窗口大小

## 🔧 技术实现

### 核心 API 使用

1. **WebviewWindow** - 创建新窗口
```typescript
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const webview = new WebviewWindow('window-label', {
  url: assetUrl,
  title: 'Window Title',
  width: 1200,
  height: 800
});
```

2. **convertFileSrc** - 转换文件路径为可访问的 URL
```typescript
import { convertFileSrc } from '@tauri-apps/api/core';

const assetUrl = convertFileSrc(resourcePath);
```

3. **resolveResource** - 解析资源路径
```typescript
import { resolveResource } from '@tauri-apps/api/path';

const resourcePath = await resolveResource('projects/...');
```

## 📌 注意事项

1. **资源打包** - 确保 `tauri.conf.json` 中配置了资源打包：
```json
{
  "bundle": {
    "resources": [
      "../projects/**/*"
    ]
  }
}
```

2. **路径问题** - 所有项目必须有 `index.html` 作为入口文件

3. **静态资源** - 项目中的 CSS、JS、图片等静态资源使用相对路径

4. **CORS** - 使用 Tauri 的 asset 协议不会有 CORS 问题

## 🐛 常见问题

### Q: 窗口打不开？
A: 检查：
- 项目路径是否正确
- index.html 是否存在
- 浏览器控制台是否有错误信息

### Q: 静态资源加载失败？
A: 确保项目中使用相对路径引用资源，如：
```html
<link rel="stylesheet" href="./assets/style.css">
<script src="./assets/app.js"></script>
```

### Q: 如何在打包后的应用中使用？
A: 打包时会自动将 `projects/` 目录下的所有文件打包到应用中，无需额外配置。

## 📚 相关文档

- [Tauri 官方文档](https://tauri.app/)
- [Tauri WebviewWindow API](https://tauri.app/reference/javascript/api/namespacewndow)
- [Tauri Asset Protocol](https://tauri.app/develop/calling-rust/)

## 🎉 开始使用

现在你可以运行 `pnpm tauri dev`，点击主界面的三个按钮来打开不同的项目窗口了！
