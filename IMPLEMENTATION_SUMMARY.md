# window.location.href 单窗口方案实现总结

## ✅ 已完成的修改

### 1. 修改 `src/App.tsx`
- ✅ 移除了 `openProjectWindow` 的导入和使用
- ✅ 将 `openProject` 函数改为使用 `window.location.href` 实现单窗口跳转
- ✅ 保留了开发/生产模式的 URL 处理逻辑

**关键代码：**
```typescript
// 使用 window.location.href 在当前窗口跳转到项目页面
// 服务器端会自动注入 base 标签和路径修复脚本
window.location.href = projectUrl;
```

### 2. 修改 `server.js`
- ✅ 添加了返回主页按钮的注入逻辑
- ✅ 返回按钮支持开发和生产模式（自动检测环境）
- ✅ 返回按钮样式美观，带有悬停效果

**功能：**
- 自动检测当前环境（开发/生产）
- 开发模式：返回 `http://localhost:1420/`
- 生产模式：返回 `tauri://localhost`
- 按钮固定在页面左上角，z-index: 99999

## 🎯 工作原理

```
用户点击项目按钮
    ↓
App.tsx: openProject()
    ↓
window.location.href = projectUrl
    ↓
浏览器在当前窗口跳转到项目页面
    ↓
server.js: processHtml()
    ↓
自动注入：
  1. <base href="./"> 标签
  2. 路径修复脚本（PathFixer）
  3. 返回主页按钮
    ↓
项目正常加载，资源路径正确 ✅
```

## 📋 功能特性

### ✅ 已实现
1. **单窗口架构**：所有项目在同一窗口中切换
2. **不改项目代码**：服务器端动态处理
3. **路径自动修复**：服务器端注入 base 标签和路径修复脚本
4. **返回主页**：项目页面自动显示返回按钮
5. **开发/生产模式支持**：自动检测环境

### ⚠️ 注意事项
1. **状态丢失**：切换项目时会丢失主应用状态（可通过 sessionStorage 保存）
2. **BrowserNavbar**：主应用的 BrowserNavbar 不会在项目页面显示（可选：服务器端注入）

## 🚀 使用方法

### 开发模式
```bash
pnpm dev
```
- 主应用：`http://localhost:1420/`
- 项目服务器：`http://localhost:5174/`

### 生产模式
```bash
pnpm tauri build
```
- 使用 Tauri 的 asset protocol

## 🔄 工作流程

1. **主应用**：显示项目选择按钮
2. **点击按钮**：`window.location.href` 跳转到项目页面
3. **项目页面**：服务器端自动注入必要的脚本和按钮
4. **返回主页**：点击返回按钮，跳回主应用

## 📝 代码变更

### 修改的文件
1. `src/App.tsx` - 改为使用 window.location.href
2. `server.js` - 添加返回按钮注入逻辑

### 未修改的文件
- ✅ 项目文件（`projects/*/dist/index.html`）保持原样
- ✅ 其他配置文件无需修改

## 🎨 返回按钮样式

- 位置：固定在左上角（top: 10px, left: 10px）
- 样式：渐变背景，圆角，阴影效果
- 交互：悬停时上移并增强阴影
- 层级：z-index: 99999（确保在最上层）

## ✨ 下一步（可选）

如果需要 BrowserNavbar 在项目页面也显示，可以：
1. 在服务器端注入 BrowserNavbar 组件
2. 或者使用 iframe 方案（保持 BrowserNavbar 始终可见）

## 📚 相关文档

- `SINGLE_WINDOW_ANALYSIS.md` - 方案分析
- `ARCHITECTURE_COMPARISON.md` - 架构对比

