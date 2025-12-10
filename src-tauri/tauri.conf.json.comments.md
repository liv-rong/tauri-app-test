# tauri.conf.json 配置说明（带中文注释）

```json
{
  // JSON Schema 定义文件，用于 IDE 自动补全和验证配置格式
  "$schema": "https://schema.tauri.app/config/2",
  
  // 应用程序的产品名称，会显示在窗口标题栏和系统信息中
  "productName": "tauri-app-test",
  
  // 应用程序版本号，遵循语义化版本规范（主版本.次版本.修订号）
  "version": "0.1.0",
  
  // 应用程序的唯一标识符，用于系统注册和区分不同应用（格式：反向域名）
  "identifier": "com.rwr.tauri-app-test",
  
  // 构建相关配置
  "build": {
    // 开发模式启动前执行的命令，用于启动前端开发服务器
    "beforeDevCommand": "pnpm dev",
    
    // 开发模式下的前端服务器地址，Tauri 会加载这个 URL
    "devUrl": "http://localhost:1420",
    
    // 生产构建前执行的命令，用于构建前端资源
    "beforeBuildCommand": "pnpm build",
    
    // 前端构建产物的输出目录，相对于 tauri.conf.json 所在目录
    "frontendDist": "../dist"
  },
  
  // 应用程序运行时配置
  "app": {
    // 窗口配置数组，可以配置多个窗口
    "windows": [
      {
        // 窗口标题栏显示的文字
        "title": "tauri-app-test",
        
        // 窗口初始宽度（像素）
        "width": 800,
        
        // 窗口初始高度（像素）
        "height": 600
      }
    ],
    
    // 安全策略配置
    "security": {
      // 内容安全策略（CSP），null 表示不设置 CSP 限制
      "csp": null,
      
      // 资源协议配置，用于控制本地文件的访问权限
      "assetProtocol": {
        // 是否启用 asset:// 协议来加载本地资源文件
        "enable": true,
        
        // 允许访问的资源路径范围，使用 $RESOURCE 变量表示资源目录
        "scope": [
          // 允许访问所有资源目录下的所有文件（递归）
          "$RESOURCE/**",
          // 同上，另一种写法
          "$RESOURCE/**/*",
          // 重复配置（可以删除）
          "$RESOURCE/**",
          // 允许访问 studio 项目目录下的所有文件
          "$RESOURCE/studio/**",
          // 允许访问 project2 项目目录下的所有文件
          "$RESOURCE/project2/**",
          // 允许访问 project3 项目目录下的所有文件
          "$RESOURCE/project3/**"
        ]
      }
    },
    
    // 是否在全局作用域暴露 Tauri API，true 表示可以通过 window.__TAURI__ 访问
    "withGlobalTauri": true
  },
  
  // 打包配置
  "bundle": {
    // 是否启用打包功能，true 表示会生成可执行文件安装包
    "active": true,
    
    // 打包目标平台，"all" 表示打包所有支持的平台（Windows、macOS、Linux）
    "targets": "all",
    
    // 应用程序图标文件列表，不同尺寸用于不同场景
    "icon": [
      // 32x32 像素图标（小图标）
      "icons/32x32.png",
      // 128x128 像素图标（中等图标）
      "icons/128x128.png",
      // 128x128@2x 高分辨率图标（Retina 显示屏）
      "icons/128x128@2x.png",
      // macOS 图标文件格式
      "icons/icon.icns",
      // Windows 图标文件格式
      "icons/icon.ico"
    ],
    
    // 需要打包到应用程序中的资源文件列表（相对于 src-tauri 目录）
    "resources": [
      // 打包 studio 项目的整个目录（递归包含所有子文件和文件夹）
      "resources/studio",
      // 打包 project2 项目的整个目录
      "resources/project2",
      // 打包 project3 项目的整个目录（末尾的斜杠不影响）
      "resources/project3/"
    ]
  },
  
  // 插件配置
  "plugins": {
    // 窗口管理插件配置
    "window": {
      // 是否启用所有窗口相关功能
      "all": true,
      // 是否允许创建新窗口
      "create": true
    }
  }
}
```

