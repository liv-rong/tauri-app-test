# 修复自定义协议路径解析问题

## 问题描述

之前的实现在加载资源时出现 404 错误：

```
❌ Failed to load: myapp://studio/_expo/static/css/theme.css
```

实际文件路径应该是：
```
/Users/rwr/repo/tauri-app-test/src-tauri/resources/studio/dist/_expo/static/css/theme.css
```

## 问题原因

1. 我们加载的主页面是：`myapp://studio/dist/index.html`
2. HTML 中的资源使用了**绝对路径**：`/_expo/static/css/theme.css`
3. 浏览器将其解析为：`myapp://studio/_expo/static/css/theme.css`
4. 协议处理器直接拼接路径：`resources/studio/_expo/static/css/theme.css` ❌
5. 但实际文件在：`resources/studio/dist/_expo/static/css/theme.css` ✅

**缺少了 `dist/` 目录！**

## 解决方案

修改自定义协议处理器，智能检测并添加 `dist/` 前缀：

### 修复前的逻辑

```rust
// ❌ 直接使用路径，缺少 dist/
let path = "studio/_expo/static/css/theme.css";
let file_path = resource_dir.join(path);
// 结果: resources/studio/_expo/static/css/theme.css (404)
```

### 修复后的逻辑

```rust
// ✅ 智能检测并添加 dist/
let path = "studio/_expo/static/css/theme.css";

// 1. 分离项目名和文件路径
let parts: Vec<&str> = path.splitn(2, '/').collect();
let project_name = "studio";
let file_path = "_expo/static/css/theme.css";

// 2. 如果文件路径不以 "dist/" 开头，自动添加
let file_path = if !file_path.starts_with("dist/") {
    format!("dist/{}", file_path)  // "dist/_expo/static/css/theme.css"
} else {
    file_path.to_string()
};

// 3. 重新组合完整路径
let final_path = format!("{}/{}", project_name, file_path);
// 结果: "studio/dist/_expo/static/css/theme.css" ✅
```

## 路径解析示例

### 示例 1: 主页面加载

```
请求: myapp://studio/dist/index.html
解析后: studio/dist/index.html
项目名: studio
文件路径: dist/index.html
检查: 已包含 "dist/"，不需要添加
最终路径: studio/dist/index.html
物理路径: resources/studio/dist/index.html ✅
```

### 示例 2: CSS 文件（绝对路径）

```
请求: myapp://studio/_expo/static/css/theme.css
解析后: studio/_expo/static/css/theme.css
项目名: studio
文件路径: _expo/static/css/theme.css
检查: 不包含 "dist/"，需要添加
添加后: dist/_expo/static/css/theme.css
最终路径: studio/dist/_expo/static/css/theme.css
物理路径: resources/studio/dist/_expo/static/css/theme.css ✅
```

### 示例 3: JS 文件（绝对路径）

```
请求: myapp://studio/_expo/static/js/web/index-abc.js
解析后: studio/_expo/static/js/web/index-abc.js
项目名: studio
文件路径: _expo/static/js/web/index-abc.js
检查: 不包含 "dist/"，需要添加
添加后: dist/_expo/static/js/web/index-abc.js
最终路径: studio/dist/_expo/static/js/web/index-abc.js
物理路径: resources/studio/dist/_expo/static/js/web/index-abc.js ✅
```

### 示例 4: 图片文件

```
请求: myapp://studio/assets/logo.png
解析后: studio/assets/logo.png
项目名: studio
文件路径: assets/logo.png
检查: 不包含 "dist/"，需要添加
添加后: dist/assets/logo.png
最终路径: studio/dist/assets/logo.png
物理路径: resources/studio/dist/assets/logo.png ✅
```

### 示例 5: Project2（不同项目）

```
请求: myapp://project2/assets/style.css
解析后: project2/assets/style.css
项目名: project2
文件路径: assets/style.css
检查: 不包含 "dist/"，需要添加
添加后: dist/assets/style.css
最终路径: project2/dist/assets/style.css
物理路径: resources/project2/dist/assets/style.css ✅
```

## 核心代码

```rust
// 解析项目名称和文件路径
let parts: Vec<&str> = path.splitn(2, '/').collect();
let project_name = parts.get(0).unwrap_or(&"");
let file_path = parts.get(1).unwrap_or(&"");

println!("📦 项目名称: {}", project_name);
println!("📄 文件路径: {}", file_path);

// 如果文件路径不是以 "dist/" 开头，说明是从 HTML 中引用的资源（使用了绝对路径）
// 需要在文件路径前添加 "dist/"
let file_path = if !file_path.starts_with("dist/") && !file_path.is_empty() {
    format!("dist/{}", file_path)
} else {
    file_path.to_string()
};

// 重新组合完整路径
let final_path = format!("{}/{}", project_name, file_path);
println!("🎯 最终路径: {}", final_path);
```

## 调试日志示例

修复后，当加载资源时会看到：

```
🔗 收到自定义协议请求: myapp://studio/_expo/static/css/theme.css
📂 解析后的路径: studio/_expo/static/css/theme.css
📦 项目名称: studio
📄 文件路径: _expo/static/css/theme.css
🎯 最终路径: studio/dist/_expo/static/css/theme.css
📁 完整文件路径: "/Users/rwr/repo/tauri-app-test/src-tauri/resources/studio/dist/_expo/static/css/theme.css"
✅ 文件读取成功，大小: 1234 bytes
📝 Content-Type: text/css
```

## 支持的路径格式

✅ `myapp://studio/dist/index.html` - 直接指定 dist
✅ `myapp://studio/_expo/static/css/theme.css` - 绝对路径（自动添加 dist/）
✅ `myapp://studio/assets/logo.png` - 相对路径（自动添加 dist/）
✅ `myapp://project2/dist/index.html` - 其他项目
✅ `myapp://project3/assets/style.css` - 其他项目资源

## 适用场景

这个修复适用于以下场景：

1. **Expo/React Native Web 项目** - 使用 `_expo` 目录结构
2. **Vite 项目** - 使用 `assets` 目录
3. **Webpack 项目** - 使用绝对路径引用资源
4. **任何使用绝对路径的前端框架**

## 测试验证

```bash
# 重新编译
cargo build

# 启动应用
cd /Users/rwr/repo/tauri-app-test
pnpm tauri dev

# 点击 "Studio 项目" 按钮
# 应该看到：
# ✅ 主页加载成功
# ✅ CSS 文件加载成功
# ✅ JS 文件加载成功
# ✅ 图片文件加载成功
# ✅ 字体文件加载成功
```

## 总结

通过智能检测并自动添加 `dist/` 前缀，自定义协议现在可以正确处理：

- ✅ 直接指定 dist 的路径
- ✅ HTML 中使用绝对路径的资源引用
- ✅ 不同项目的资源文件
- ✅ 所有文件类型（HTML、CSS、JS、图片、字体等）

现在您可以正常使用自定义协议 `myapp://` 加载所有项目了！🎉
