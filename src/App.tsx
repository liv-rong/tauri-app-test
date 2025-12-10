import { useState } from "react";
import { convertFileSrc } from '@tauri-apps/api/core';
import { resolveResource } from '@tauri-apps/api/path';
import "./App.css";
import BrowserNavbar from './BrowserNavbar';
import { projects, ProjectConfig } from './projectsConfig';

function App() {
  const [loading, setLoading] = useState<string | null>(null);
  const handleUrlChange = (newUrl: string): void => {
    console.log('URL 改变为:', newUrl);
    // 如果是外部 URL，在新窗口打开
    if (newUrl.startsWith('http://') || newUrl.startsWith('https://')) {
      // 检查是否是项目 URL（localhost:5174/5175/5176）
      const isProjectUrl = newUrl.match(/http:\/\/localhost:(5174|5175|5176)/);
      if (isProjectUrl) {
        // 项目 URL，在当前窗口跳转
        window.location.href = newUrl;
      } else {
        // 外部 URL，在新窗口打开
        window.open(newUrl, '_blank');
      }
    }
  };

  const handleNavigate = (url: string, action?: 'back' | 'forward' | 'refresh' | 'home'): void => {
    console.log(`导航: ${action || 'direct'} -> ${url}`);
    if (action === 'refresh') {
      // 刷新当前页面
      window.location.reload();
    } else {
      // 其他导航操作
      handleUrlChange(url);
    }
  };

  // 打开项目（使用 window.location.href 在当前窗口跳转）
  const openProject = async (project: ProjectConfig) => {
    try {
      setLoading(project.id);
      console.log('正在打开项目:', project.name);

      let projectUrl: string;

      // 检测是否在开发模式
      const isDev = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'http:';

      if (isDev) {
        // 开发模式：使用独立端口的 HTTP 服务器
        // 每个项目有独立的端口，完全隔离
        const port = project.port || 5174; // 默认端口 5174
        projectUrl = `http://localhost:${port}/`;
        console.log('开发模式 - 使用独立端口:', projectUrl, `(端口: ${port})`);
      } else {
        // 生产模式：使用 resolveResource 解析资源路径
        try {
          const resourcePath = await resolveResource(`projects/${project.path}`);
          projectUrl = convertFileSrc(resourcePath);
          console.log('生产模式 - Resource Path:', resourcePath);
          console.log('生产模式 - Asset URL:', projectUrl);
        } catch (resourceError) {
          console.error('resolveResource 失败:', resourceError);
          throw new Error(`无法解析项目资源路径: ${resourceError}`);
        }
      }

      // 使用 window.location.href 在当前窗口跳转到项目页面
      // 服务器端会自动注入 base 标签和路径修复脚本
      // 类似 Flutter 的 WebView 架构，但使用页面替换方式
      window.location.href = projectUrl;

      // 注意：这里不会执行到，因为页面已经跳转了
      // setLoading(null);
    } catch (error) {
      console.error('打开项目出错:', error);
      alert(`打开项目失败: ${error}`);
      setLoading(null);
    }
  };

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      {/* 项目选择器 */}
      <div style={{ marginBottom: '20px' }}>
        <h2>选择一个项目打开：</h2>
        <div className="row" style={{ gap: 20, flexDirection: 'column', alignItems: 'stretch' }}>
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => openProject(project)}
              disabled={loading === project.id}
              style={{
                padding: '20px',
                fontSize: '16px',
                cursor: loading === project.id ? 'wait' : 'pointer',
                background: loading === project.id
                  ? 'linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '5px' }}>
                {loading === project.id ? '⏳ 加载中...' : '🚀'} {project.name}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {project.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 浏览器导航栏 */}
      <div style={{ marginTop: '30px' }}>
        <BrowserNavbar
          initialUrl="https://www.google.com"
          onUrlChange={handleUrlChange}
          onNavigate={handleNavigate}
        />
      </div>
    </main>
  );
}

export default App;
