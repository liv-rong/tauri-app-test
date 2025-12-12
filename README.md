# 项目说明

一个基于 Tauri 2.x 的单窗口桌面壳，使用 React + Vite 作为主界面，加载多个已编译的前端项目（studio、project2、project3）的 dist 静态文件。通过自定义协议 `myapp://` 将本地资源映射为可访问的 URL，并在每个子页面注入“返回首页”按钮。

## 技术栈
- 桌面框架：Tauri 2.x（Rust 后端 + WebView）
- 前端壳：React + TypeScript + Vite
- 自定义协议：`myapp://`（Rust 侧映射到 `src-tauri/resources/**`）
- 静态资源：`src-tauri/resources/studio`、`project2`、`project3` 等目录下的 dist 输出

## 目录结构（关键部分）
- `src/`：主界面（React）
  - `App.tsx`：项目列表、导航逻辑（单 WebView，点击按钮跳转不同 `myapp://` URL）
  - `projectsConfig.ts`：项目配置（id、名称、描述、本地路径等）
- `src-tauri/`
  - `src/lib.rs`：Tauri 后端，注册 `myapp://` 协议，返回静态文件并注入返回首页按钮脚本
  - `tauri.conf.json`：Tauri 配置（CSP、资源 scope、窗口设置等）
  - `resources/`：各子项目 dist 文件
    - `studio/`
    - `project2/`
    - `project3/`

## 功能实现
- 单 WebView 方案：主窗口即唯一 WebView，点击按钮后直接跳转 `myapp://{projectId}/`，由 Rust 协议处理返回对应 dist 的 `index.html`。
- 返回首页：后端在 HTML 响应中注入脚本，按钮显示在左上角；优先使用 `history.back()`，不足时尝试回到 `app://localhost` 或 `http://localhost:1420`（覆盖打包/开发两种模式）。
- 资源映射：`tauri.conf.json` 的 asset scope 已允许 `resources/*`，自定义协议解析路径并返回文件（默认 `index.html`）。

## 使用方法
### 开发模式
```bash
pnpm install
pnpm tauri dev
```
打开主窗口后，点击顶部按钮加载对应项目；子页面左上角有“返回首页”按钮。

### 打包
```bash
pnpm install
pnpm tauri build
```
打包后资源来自 `src-tauri/resources/**`，`myapp://` 映射已在协议处理里生效。

## 运行时行为
- 切换项目：刷新式跳转（单 WebView），页面状态由各项目自行持久化（如需要）。
- 返回首页：先尝试历史回退，再尝试固定入口 URL（打包/开发）。
- CSP/安全：`tauri.conf.json` 中的 CSP 已允许自定义协议和本地资源。

## 已知取舍
- 优点：单 WebView，内存占用低，逻辑简单。
- 代价：每次切换会重新加载子页面；如需保留运行时状态/登录态，请在子项目中持久化到 localStorage/cookie。

## 参考工具
- IDE：VS Code + rust-analyzer + Tauri VS Code 扩展
- 构建：pnpm + Vite + Tauri CLI
