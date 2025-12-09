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
  initialUrl = 'https://example.com',
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

  // 刷新功能
  const handleRefresh = useCallback((): void => {
    onNavigate?.(url, 'refresh');
    window.location.reload();
  }, [url, onNavigate]);

  // 主页功能
  const handleHome = useCallback((): void => {
    const homeUrl = 'https://www.google.com';
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
          ←
        </button>

        {/* 前进按钮 */}
        <button
          className={`nav-button ${!canGoForward ? 'disabled' : ''}`}
          onClick={handleForward}
          title="前进 (Alt+→)"
          disabled={!canGoForward}
          aria-label="前进"
        >
          →
        </button>

        {/* 刷新按钮 */}
        <button
          className="nav-button"
          onClick={handleRefresh}
          title="刷新 (F5)"
          aria-label="刷新"
        >
          ↻
        </button>

        {/* 主页按钮 */}
        <button
          className="nav-button"
          onClick={handleHome}
          title="主页"
          aria-label="主页"
        >
          🏠
        </button>
      </div>

      {/* 地址栏 */}
      <form className="url-bar-container" onSubmit={handleSubmit} role="search">
        <div className="url-input-wrapper">
          {/* 安全状态指示器 */}
          <div
            className={`security-indicator ${url.startsWith('https://') ? 'secure' : 'insecure'}`}
            title={url.startsWith('https://') ? '连接安全' : '连接不安全'}
            aria-label={url.startsWith('https://') ? '安全连接' : '不安全连接'}
            role="img"
          >
            {url.startsWith('https://') ? '🔒' : '⚠️'}
          </div>

          <input
            ref={inputRef}
            type="text"
            className={`url-input ${!isValidUrl ? 'error' : ''}`}
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUrl(e.target.value);
              setIsValidUrl(true);
            }}
            placeholder="输入网址或搜索"
            title="地址栏 (Ctrl+L 聚焦)"
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
              title="清除"
              aria-label="清除输入"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          className="go-button"
          title="转到"
          aria-label="转到网址"
        >
          →
        </button>
      </form>

      {/* 历史记录指示器 */}
      <div className="history-indicator" aria-label="历史记录位置">
        <span className="history-count" aria-live="polite">
          {historyIndex + 1} / {history.length}
        </span>
      </div>

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
