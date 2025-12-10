/**
 * 修复项目页面中的资源路径
 * 将绝对路径转换为相对于当前项目目录的路径
 */
export function fixProjectResourcePaths() {
  // 只在项目页面中执行（不是主应用页面）
  if (window.location.pathname.includes('/projects/') ||
      window.location.protocol === 'tauri:') {

    // 获取当前页面的基础路径
    const currentPath = window.location.pathname;
    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));

    // 修复所有使用绝对路径的资源
    const fixResourcePath = (element: HTMLElement, attribute: string) => {
      const value = element.getAttribute(attribute);
      if (value && value.startsWith('/') && !value.startsWith('//')) {
        // 将绝对路径转换为相对路径
        const relativePath = value.substring(1); // 移除开头的 /
        element.setAttribute(attribute, relativePath);
        console.log(`修复路径: ${value} -> ${relativePath}`);
      }
    };

    // 修复 link 标签
    document.querySelectorAll('link[href]').forEach(link => {
      fixResourcePath(link as HTMLElement, 'href');
    });

    // 修复 script 标签
    document.querySelectorAll('script[src]').forEach(script => {
      fixResourcePath(script as HTMLElement, 'src');
    });

    // 修复 img 标签
    document.querySelectorAll('img[src]').forEach(img => {
      fixResourcePath(img as HTMLElement, 'src');
    });

    // 监听动态添加的元素
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // 检查新添加的 link 和 script 标签
            if (element.tagName === 'LINK' && element.hasAttribute('href')) {
              fixResourcePath(element, 'href');
            }
            if (element.tagName === 'SCRIPT' && element.hasAttribute('src')) {
              fixResourcePath(element, 'src');
            }
            if (element.tagName === 'IMG' && element.hasAttribute('src')) {
              fixResourcePath(element, 'src');
            }

            // 递归检查子元素
            element.querySelectorAll('link[href], script[src], img[src]').forEach(el => {
              if (el.tagName === 'LINK') {
                fixResourcePath(el as HTMLElement, 'href');
              } else if (el.tagName === 'SCRIPT') {
                fixResourcePath(el as HTMLElement, 'src');
              } else if (el.tagName === 'IMG') {
                fixResourcePath(el as HTMLElement, 'src');
              }
            });
          }
        });
      });
    });

    // 开始观察
    observer.observe(document.head, { childList: true, subtree: true });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

/**
 * 在页面加载时自动修复路径
 */
export function autoFixPaths() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixProjectResourcePaths);
  } else {
    fixProjectResourcePaths();
  }
}

