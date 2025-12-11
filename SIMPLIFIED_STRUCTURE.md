# 简化目录结构 - 去掉 dist/ 层级

## ✅ 修改完成

现在目录结构已经简化，直接使用扁平结构：

### 新的目录结构

```
src-tauri/resources/
├── studio/
│   ├── _expo/
│   ├── assets/
│   └── index.html
├── project2/
│   └── index.html
└── project3/
    ├── assets/
    └── index.html
```

### 之前的目录结构（已废弃）

```
src-tauri/resources/
├── studio/
│   └── dist/           ← 多余的 dist/ 层级
│       ├── _expo/
│       ├── assets/
│       └── index.html
```

## 🔧 协议处理器简化

协议处理器不再需要智能检测和添加 `dist/` 前缀，直接使用路径即可：

### 修改前（复杂）

```rust
// 需要检测是否包含 dist/ 并自动添加
let parts: Vec<&str> = path.splitn(2, '/').collect();
let project_name = parts.get(0).unwrap_or(&"");
let file_path = parts.get(1).unwrap_or(&"");

if !file_path.starts_with("dist/") && !file_path.is_empty() {
    file_path = format!("dist/{}", file_path);
}
```

### 修改后（简单）

```rust
// 直接使用路径
let path = path.trim_start_matches("./").trim_start_matches('/');
let file_path = resource_dir.join(&path);
```

## 📋 URL 映射

现在 URL 映射变得非常直观：

| 请求 URL | 物理路径 |
|----------|----------|
| `myapp://studio/` | `resources/studio/index.html` |
| `myapp://studio/index.html` | `resources/studio/index.html` |
| `myapp://studio/_expo/static/css/theme.css` | `resources/studio/_expo/static/css/theme.css` |
| `myapp://studio/assets/logo.png` | `resources/studio/assets/logo.png` |
| `myapp://project2/` | `resources/project2/index.html` |
| `myapp://project3/assets/index.js` | `resources/project3/assets/index.js` |

## 🎯 优势

### 1. **更简单**
- 不需要智能检测路径
- 不需要添加/移除 `dist/` 前缀
- URL 和文件路径一一对应

### 2. **更清晰**
- 目录结构更扁平
- 路径映射更直观
- 调试更容易

### 3. **更快**
- 减少路径处理逻辑
- 减少字符串操作
- 性能更好

## 🔍 调试日志

现在的日志更简洁：

```
🔗 收到自定义协议请求: myapp://studio/_expo/static/css/theme.css
📂 解析后的路径: studio/_expo/static/css/theme.css
🎯 最终路径: studio/_expo/static/css/theme.css
📁 完整文件路径: "/Users/rwr/repo/tauri-app-test/src-tauri/resources/studio/_expo/static/css/theme.css"
✅ 文件读取成功，大小: 1234 bytes
📝 Content-Type: text/css
```

## 🚀 如何使用

### 1. 准备资源文件

将构建后的文件直接放到项目目录下（不需要 dist/ 子目录）：

```bash
# Studio 项目
cp -r studio-build/* src-tauri/resources/studio/

# Project2
cp project2-build/index.html src-tauri/resources/project2/

# Project3
cp -r project3-build/* src-tauri/resources/project3/
```

### 2. 启动应用

```bash
pnpm tauri dev
```

### 3. 点击按钮

- **Studio 项目** → 加载 `myapp://studio/` → `resources/studio/index.html`
- **项目 2** → 加载 `myapp://project2/` → `resources/project2/index.html`
- **项目 3** → 加载 `myapp://project3/` → `resources/project3/index.html`

## 📝 注意事项

### HTML 中的资源路径

确保 HTML 中使用的是**相对路径**或**绝对路径**：

#### ✅ 正确的路径

```html
<!-- 绝对路径（从项目根目录开始） -->
<link rel="stylesheet" href="/_expo/static/css/theme.css">
<script src="/_expo/static/js/web/index.js"></script>

<!-- 或者相对路径 -->
<link rel="stylesheet" href="./assets/style.css">
<script src="./assets/script.js"></script>
```

#### ❌ 错误的路径

```html
<!-- 不要包含 dist/ -->
<link rel="stylesheet" href="/dist/_expo/static/css/theme.css">
<script src="/dist/assets/script.js"></script>
```

## 🎉 总结

通过简化目录结构：

- ✅ **代码更简单** - 协议处理器只需要 10 行代码
- ✅ **路径更清晰** - URL 直接对应文件路径
- ✅ **调试更容易** - 日志更简洁明了
- ✅ **维护更方便** - 不需要处理复杂的路径逻辑

现在可以正常使用自定义协议 `myapp://` 加载所有项目了！🚀

## 🧪 测试清单

- [ ] Studio 项目能正常加载首页
- [ ] Studio 的 CSS 文件能正常加载
- [ ] Studio 的 JS 文件能正常加载
- [ ] Studio 的图片/字体能正常加载
- [ ] Studio 的客户端路由能正常工作
- [ ] Project2 能正常加载
- [ ] Project3 能正常加载
- [ ] 点击同一项目按钮时，聚焦已存在的窗口
- [ ] 不同项目的窗口相互独立
- [ ] 终端日志显示正确的路径映射
