import React, { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import './index.css';

// 定义组件的 Props 接口
interface BrowserNavbarProps {
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
  onNavigate?: (url: string, action?: NavigationAction) => void;
}

// 定义导航动作类型
type NavigationAction = 'back' | 'forward' | 'refresh' | 'home';

const BrowserNavbar: React.FC<BrowserNavbarProps> = ({
  initialUrl = 'http://localhost:1420/',
  onUrlChange,
  onNavigate
}) => {
  const [url, setUrl] = useState<string>(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // 验证 URL 格式
  const validateUrl = useCallback((urlString: string): string | false => {
    if (!urlString) return false;

    let processedUrl = urlString.trim();

    // 如果用户没有输入协议，自动添加 https://
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = 'https://' + processedUrl;
    }

    try {
      // 验证 URL 格式
      new URL(processedUrl);
      return processedUrl;
    } catch {
      return false;
    }
  }, []);

  // 处理 URL 提交
  const handleSubmit = useCallback((e: FormEvent): void => {
    e.preventDefault();
    const validatedUrl = validateUrl(url);

    if (validatedUrl) {
      setIsValidUrl(true);

      // 更新历史记录
      setHistory(prev => {
        const newHistory = [...prev.slice(0, historyIndex + 1), validatedUrl];
        return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
      setUrl(validatedUrl);

      // 触发回调
      onUrlChange?.(validatedUrl);
      onNavigate?.(validatedUrl);
    } else {
      setIsValidUrl(false);
    }
  }, [url, historyIndex, validateUrl, onUrlChange, onNavigate]);

  // 后退功能
  const handleBack = useCallback((): void => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newUrl = history[newIndex];
      setUrl(newUrl);
      onUrlChange?.(newUrl);
      onNavigate?.(newUrl, 'back');
    }
  }, [historyIndex, history, onUrlChange, onNavigate]);

  // 前进功能
  const handleForward = useCallback((): void => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newUrl = history[newIndex];
      setUrl(newUrl);
      onUrlChange?.(newUrl);
      onNavigate?.(newUrl, 'forward');
    }
  }, [historyIndex, history, onUrlChange, onNavigate]);

  // 刷新功能 - 实际导航到当前 URL
  const handleRefresh = useCallback((): void => {
    onNavigate?.(url, 'refresh');
    // 触发导航回调，让父组件处理刷新
    onUrlChange?.(url);
  }, [url, onNavigate, onUrlChange]);

  // 主页功能
  const handleHome = useCallback((): void => {
    const homeUrl = 'http://localhost:1420/';
    setUrl(homeUrl);

    setHistory(prev => [...prev.slice(0, historyIndex + 1), homeUrl]);
    setHistoryIndex(prev => prev + 1);

    onUrlChange?.(homeUrl);
    onNavigate?.(homeUrl, 'home');
  }, [historyIndex, onUrlChange, onNavigate]);

  // 清除输入
  const handleClear = useCallback((): void => {
    setUrl('');
    inputRef.current?.focus();
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ctrl+L 或 Cmd+L 聚焦地址栏
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      // F5 刷新
      else if (e.key === 'F5') {
        e.preventDefault();
        handleRefresh();
      }
      // Alt+左箭头 后退
      else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
      // Alt+右箭头 前进
      else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh, handleBack, handleForward]);

  // 是否可以后退/前进
  const canGoBack: boolean = historyIndex > 0;
  const canGoForward: boolean = historyIndex < history.length - 1;

  return (
    <div className="browser-navbar">
      <div className="navbar-left">
        {/* 后退按钮 */}
        <button
          className={`nav-button ${!canGoBack ? 'disabled' : ''}`}
          onClick={handleBack}
          title="后退 (Alt+←)"
          disabled={!canGoBack}
          aria-label="后退"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* 前进按钮 */}
        <button
          className={`nav-button ${!canGoForward ? 'disabled' : ''}`}
          onClick={handleForward}
          title="前进 (Alt+→)"
          disabled={!canGoForward}
          aria-label="前进"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        {/* 刷新按钮 */}
        <button
          className="nav-button"
          onClick={handleRefresh}
          title="刷新 (F5)"
          aria-label="刷新"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4v5h5" />
            <path d="M20 20v-5h-5" />
            <path d="M5 9a7 7 0 0 1 12.17-4.17" />
            <path d="M19 15a7 7 0 0 1-12.17 4.17" />
          </svg>
        </button>

        {/* 主页按钮 */}
        <button
          className="nav-button"
          onClick={handleHome}
          title="主页"
          aria-label="主页"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
      </div>

      {/* 地址栏 */}
      <form className="url-bar-container" onSubmit={handleSubmit} role="search">
        <div className="url-input-wrapper">
          <input
            ref={inputRef}
            //不要边框 显示
            style={{
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              borderRadius: '0',
              padding: '0',
              margin: '0',
              fontSize: '14px',
              color: '#202124',
            }}
            type="text"
            className={`url-input ${!isValidUrl ? 'error' : ''}`}
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUrl(e.target.value);
              setIsValidUrl(true);
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              // Enter 键提交
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as any);
              }
              // Escape 键清除
              if (e.key === 'Escape') {
                handleClear();
              }
            }}
            placeholder="输入网址或搜索"
            title="地址栏 (Ctrl+L 聚焦, Enter 转到)"
            aria-label="网址"
            spellCheck="false"
            autoCorrect="off"
            autoCapitalize="off"
          />

          {/* 清除按钮 */}
          {url && (
            <button
              type="button"
              className="clear-button"
              onClick={handleClear}
              title="清除 (Esc)"
              aria-label="清除输入"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* 错误提示 */}
      {!isValidUrl && (
        <div className="error-message" role="alert">
          请输入有效的网址（如：example.com 或 https://example.com）
        </div>
      )}
    </div>
  );
};

export default BrowserNavbar;
