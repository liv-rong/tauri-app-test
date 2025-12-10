/**
 * 路径修复脚本 - 内联版本
 * 在项目页面加载时自动修复资源路径
 * 将绝对路径（如 /_expo/...）转换为相对路径
 *
 * 使用方法：在项目 HTML 的 <head> 中添加：
 * <script src="/path-fixer-inline.js"></script>
 *
 * 或者通过其他方式注入此脚本
 */
(function() {
  'use strict';

  // 检查是否需要执行路径修复
  // 1. 使用 tauri:// 协议
  // 2. 或者 sessionStorage 中有修复标记
  const isTauriAsset = window.location.protocol === 'tauri:';
  const shouldFix = sessionStorage.getItem('_tauri_fix_paths') === 'true';

  if (!isTauriAsset && !shouldFix) {
    return; // 不需要修复，不执行
  }

  // 清除标记
  if (shouldFix) {
    sessionStorage.removeItem('_tauri_fix_paths');
  }

  console.log('[PathFixer] 检测到需要修复路径，开始修复');

  // 修复资源路径：将绝对路径转换为相对路径
  function fixResourcePath(url) {
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
  function init() {
    fixExistingResources();
    setupMutationObserver();
    console.log('[PathFixer] 路径修复脚本已初始化');
  }

  // 在 DOM 加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

