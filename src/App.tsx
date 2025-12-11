import { useState } from "react";
import "./App.css";
import BrowserNavbar from './BrowserNavbar';
import { projects, ProjectConfig } from './projectsConfig';
// 导入 Tauri 的 invoke 函数，用于调用 Rust 命令
import { convertFileSrc, invoke } from '@tauri-apps/api/core';

function App() {
  const [loading, setLoading] = useState<string | null>(null);

  const [projectUrl, setProjectUrl] = useState<string | null>(null);

  const handleUrlChange = (newUrl: string): void => {
    console.log('URL 改变为:', newUrl);
    // 外部 http/https 直接新窗口打开；asset:// 协议的内嵌 iframe 展示
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

  // 打开项目（使用独立窗口，避免 iframe 路径问题）
  const openProject = async (project: ProjectConfig) => {
    try {
      setLoading(project.id);
      console.log('🚀 正在打开项目:', project.name);

      // 调用 Rust 命令创建新窗口，传递窗口配置
      await invoke('open_project', {
        projectName: project.id,
        windowConfig: project.windowConfig || null
      });



      console.log('✅ 项目窗口创建成功:', project.name);
      setLoading(null);

    } catch (error) {
      console.error('💥 打开项目失败:', error);
      alert(`打开项目失败: ${error}`);
      setLoading(null);
    }
  };

  // 添加一个测试函数
  const testAssetAccess = () => {
    const testPaths = [
      'studio/dist/index.html',
      '/studio/dist/index.html',
      'resources/studio/dist/index.html'
    ];

    testPaths.forEach(testPath => {
      const testUrl = convertFileSrc(testPath);
      console.log(`Test path: ${testPath} -> ${testUrl}`);
    });
  };

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      {/* 测试按钮 */}
      <button
        onClick={testAssetAccess}
        style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0' }}
      >
        🧪 测试 Asset 路径转换（查看控制台）
      </button>
      {/* <iframe src="project1/dist/index.html"></iframe> */}

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
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
            onLoad={() => {
              console.log('✅ iframe 加载完成:', projectUrl);
              // 尝试访问 iframe 内容，检查是否有错误
              try {
                const iframe = document.querySelector('iframe[title="project-frame"]') as HTMLIFrameElement;
                if (iframe?.contentWindow) {
                  console.log('✅ iframe 内容窗口可访问');
                }
              } catch (e) {
                console.warn('⚠️ 无法访问 iframe 内容（可能是跨域限制）:', e);
              }
            }}
            onError={(e) => {
              console.error('❌ iframe 加载错误:', e);
              console.error('❌ 错误详情:', {
                src: projectUrl,
                error: e
              });
            }}
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
