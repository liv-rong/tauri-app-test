import { useState } from "react";
import "./App.css";
import BrowserNavbar from './BrowserNavbar';
import { projects, ProjectConfig } from './projectsConfig';

function App() {
  const [loading, setLoading] = useState<string | null>(null);

  const [projectUrl, setProjectUrl] = useState<string | null>(null);

  const handleUrlChange = (newUrl: string): void => {
    console.log('URL 改变为:', newUrl);
    // 外部 http/https 直接新窗口打开；其余（tauri:// 或 file）内嵌 iframe 展示
    if (newUrl.startsWith('http://') || newUrl.startsWith('https://')) {
      window.open(newUrl, '_blank');
    } else {
      setProjectUrl(newUrl);
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

  // 打开项目（直接使用 HTTP URL）
  const openProject = async (project: ProjectConfig) => {
    try {
      setLoading(project.id);
      console.log('正在打开项目:', project.name);

      // 直接使用内嵌服务器的 HTTP URL
      const projectUrl = project.path;
      console.log('项目 URL:', projectUrl);

      // 在页面内用 iframe 内嵌项目
      setProjectUrl(projectUrl);
      setLoading(null);
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

      {projectUrl ? (
        <div
          style={{
            marginTop: 24,
            width: '100%',
            height: '720px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            background: '#f8fafc'
          }}
        >
          <iframe
            title="project-frame"
            src={projectUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          />
        </div>
      ) : (
        <div style={{ marginTop: 24, color: '#64748b' }}>
          请选择上方的项目以加载对应资源
        </div>
      )}

      {/* 浏览器导航栏 */}
      <div style={{ marginTop: '30px' }}>
        <BrowserNavbar
          initialUrl="http://localhost:1420/"
          onUrlChange={handleUrlChange}
          onNavigate={handleNavigate}
        />
      </div>
    </main>
  );
}

export default App;
