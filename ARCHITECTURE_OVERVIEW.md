# 项目架构总览

本项目是一个单窗口 Tauri 桌面应用，用于在同一 WebView 中切换并运行三个已有的打包项目（各自 `dist` 目录）。通过自定义多端口静态服务器和路径修复注入，实现“无需改动子项目文件、即可正常加载”的目标，并保留一个可复用的浏览器式导航栏（BrowserNavbar）。

## 核心组成
- 主应用（React + Tauri 单窗口）：主页列出三个项目按钮，点击后用 `window.location.href` 在当前窗口跳转到目标项目。
- 多端口静态服务器：`servers-manager.js` 启动多个 `server.js` 实例（5174/5175/5176），每个端口只服务一个项目的 `dist`。
- 动态 HTML 处理：`server.js` 在返回 HTML 时注入 `<base href="/">`、路径修复脚本、返回主页按钮，不改动子项目源文件。
- 资源访问策略：
  - 开发：`http://localhost:<port>/`（多端口隔离，每个项目根路径为 `/`）。
  - 生产：`resolveResource` + `convertFileSrc` 通过 Tauri 资源协议访问 `projects/<id>/dist/index.html`。
- 复用导航栏：`BrowserNavbar` 样式简洁，支持前进/后退/刷新/地址栏；可嵌入所有页面（主应用与子项目）。

## 运行流程
1. 开发启动：`pnpm dev` → `vite` 启动主应用，`servers-manager.js` 启动三个 `server.js`。
2. 主页点击按钮：根据项目配置选择端口，`window.location.href = http://localhost:<port>/` 进入对应项目。
3. `server.js` 响应 HTML：
   - 注入 `<base>` 让相对/绝对路径在项目根下解析。
   - 注入路径修复脚本 + MutationObserver，确保动态插入资源也能正确加载。
   - 注入“返回主页”按钮（跳回主应用）。
4. 资源请求：以项目根为基准（`/_expo/...` 等路径）由对应端口的服务器命中 `dist` 目录，避免 403/404。
5. 生产打包：Tauri 资源协议加载 `projects/<id>/dist/index.html`，同样依赖 `<base>` 和注入脚本修正路径。

## 功能作用
- 单窗口承载多个已打包项目，行为类似“桌面壳 + WebView”。
- 子项目零改动部署；自动注入路径修复与返回入口。
- 多端口隔离，避免路由/资源互相污染。
- 提供统一的 BrowserNavbar，提升页面内导航体验。

## 优点
- **零侵入子项目**：不改 `dist`，用服务器端注入解决路径与导航。
- **单窗口体验**：与 Flutter 桌面壳 + WebView2 相似的切页模式，简单直接。
- **隔离清晰**：多端口 + 独立根路径，避免资源冲突。
- **可扩展**：新增项目仅需配置端口与路径，无需改核心逻辑。
- **导航统一**：BrowserNavbar 可复用，满足前进/后退/刷新/输入 URL。

## 缺点与权衡
- **页面整体替换**：`window.location.href` 切换会重载整页，状态需自行持久化。
- **共享进程上下文**：同一 WebView 共享存储/Session，如需完全隔离需改多窗口方案。
- **多端口占用**：开发依赖 5174/5175/5176，端口被占用需手动调整配置。
- **首屏依赖注入**：注入脚本发生在服务器端返回时，若有非 HTML 入口或 Service Worker 复杂场景需额外验证。
- **生产路径耦合资源协议**：依赖 Tauri 资源协议和 `resolveResource/convertFileSrc`，需确保打包路径一致。

## 主要文件速览
- `src/App.tsx`：主页入口，按钮跳转逻辑（开发端口 / 生产资源协议）。
+- `src/projectsConfig.ts`：子项目配置（id、路径、端口、窗口参数）。
- `server.js`：单项目静态服务器，注入 `<base>`、路径修复、返回按钮。
- `servers-manager.js`：多项目服务器编排，按端口启动多个 `server.js`。
- `src/BrowserNavbar/`：可复用的浏览器式导航栏（简洁样式 + 导航功能）。
- `src-tauri/tauri.conf.json`：Tauri 配置（资产协议范围、打包资源）。

