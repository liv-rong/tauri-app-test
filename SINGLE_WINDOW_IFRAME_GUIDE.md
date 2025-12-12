# 单窗口 iframe 方案 - 使用指南

## ✅ 实现完成

现在应用已经改为**单窗口模式**，点击不同按钮在同一个窗口的 iframe 中切换项目，三个项目完全隔离。

## 🎯 核心功能

### 1. **单窗口 + 顶部导航**
- 顶部紫色渐变导航栏
- 三个项目按钮（Studio、项目2、项目3）
- 选中的按钮高亮显示

### 2. **iframe 隔离**
- 每个项目在独立的 iframe 中运行
- 使用 `myapp://` 协议加载
- 完全的状态、路由、样式隔离

### 3. **状态保持**
- 所有 iframe 同时存在，只是隐藏/显示
- 切换项目时状态不会丢失
- 再次切换回来时，保持之前的状态

### 4. **加载状态**
- 加载时显示旋转动画
- 加载完成后自动隐藏

### 5. **欢迎页面**
- 首次打开显示欢迎页面
- 三个项目卡片，点击即可打开

## 🏗️ 架构设计

```
主窗口 (localhost:1420)
│
├── 顶部导航栏
│   ├── [Studio 项目]  ← 按钮
│   ├── [项目 2]       ← 按钮
│   └── [项目 3]       ← 按钮
│
├── iframe 容器
│   ├── <iframe src="myapp://studio/">     [显示]
│   ├── <iframe src="myapp://project2/">   [隐藏]
│   └── <iframe src="myapp://project3/">   [隐藏]
│
└── 底部状态栏
    └── "当前项目: Studio 项目"
```

## 🔍 关键实现

### 1. 状态管理

```tsx
// 当前选中的项目
const [currentProject, setCurrentProject] = useState<string | null>(null);

// 加载状态
const [loading, setLoading] = useState<string | null>(null);

// iframe 引用（用于保持状态）
const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({});
```

### 2. 项目切换

```tsx
const openProject = (project: ProjectConfig) => {
  console.log('🚀 正在打开项目:', project.name);
  setLoading(project.id);
  setCurrentProject(project.id);
};
```

### 3. iframe 渲染策略

```tsx
// 所有项目的 iframe 都渲染，但只显示当前选中的
{projects.map(project => (
  <iframe
    key={project.id}
    src={`myapp://${project.id}/`}
    style={{
      display: currentProject === project.id ? 'block' : 'none',
    }}
  />
))}
```

## 🎨 UI 特性

### 顶部导航栏
- **紫色渐变背景**：`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **选中状态**：白色背景 + 紫色文字 + 向上偏移
- **hover 效果**：半透明白色背景
- **加载状态**：显示 ⏳ 加载中...

### iframe 容器
- **全屏显示**：占据除导航栏和状态栏外的所有空间
- **加载遮罩**：白色半透明背景 + 旋转动画
- **流畅切换**：CSS `display` 切换，无需重新加载

### 欢迎页面
- **居中布局**：火箭图标 + 欢迎文字
- **项目卡片**：Grid 布局，响应式
- **hover 效果**：向上浮动 + 阴影 + 紫色边框

### 底部状态栏
- **深色背景**：`#2d3748`
- **显示信息**：当前项目名称 + 协议 URL

## 🚀 使用方法

### 1. 启动应用

```bash
cd /Users/rwr/repo/tauri-app-test
pnpm tauri dev
```

### 2. 操作流程

1. **首次打开** → 显示欢迎页面
2. **点击项目卡片** → 加载对应项目
3. **点击顶部按钮** → 切换项目
4. **再次点击同一按钮** → 无需重新加载
5. **底部状态栏** → 显示当前项目信息

## 💡 优势

### ✅ 完全隔离
- **路由隔离**：每个项目有独立的路由系统（Expo Router 不冲突）
- **状态隔离**：React/Vue 状态互不影响
- **样式隔离**：CSS 不会互相污染
- **JS 隔离**：全局变量不会冲突

### ✅ 性能优化
- **状态保持**：切换时不重新加载，保留状态
- **内存共享**：iframe 在后台保持，快速切换
- **懒加载**：只在点击时才加载 iframe

### ✅ 用户体验
- **流畅切换**：无需等待，即时响应
- **状态保留**：切换回来时还在原来的页面
- **加载提示**：清晰的加载动画
- **视觉反馈**：选中状态高亮

## 🔧 技术细节

### iframe sandbox 属性

```tsx
sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation allow-downloads"
```

- `allow-same-origin`：允许访问同源资源
- `allow-scripts`：允许执行 JavaScript
- `allow-forms`：允许表单提交
- `allow-popups`：允许弹窗
- `allow-modals`：允许模态框
- `allow-top-navigation`：允许顶级导航
- `allow-downloads`：允许下载

### CSP 配置

```json
"csp": "frame-src 'self' myapp: asset: https://asset.localhost;"
```

允许加载 `myapp://` 协议的 iframe。

### 路径映射

```
点击 "Studio 项目"
  ↓
加载 iframe: myapp://studio/
  ↓
自定义协议处理器: resources/studio/index.html
  ↓
资源加载: myapp://studio/_expo/static/css/theme.css
  ↓
自定义协议处理器: resources/studio/_expo/static/css/theme.css
```

## 🎯 对比多窗口方案

| 特性 | 单窗口 iframe | 多窗口 |
|------|--------------|--------|
| 窗口管理 | ✅ 简单，只有一个窗口 | ❌ 复杂，需要管理多个窗口 |
| 资源占用 | ✅ 较低，共享主窗口 | ❌ 较高，每个窗口独立 |
| 切换速度 | ✅ 即时切换 | ❌ 需要聚焦/创建窗口 |
| 状态保持 | ✅ 自动保持 | ❌ 需要手动保存/恢复 |
| 用户体验 | ✅ 类似浏览器标签页 | ❌ 窗口切换繁琐 |
| 开发复杂度 | ✅ 只需前端代码 | ❌ 需要 Rust 后端支持 |

## 📝 常见问题

### Q1: iframe 之间会互相影响吗？

**A:** 不会。每个 iframe 有完全独立的：
- 全局变量 (window)
- 文档对象 (document)
- 本地存储 (localStorage)
- 会话存储 (sessionStorage)
- 路由系统
- React/Vue 实例

### Q2: 切换时会重新加载吗？

**A:** 不会。所有 iframe 都一直存在，只是通过 CSS `display` 切换显示/隐藏。这样切换非常快，而且状态会保留。

### Q3: 如何添加新项目？

**A:** 在 `src/projectsConfig.ts` 中添加：

```typescript
{
  id: 'project4',
  name: '项目 4',
  description: '第四个应用项目',
  localPath: 'project4/index.html'
}
```

然后将项目文件放到 `src-tauri/resources/project4/`。

### Q4: 主应用和项目如何通信？

**A:** 使用 `postMessage` API：

```tsx
// 主应用发送消息
const iframe = iframeRefs.current['studio'];
iframe?.contentWindow?.postMessage({ theme: 'dark' }, '*');

// 项目接收消息
window.addEventListener('message', (event) => {
  if (event.data.theme) {
    // 切换主题
  }
});
```

### Q5: 为什么不用懒加载？

**A:** 当前实现是**预加载**策略，所有 iframe 一开始就加载。这样切换非常快，用户体验最好。

如果想用懒加载（节省内存），可以改为：

```tsx
// 只渲染当前选中的 iframe
{currentProject && (
  <iframe
    key={currentProject}
    src={`myapp://${currentProject}/`}
  />
)}
```

缺点是切换时会重新加载，状态会丢失。

## 🧪 测试清单

- [ ] 点击 Studio 按钮 → 加载 Studio 项目
- [ ] 点击项目2按钮 → 切换到项目2
- [ ] 点击项目3按钮 → 切换到项目3
- [ ] 在 Studio 中操作 → 切换到项目2 → 再切回 Studio → 状态保持
- [ ] 顶部按钮高亮显示正确
- [ ] 底部状态栏显示正确
- [ ] 加载动画正常显示和隐藏
- [ ] 欢迎页面显示正常
- [ ] 项目卡片 hover 效果正常
- [ ] 所有项目的路由正常工作
- [ ] CSS/JS 资源正常加载

## 🎉 总结

现在您的应用使用**单窗口 + iframe 隔离**方案：

✅ **三个项目在同一个窗口中**
✅ **顶部导航栏快速切换**
✅ **完全隔离，互不影响**
✅ **状态自动保持**
✅ **用户体验优秀**
✅ **实现简单，无需改后端**

立即测试：
```bash
pnpm tauri dev
```

享受流畅的单窗口多项目体验！🚀
