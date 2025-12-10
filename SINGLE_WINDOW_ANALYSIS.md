# 单窗口 WebView 架构方案分析

## 需求
- 单窗口架构（不是多窗口）
- 类似 WebView 的架构
- **不改项目代码**

## 方案分析

### 方案 1：window.location.href（推荐 ⭐⭐⭐⭐⭐）

**原理：**
- 在当前窗口直接跳转到项目 URL
- 使用 `window.location.href = projectUrl` 实现页面切换
- 服务器端已经处理了路径问题（动态注入 base 标签和路径修复脚本）

**优点：**
- ✅ **最简单直接**，不需要额外组件
- ✅ **不需要修改项目代码**（服务器端处理）
- ✅ **完全隔离**，每个项目独立运行
- ✅ **性能好**，没有额外的 DOM 层
- ✅ **兼容性好**，所有浏览器都支持
- ✅ **类似原生 WebView**，每个项目都是完整的页面

**缺点：**
- ⚠️ 切换项目时会丢失主应用状态（可以通过 sessionStorage/localStorage 保存）
- ⚠️ 需要处理返回主页的逻辑

**实现方式：**
```typescript
// 在当前窗口跳转
window.location.href = projectUrl;

// 返回主页：在项目页面添加返回按钮，或使用 BrowserNavbar
window.location.href = 'http://localhost:1420/';
```

**适用场景：**
- ✅ 项目之间不需要共享状态
- ✅ 每个项目都是完整的独立应用
- ✅ 类似浏览器的标签页切换

---

### 方案 2：iframe 嵌入（⭐⭐⭐）

**原理：**
- 在主窗口中嵌入 `<iframe>` 元素
- 每个项目在 iframe 中加载
- 主应用保持 React 应用，显示 BrowserNavbar

**优点：**
- ✅ **主应用状态保持**，BrowserNavbar 始终可见
- ✅ **不需要修改项目代码**（iframe 隔离）
- ✅ **可以同时显示多个项目**（多个 iframe）
- ✅ **项目之间完全隔离**（iframe 沙箱）

**缺点：**
- ⚠️ **iframe 通信复杂**（postMessage）
- ⚠️ **性能开销**（额外的 DOM 层）
- ⚠️ **某些安全策略限制**（CSP、X-Frame-Options）
- ⚠️ **资源路径问题**（需要服务器端处理）

**实现方式：**
```tsx
// 主应用保持 React，显示 BrowserNavbar
<div>
  <BrowserNavbar />
  <iframe src={projectUrl} style={{ width: '100%', height: 'calc(100vh - 60px)' }} />
</div>
```

**适用场景：**
- ✅ 需要 BrowserNavbar 始终可见
- ✅ 需要同时显示多个项目
- ✅ 项目之间需要通信

---

### 方案 3：React Router + 动态加载（⭐⭐）

**原理：**
- 使用 React Router 管理路由
- 根据路由动态渲染不同的内容区域
- 主应用保持，项目内容区域切换

**优点：**
- ✅ **主应用状态保持**
- ✅ **BrowserNavbar 始终可见**
- ✅ **路由管理清晰**

**缺点：**
- ❌ **需要修改项目代码**（将项目打包为 React 组件）
- ❌ **不是真正的 WebView**，项目需要适配 React
- ❌ **项目独立性差**，可能互相影响

**适用场景：**
- ❌ 不适用（需要修改项目代码）

---

### 方案 4：Tauri Webview API（❌ 不可行）

**原理：**
- 使用 Tauri 的 Webview API 在同一个窗口中嵌入多个 Webview

**问题：**
- ❌ **Tauri 2.x 不支持内嵌 Webview**
- ❌ **WebviewWindow 只能创建独立窗口**
- ❌ **没有类似 Flutter WebView widget 的 API**

---

## 推荐方案对比

| 方案 | 不改代码 | 单窗口 | 项目隔离 | 性能 | 复杂度 | 推荐度 |
|------|---------|--------|----------|------|--------|--------|
| window.location.href | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| iframe | ✅ | ✅ | ✅ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| React Router | ❌ | ✅ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Tauri Webview | ❌ | ❌ | - | - | - | ❌ |

---

## 最终推荐：方案 1（window.location.href）

### 为什么推荐？

1. **最简单**：一行代码实现
2. **不改代码**：服务器端已经处理了路径问题
3. **完全隔离**：每个项目都是独立的页面
4. **性能最好**：没有额外的 DOM 层
5. **类似 WebView**：每个项目都是完整的 WebView 页面

### 实现思路

```
主应用（React） → 点击按钮 → window.location.href → 项目页面
                                              ↓
                                   服务器端动态注入 base 标签和路径修复脚本
                                              ↓
                                   项目正常加载，资源路径正确
```

### 需要解决的问题

1. **返回主页**：在项目页面添加返回按钮，或使用 BrowserNavbar
2. **状态保存**：使用 sessionStorage/localStorage 保存主应用状态
3. **BrowserNavbar**：可以在项目页面也显示 BrowserNavbar（通过服务器端注入）

---

## 实现步骤

### 步骤 1：修改 App.tsx
```typescript
// 不使用 WebviewWindow，直接在当前窗口跳转
const openProject = async (project: ProjectConfig) => {
  // ... 获取 projectUrl ...
  window.location.href = projectUrl;
};
```

### 步骤 2：在服务器端注入返回按钮
```javascript
// server.js 中，在 HTML 注入时添加返回按钮
const backButton = `
<div style="position: fixed; top: 10px; left: 10px; z-index: 9999;">
  <button onclick="window.location.href='http://localhost:1420/'">返回主页</button>
</div>
`;
```

### 步骤 3：处理 BrowserNavbar
- 选项 A：在项目页面也注入 BrowserNavbar（服务器端）
- 选项 B：只在主应用显示 BrowserNavbar
- 选项 C：使用全局 BrowserNavbar（需要跨页面状态管理）

---

## 总结

**最佳方案：window.location.href**

- ✅ 满足所有需求（单窗口、不改代码、WebView 架构）
- ✅ 实现最简单
- ✅ 性能最好
- ✅ 完全隔离

**实现难度：⭐（非常简单）**

**需要修改：**
- 主应用的 `openProject` 函数（改为 `window.location.href`）
- 服务器端注入返回按钮（可选）
- 服务器端注入 BrowserNavbar（可选）

