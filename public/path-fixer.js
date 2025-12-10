/**
 * 路径修复脚本 - 在项目页面加载时自动修复资源路径
 * 将绝对路径转换为相对于当前项目目录的路径
 *
 * 使用方法：在项目 HTML 的 <head> 中添加：
 * <script src="/path-fixer.js"></script>
 *
 * 或者在主应用中动态注入
 */
(function() {
  'use strict';

  // 只在项目页面中执行
  function isProjectPage() {
    const pathname = window.location.pathname;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    // 检查是否是项目页面（包含 projects 路径或使用 tauri 协议）
    // 排除主应用页面（localhost:1420）
    if (hostname === 'localhost' && (window.location.port === '1420' || window.location.port === '')) {
      return false; // 主应用页面
    }

    return pathname.includes('/projects/') ||
           pathname.includes('/studio/') ||
           pathname.includes('/project2/') ||
           pathname.includes('/project3/') ||
           protocol === 'tauri:';
  }

  if (!isProjectPage()) {
    return; // 不是项目页面，不执行
  }

  // 获取当前页面的基础路径
  function getBasePath() {
    const pathname = window.location.pathname;

    // 提取项目目录路径
    // 例如: /studio/dist/index.html -> /studio/dist/
    const match = pathname.match(/\/(studio|project2|project3)\/dist\//);
    if (match) {
      return match[0]; // 返回 /studio/dist/ 或 /project2/dist/ 等
    }

    // 如果匹配不到，尝试从路径中提取
    const parts = pathname.split('/');
    const projectIndex = parts.findIndex(p => ['studio', 'project2', 'project3'].includes(p));
    if (projectIndex !== -1) {
      return '/' + parts.slice(1, projectIndex + 2).join('/') + '/';
    }

    return '/';
  }

  const basePath = getBasePath();

  // 修复资源路径
  function fixResourcePath(url) {
    // 如果是绝对路径（以 / 开头，但不是 //）
    if (url && url.startsWith('/') && !url.startsWith('//')) {
      // 移除开头的 /，使其成为相对路径
      return url.substring(1);
    }
    return url;
  }

  // 修复元素属性
  function fixElement(element, attribute) {
    const value = element.getAttribute(attribute);
    if (value) {
      const fixed = fixResourcePath(value);
      if (fixed !== value) {
        element.setAttribute(attribute, fixed);
        console.log('[PathFixer] 修复路径:', value, '->', fixed);
      }
    }
  }

  // 修复所有现有资源
  function fixExistingResources() {
    // 修复 link 标签
    document.querySelectorAll('link[href]').forEach(link => {
      fixElement(link, 'href');
    });

    // 修复 script 标签
    document.querySelectorAll('script[src]').forEach(script => {
      fixElement(script, 'src');
    });

    // 修复 img 标签
    document.querySelectorAll('img[src]').forEach(img => {
      fixElement(img, 'src');
    });
  }

  // 监听动态添加的元素
  function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;

            // 检查新添加的元素
            if (element.tagName === 'LINK' && element.hasAttribute('href')) {
              fixElement(element, 'href');
            }
            if (element.tagName === 'SCRIPT' && element.hasAttribute('src')) {
              fixElement(element, 'src');
            }
            if (element.tagName === 'IMG' && element.hasAttribute('src')) {
              fixElement(element, 'src');
            }

            // 递归检查子元素
            element.querySelectorAll('link[href], script[src], img[src]').forEach(el => {
              if (el.tagName === 'LINK') {
                fixElement(el, 'href');
              } else if (el.tagName === 'SCRIPT') {
                fixElement(el, 'src');
              } else if (el.tagName === 'IMG') {
                fixElement(el, 'src');
              }
            });
          }
        });
      });
    });

    // 开始观察
    observer.observe(document.head, {
      childList: true,
      subtree: true
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 执行修复
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      fixExistingResources();
      setupMutationObserver();
    });
  } else {
    fixExistingResources();
    setupMutationObserver();
  }

  console.log('[PathFixer] 路径修复脚本已加载，基础路径:', basePath);
})();

