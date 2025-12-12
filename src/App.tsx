import { useState, useRef } from "react";
import "./App.css";
import { projects, ProjectConfig } from './projectsConfig';

function App() {
  // 当前选中的项目
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  // 加载状态
  const [loading, setLoading] = useState<string | null>(null);
  // 已加载的项目集合
  const [loadedProjects, setLoadedProjects] = useState<Set<string>>(new Set());
  // iframe refs - 用于保持状态
  const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({});

  // 打开项目（在当前窗口的 iframe 中加载）
  const openProject = (project: ProjectConfig) => {
    console.log('🚀 正在打开项目:', project.name);

    // 如果项目已经加载过，直接切换，不显示 loading
    if (loadedProjects.has(project.id)) {
      console.log('✅ 项目已加载，直接切换:', project.name);
      setCurrentProject(project.id);
    } else {
      // 新项目，显示 loading
      setLoading(project.id);
      setCurrentProject(project.id);
    }
  };

  // iframe 加载完成
  const handleIframeLoad = (projectId: string) => {
    console.log('✅ 项目加载完成:', projectId);

    // 标记项目已加载
    setLoadedProjects(prev => new Set(prev).add(projectId));

    // 清除 loading
    if (projectId === loading) {
      setLoading(null);
    }
  };

  // iframe 加载出错
  const handleIframeError = (projectId: string, error: any) => {
    console.error('❌ 项目加载失败:', projectId, error);
    if (projectId === currentProject) {
      setLoading(null);
    }
    alert(`加载项目失败: ${projectId}`);
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

      {/* iframe 容器 */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: '#f5f5f5',
        overflow: 'hidden'
      }}>
        {currentProject ? (
          // 懒加载策略：只渲染已经访问过的项目
          <>
            {projects
              .filter(project => loadedProjects.has(project.id) || project.id === currentProject)
              .map(project => (
                <iframe
                  key={project.id}
                  ref={(el) => { iframeRefs.current[project.id] = el; }}
                  src={`myapp://${project.id}/`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: currentProject === project.id ? 'block' : 'none',
                    background: 'white'
                  }}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation allow-downloads"
                  onLoad={() => handleIframeLoad(project.id)}
                  onError={(e) => handleIframeError(project.id, e)}
                  title={`${project.name} - 项目窗口`}
                />
              ))}

            {/* 加载遮罩 */}
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
                <p style={{
                  marginTop: '20px',
                  fontSize: '18px',
                  color: '#667eea',
                  fontWeight: '600'
                }}>
                  正在加载项目...
                </p>
              </div>
            )}
          </>
        ) : (
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
        )}
      </div>

      {/* 底部状态栏 */}
      {/* {currentProject && (
        <div style={{
          padding: '10px 20px',
          background: '#2d3748',
          color: 'white',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            当前项目: <strong>{projects.find(p => p.id === currentProject)?.name}</strong>
          </div>
          <div style={{ opacity: 0.7 }}>
            协议: myapp://{currentProject}/
          </div>
        </div>
      )} */}
    </div>
  );
}

export default App;
