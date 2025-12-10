# 多端口架构方案说明

## 🎯 架构设计

每个项目使用**独立端口**，完全隔离，更接近 Flutter + WebView2 的架构。

```
主应用 (localhost:1420)
    ↓
项目选择
    ↓
┌─────────────────────────────────────┐
│ Studio 项目  →  localhost:5174      │ ← 独立服务器
│ Project 2    →  localhost:5175      │ ← 独立服务器
│ Project 3    →  localhost:5176      │ ← 独立服务器
└─────────────────────────────────────┘
```

## 📋 端口分配

| 项目 | 端口 | 路径 |
|------|------|------|
| Studio | 5174 | `studio/dist` |
| Project 2 | 5175 | `project2/dist` |
| Project 3 | 5176 | `project3/dist` |

## 🔧 实现细节

### 1. 项目配置 (`src/projectsConfig.ts`)

每个项目配置了独立的端口：

```typescript
{
  id: 'studio',
  port: 5174,  // 独立端口
  path: 'studio/dist/index.html',
}
```

### 2. 服务器架构

- **`server.js`**: 单项目服务器，接收端口和项目路径参数
- **`servers-manager.js`**: 服务器管理器，为每个项目启动独立服务器

### 3. 启动方式

```bash
pnpm dev
```

这会启动：
- 主应用服务器：`localhost:1420`
- Studio 服务器：`localhost:5174`
- Project 2 服务器：`localhost:5175`
- Project 3 服务器：`localhost:5176`

## ✨ 优势

### ✅ 完全隔离
- 每个项目有独立的 HTTP 服务器
- 资源路径更简单（每个项目在根路径）
- 不会互相干扰

### ✅ 更接近 Flutter + WebView2
- 每个项目就像独立的 WebView 实例
- 完全隔离的浏览器上下文
- 资源路径处理更简单

### ✅ 不改项目代码
- 服务器端自动处理路径
- 自动注入 base 标签和路径修复脚本
- 自动注入返回按钮

## 🔄 工作流程

```
1. 用户点击项目按钮
   ↓
2. App.tsx: window.location.href = `http://localhost:${project.port}/`
   ↓
3. 浏览器跳转到对应端口的服务器
   ↓
4. server.js 处理请求：
   - 解析资源路径（相对于项目 dist 目录）
   - 注入 <base href="/"> 标签
   - 注入路径修复脚本
   - 注入返回按钮
   ↓
5. 项目正常加载，资源路径正确 ✅
```

## 📝 代码变更

### 修改的文件

1. **`src/projectsConfig.ts`**
   - 添加 `port` 字段到每个项目配置

2. **`src/App.tsx`**
   - 使用 `project.port` 构建项目 URL
   - URL 格式：`http://localhost:${port}/`

3. **`server.js`**
   - 改为单项目服务器
   - 接收端口和项目路径参数
   - 路径解析相对于项目 dist 目录

4. **`servers-manager.js`** (新建)
   - 为每个项目启动独立服务器
   - 管理多个服务器进程

5. **`package.json`**
   - `serve:projects` 改为启动服务器管理器

## 🚀 使用方法

### 开发模式

```bash
pnpm dev
```

这会启动所有服务器：
- 主应用：`http://localhost:1420`
- Studio：`http://localhost:5174`
- Project 2：`http://localhost:5175`
- Project 3：`http://localhost:5176`

### 手动启动单个服务器

```bash
# 启动 Studio 服务器（端口 5174）
node server.js 5174 studio/dist

# 启动 Project 2 服务器（端口 5175）
node server.js 5175 project2/dist

# 启动 Project 3 服务器（端口 5176）
node server.js 5176 project3/dist
```

## 🔍 调试

### 查看服务器日志

每个服务器会输出：
```
🚀 Project Server running on http://localhost:5174
📁 Serving from: /path/to/projects/studio/dist
📦 Project: studio/dist
```

### 资源路径解析

服务器会输出资源查找日志：
```
[GET] /_expo/static/css/theme.css
  ✓ 找到资源: /_expo/static/css/theme.css -> /path/to/projects/studio/dist/_expo/static/css/theme.css
```

## ⚠️ 注意事项

1. **端口冲突**：确保端口 5174、5175、5176 没有被占用
2. **资源路径**：每个项目的资源路径都是相对于项目 dist 目录的
3. **返回按钮**：项目页面会自动显示返回主页按钮

## 🎨 与单端口方案对比

| 特性 | 单端口方案 | 多端口方案 |
|------|-----------|-----------|
| 隔离性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 资源路径 | 需要路径前缀 | 根路径，更简单 |
| 服务器数量 | 1 个 | 3 个 |
| 更接近 Flutter | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 📚 相关文档

- `SINGLE_WINDOW_ANALYSIS.md` - 单窗口方案分析
- `ARCHITECTURE_COMPARISON.md` - 架构对比
- `IMPLEMENTATION_SUMMARY.md` - 实现总结

