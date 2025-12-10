/**
 * 在项目页面加载后注入路径修复脚本
 * 这个方法会在项目页面加载时被调用
 */
export function injectPathFixerScript() {
  // 检查是否已经注入
  if (document.getElementById('tauri-path-fixer')) {
    return;
  }

  // 创建 script 标签
  const script = document.createElement('script');
  script.id = 'tauri-path-fixer';
  script.textContent = `
    (function() {
      'use strict';

      // 只在项目页面中执行
      function isProjectPage() {
        const pathname = window.location.pathname;
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;

        if (hostname === 'localhost' && (window.location.port === '1420' || window.location.port === '')) {
          return false;
        }

        return pathname.includes('/projects/') ||
               pathname.includes('/studio/') ||
               pathname.includes('/project2/') ||
               pathname.includes('/project3/') ||
               protocol === 'tauri:';
      }

      if (!isProjectPage()) {
        return;
      }

      // 修复资源路径
      function fixResourcePath(url) {
        if (url && url.startsWith('/') && !url.startsWith('//')) {
          return url.substring(1);
        }
        return url;
      }

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

      function fixExistingResources() {
        document.querySelectorAll('link[href]').forEach(link => {
          fixElement(link, 'href');
        });
        document.querySelectorAll('script[src]').forEach(script => {
          fixElement(script, 'src');
        });
        document.querySelectorAll('img[src]').forEach(img => {
          fixElement(img, 'src');
        });
      }

      function setupMutationObserver() {
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node;
                if (element.tagName === 'LINK' && element.hasAttribute('href')) {
                  fixElement(element, 'href');
                }
                if (element.tagName === 'SCRIPT' && element.hasAttribute('src')) {
                  fixElement(element, 'src');
                }
                if (element.tagName === 'IMG' && element.hasAttribute('src')) {
                  fixElement(element, 'src');
                }
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
        observer.observe(document.head, { childList: true, subtree: true });
        observer.observe(document.body, { childList: true, subtree: true });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          fixExistingResources();
          setupMutationObserver();
        });
      } else {
        fixExistingResources();
        setupMutationObserver();
      }

      console.log('[PathFixer] 路径修复脚本已加载');
    })();
  `;

  // 注入到 head
  document.head.appendChild(script);
}

