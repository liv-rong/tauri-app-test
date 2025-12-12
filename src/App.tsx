import { useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import "./App.css";
import { projects, ProjectConfig } from './projectsConfig';

function App() {
  // 当前选中的项目
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  // 加载状态
  const [loading, setLoading] = useState<string | null>(null);

  // 打开项目
  const openProject = async (project: ProjectConfig) => {
    console.log('🚀 正在切换项目:', project.name);
    setLoading(project.id);

    try {
      // 记录当前项目用于按钮样式
      setCurrentProject(project.id);

      // 获取目标项目的 URL 并导航（单 WebView 方案：直接切换主窗口 URL）
      const url = await invoke<string>('get_project_url', { projectId: project.id });
      window.location.href = url;
    } catch (error) {
      console.error('❌ 切换项目失败:', error);
    } finally {
      setLoading(null);
    }
  };


  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* 顶部导航栏 */}
      <nav style={{
        padding: '10px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexShrink: 0
      }}>
        {/* 项目切换按钮 */}
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => openProject(project)}
              disabled={loading === project.id}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                cursor: loading === project.id ? 'wait' : 'pointer',
                background: currentProject === project.id
                  ? 'white'
                  : 'rgba(255, 255, 255, 0.2)',
                color: currentProject === project.id
                  ? '#667eea'
                  : 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: currentProject === project.id
                  ? '0 4px 15px rgba(0, 0, 0, 0.2)'
                  : 'none',
                transform: currentProject === project.id
                  ? 'translateY(-2px)'
                  : 'none'
              }}
              onMouseEnter={(e) => {
                if (currentProject !== project.id && loading !== project.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentProject !== project.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }
              }}
            >
              {loading === project.id ? '⏳ 加载中...' : project.name}
            </button>
          ))}
        </div>
      </nav>




      {/* WebView 容器 */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: '#f5f5f5',
          overflow: 'hidden'
        }}
      >
        {
          // 欢迎页面
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px'
            }}>
              🚀
            </div>
            <h2 style={{
              fontSize: '32px',
              color: '#333',
              marginBottom: '10px'
            }}>
              欢迎使用项目管理器
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#666',
              marginBottom: '40px'
            }}>
              点击上方按钮选择一个项目开始
            </p>

            {/* 项目卡片 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              width: '100%',
              maxWidth: '1200px'
            }}>
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => openProject(project)}
                  style={{
                    padding: '30px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <h3 style={{
                    fontSize: '24px',
                    color: '#667eea',
                    marginBottom: '10px'
                  }}>
                    {project.name}
                  </h3>
                  <p style={{
                    fontSize: '16px',
                    color: '#666',
                    lineHeight: '1.5'
                  }}>
                    {project.description}
                  </p>
                  <div style={{
                    marginTop: '20px',
                    fontSize: '14px',
                    color: '#999'
                  }}>
                    点击打开 →
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      </div>


    </div>
  );
}

export default App;
