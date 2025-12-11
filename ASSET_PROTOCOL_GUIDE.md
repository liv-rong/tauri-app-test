# 使用 asset:// 协议直接加载本地文件（改进方案）

## 📋 问题分析

### 原方案的问题

1. **仍需启动 HTTP 服务器**
   - 和前端运行 Node.js 服务没有本质区别
   - 占用端口（8001, 8002, 8003）
   - 每次请求都要经过 HTTP 协议层，有性能开销

2. **打包时的行为**
   - ✅ 打包时会把三个项目的 `dist` 文件包含进去（不会重新构建）
   - ❌ 但运行时仍需要启动 HTTP 服务器

3. **资源浪费**
   - 需要维护 TCP 连接
   - 需要解析 HTTP 请求
   - 需要处理多线程

## ✨ 改进方案：使用 asset:// 协议

### 核心思路

类似 Flutter 的 WebView 内嵌方法，**直接加载本地文件，无需启动 HTTP 服务器**。

### 技术实现

1. **使用 Tauri 的 `asset://` 协议**
   - Tauri 提供了 `asset://` 协议来直接访问本地资源文件
   - 类似于 `file://` 协议，但更安全且受 Tauri 控制

2. **使用 `convertFileSrc` 函数**
   - 前端使用 `@tauri-apps/api/core` 的 `convertFileSrc` 函数
   - 将本地文件路径转换为 `asset://` 协议的 URL

3. **配置 `assetProtocol`**
   - 在 `tauri.conf.json` 中启用 `assetProtocol`
   - 配置允许访问的资源路径范围

## 🎯 优势对比

| 特性 | 原方案（HTTP 服务器） | 新方案（asset:// 协议） |
|------|---------------------|----------------------|
| **需要启动服务器** | ✅ 是（3个端口） | ❌ 否 |
| **占用端口** | ✅ 是（8001, 8002, 8003） | ❌ 否 |
| **性能开销** | 较高（HTTP 协议层） | 极低（直接文件访问） |
| **代码复杂度** | 高（需要 HTTP 服务器代码） | 低（只需配置） |
| **资源占用** | 较高（多线程 + TCP） | 极低（直接读取文件） |
| **打包大小** | 相同（都包含 dist 文件） | 相同（都包含 dist 文件） |
| **安全性** | 需要处理 HTTP 安全 | 由 Tauri 控制，更安全 |

## 📁 文件结构

```
src-tauri/
├── resources/              # 资源目录（打包时会包含）
│   ├── studio/
│   │   └── dist/          # Studio 项目的构建产物
│   │       └── index.html
│   ├── project2/
│   │   └── dist/          # Project2 的构建产物
│   │       └── index.html
│   └── project3/
│       └── dist/          # Project3 的构建产物
│           └── index.html
└── src/
    └── lib.rs             # 已移除 HTTP 服务器代码
```

## 🔧 配置说明

### 1. tauri.conf.json

```json
{
  "app": {
    "security": {
      "assetProtocol": {
        "enable": true,
        "scope": [
          "$RESOURCE/**",           // 允许访问所有资源
          "$RESOURCE/studio/**",    // Studio 项目
          "$RESOURCE/project2/**",  // Project2 项目
          "$RESOURCE/project3/**"   // Project3 项目
        ]
      }
    }
  },
  "bundle": {
    "resources": [
      "resources/studio",
      "resources/project2",
      "resources/project3/"
    ]
  }
}
```

### 2. 前端代码

```typescript
import { convertFileSrc } from '@tauri-apps/api/core';

// 将本地文件路径转换为 asset:// URL
const assetUrl = convertFileSrc('studio/dist/index.html');
// 结果类似：asset://localhost/studio/dist/index.html

// 在 iframe 中使用
<iframe src={assetUrl} />
```

## 🚀 使用方式

### 开发模式

1. 确保 `src-tauri/resources/` 目录下有三个项目的 `dist` 文件
2. 运行 `pnpm tauri dev`
3. 前端会自动使用 `convertFileSrc` 将路径转换为 `asset://` URL

### 生产模式

1. 构建前端：`pnpm build`
2. 确保资源文件在 `src-tauri/resources/` 目录下
3. 打包应用：`pnpm tauri build`
4. 打包时会自动将 `resources/` 目录包含到应用中

## 📝 代码变更

### Rust 代码（lib.rs）

**移除：**
- ❌ HTTP 服务器相关代码（`TcpListener`, `TcpStream` 等）
- ❌ 多线程服务器启动逻辑
- ❌ HTTP 请求处理函数

**保留：**
- ✅ 基本的 Tauri 应用初始化
- ✅ 资源目录路径获取（用于调试）

### 前端代码

**变更：**
- ✅ 使用 `convertFileSrc` 替代 HTTP URL
- ✅ 项目配置改为使用 `localPath` 而不是 `path` 和 `port`

## 🔍 工作原理

1. **前端调用 `convertFileSrc('studio/dist/index.html')`**
   - 函数将路径转换为 `asset://localhost/studio/dist/index.html`

2. **Tauri WebView 加载 asset:// URL**
   - Tauri 拦截 `asset://` 协议请求
   - 根据配置的 `scope` 检查权限
   - 从资源目录读取文件并返回

3. **无需 HTTP 服务器**
   - 直接文件系统访问
   - 性能更高
   - 资源占用更少

## ❓ 常见问题

### Q: 打包时会不会重新构建三个项目？

**A:** 不会。打包时只会把 `resources/` 目录下的文件包含进去，不会重新构建。你需要手动构建这三个项目，然后把 `dist` 文件放到 `resources/` 目录下。

### Q: 和前端运行 Node.js 服务有什么区别？

**A:** 
- **原方案**：本质上和 Node.js 服务一样，都需要启动 HTTP 服务器
- **新方案**：直接文件访问，无需服务器，性能更好，资源占用更少

### Q: 开发模式和生产模式有什么区别？

**A:**
- **开发模式**：从 `src-tauri/resources/` 读取文件
- **生产模式**：从打包后的应用资源目录读取文件（路径不同，但逻辑相同）

### Q: 如果项目需要后端 API 怎么办？

**A:** 如果项目需要后端 API，可以：
1. 在 Tauri 中实现 API 命令（使用 `#[tauri::command]`）
2. 前端通过 `invoke` 调用 Rust 函数
3. 或者仍然启动一个后端服务（但只用于 API，不用于静态文件）

## 📚 参考文档

- [Tauri Asset Protocol](https://v2.tauri.app/security/asset-protocol/)
- [Tauri convertFileSrc API](https://v2.tauri.app/api/js/core/#convertfilesrc)
