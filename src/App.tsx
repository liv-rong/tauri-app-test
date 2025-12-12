import { useState, useRef, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import "./App.css";
import { projects, ProjectConfig } from './projectsConfig';

function App() {
  // 当前选中的项目
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  // 加载状态
  const [loading, setLoading] = useState<string | null>(null);
  // 已创建的 WebView 集合
  const [createdWebViews, setCreatedWebViews] = useState<Set<string>>(new Set());
  // 容器引用，用于获取位置和大小
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 获取容器的位置和大小信息
  const getContainerBounds = () => {
    if (!containerRef.current) {
      return { x: 0, y: 60, width: 1000, height: 600 }; // 默认值
    }

    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  };

  // 创建项目窗口
  const createProjectWindow = async (project: ProjectConfig) => {
    try {
      const bounds = getContainerBounds();
      
      await invoke('create_project_window', {
        config: {
          projectId: project.id,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          visible: false // 先创建为隐藏状态
        }
      });
      
      setCreatedWebViews(prev => new Set(prev).add(project.id));
      console.log('✅ 项目窗口创建成功:', project.name);
    } catch (error) {
      console.error('❌ 项目窗口创建失败:', error);
      alert(`创建项目窗口失败: ${error}`);
    }
  };

  // 显示项目窗口
  const showProjectWindow = async (projectId: string) => {
    try {
      const params = { projectId: projectId };
      console.log('调用show_project_window参数:', JSON.stringify(params));
      await invoke('show_project_window', params);
      setCurrentProject(projectId);
      console.log('🔄 项目窗口显示成功:', projectId);
    } catch (error) {
      console.error('❌ 项目窗口显示失败:', error);
      alert(`显示项目窗口失败: ${error}`);
    }
  };

  // 隐藏其他项目窗口
  const hideOtherProjectWindows = async (currentProjectId: string) => {
    try {
      for (const projectId of createdWebViews) {
        if (projectId !== currentProjectId) {
          const params = { projectId: projectId };
          console.log('调用hide_project_window参数:', JSON.stringify(params));
          await invoke('hide_project_window', params);
        }
      }
    } catch (error) {
      console.error('❌ 隐藏其他项目窗口失败:', error);
    }
  };

  // 打开项目
  const openProject = async (project: ProjectConfig) => {
    console.log('🚀 正在打开项目:', project.name);
    setLoading(project.id);

    try {
      // 如果项目窗口还未创建，先创建
      if (!createdWebViews.has(project.id)) {
        await createProjectWindow(project);
      }

      // 隐藏其他项目窗口
      await hideOtherProjectWindows(project.id);

      // 显示当前项目窗口
      await showProjectWindow(project.id);
    } catch (error) {
      console.error('❌ 打开项目失败:', error);
    } finally {
      setLoading(null);
    }
  };

  // 注意：由于我们现在使用的是独立窗口而非单窗口内嵌WebView，
  // 所以不再需要调整大小的功能，每个项目窗口都是独立的
  // 移除以下响应式调整代码

  // 监听窗口大小变化 - 暂时移除，因为使用独立窗口
  // useEffect(() => {
  //   const handleResize = () => {
  //     setTimeout(resizeAllWebViews, 100);
  //   };
  //   window.addEventListener('resize', handleResize);
  //   return () => window.removeEventListener('resize', handleResize);
  // }, [createdWebViews]);

  // 当容器引用变化时 - 暂时移除
  // useEffect(() => {
  //   if (containerRef.current && createdWebViews.size > 0) {
  //     setTimeout(resizeAllWebViews, 100);
  //   }
  // }, [containerRef.current, createdWebViews]);

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
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          background: '#f5f5f5',
          overflow: 'hidden'
        }}
      >
        {currentProject ? (
          <>
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
                  正在创建项目窗口...
                </p>
              </div>
            )}

            {/* WebView 提示 */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(102, 126, 234, 0.9)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              zIndex: 999
            }}>
              🌐 独立窗口: {projects.find(p => p.id === currentProject)?.name}
            </div>
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
