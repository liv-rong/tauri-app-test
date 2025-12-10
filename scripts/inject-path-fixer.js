/**
 * 自动为项目 HTML 文件注入路径修复脚本
 * 运行: node scripts/inject-path-fixer.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectsDir = path.join(__dirname, '../projects');
const pathFixerScript = `
    <script>
    // 立即执行，不等待 DOM 加载
    (function() {
      'use strict';
      // 检查是否是项目页面（Tauri asset 协议或 HTTP 服务器）
      const isTauriAsset = window.location.protocol === 'tauri:';
      const isHttpServer = window.location.hostname === 'localhost' &&
                           (window.location.port === '5174' || window.location.port === '');

      // 只在项目页面执行（排除主应用页面 localhost:1420）
      const isMainApp = window.location.hostname === 'localhost' &&
                        (window.location.port === '1420' || window.location.port === '');

      if (!isTauriAsset && !isHttpServer) return;
      if (isMainApp) return;

      console.log('[PathFixer] 检测到项目页面，立即开始修复路径（协议:', window.location.protocol, '）');

      // 获取当前 HTML 文件所在目录作为基准路径
      const currentPath = window.location.pathname;
      const baseDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

      function fixResourcePath(url) {
        if (!url) return url;

        // 如果是绝对路径（以 / 开头，但不是 //）
        if (url.startsWith('/') && !url.startsWith('//')) {
          // 转换为相对于当前 HTML 文件所在目录的路径
          // 例如：/_expo/static/css/... -> _expo/static/css/...
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
            console.log('[PathFixer] 修复路径:', value, '->', fixed, '(基准目录:', baseDir + ')');
          }
        }
      }

      // 立即修复所有现有资源（不等待 DOM 加载）
      function fixExistingResources() {
        // 使用 document.head 和 document.body，即使它们可能还没完全加载
        if (document.head) {
          document.head.querySelectorAll('link[href]').forEach(link => fixElement(link, 'href'));
          document.head.querySelectorAll('script[src]').forEach(script => fixElement(script, 'src'));
        }
        if (document.body) {
          document.body.querySelectorAll('img[src]').forEach(img => fixElement(img, 'src'));
        }
      }

      // 立即执行一次修复
      fixExistingResources();

      // 监听动态添加的元素
      function setupMutationObserver() {
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node;
                if (element.tagName === 'LINK' && element.hasAttribute('href')) fixElement(element, 'href');
                if (element.tagName === 'SCRIPT' && element.hasAttribute('src')) fixElement(element, 'src');
                if (element.tagName === 'IMG' && element.hasAttribute('src')) fixElement(element, 'src');
                element.querySelectorAll('link[href], script[src], img[src]').forEach(el => {
                  if (el.tagName === 'LINK') fixElement(el, 'href');
                  else if (el.tagName === 'SCRIPT') fixElement(el, 'src');
                  else if (el.tagName === 'IMG') fixElement(el, 'src');
                });
              }
            });
          });
        });

        // 观察 head 和 body
        if (document.head) {
          observer.observe(document.head, { childList: true, subtree: true });
        }
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        }

        // 如果 head 或 body 还没加载，等待它们加载
        if (!document.head || !document.body) {
          const checkInterval = setInterval(() => {
            if (document.head && document.body) {
              clearInterval(checkInterval);
              observer.observe(document.head, { childList: true, subtree: true });
              observer.observe(document.body, { childList: true, subtree: true });
              fixExistingResources(); // 再次修复
            }
          }, 10);
        }
      }

      // 立即设置观察器
      setupMutationObserver();

      // DOM 加载完成后再次修复
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          fixExistingResources();
          console.log('[PathFixer] DOM 加载完成，再次修复路径');
        });
      } else {
        fixExistingResources();
      }

      console.log('[PathFixer] 路径修复脚本已初始化，基准目录:', baseDir);
    })();
    </script>
`;

// 查找所有项目的 index.html 文件
function findProjectHtmlFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findProjectHtmlFiles(fullPath));
    } else if (item.name === 'index.html') {
      files.push(fullPath);
    }
  }

  return files;
}

// 注入路径修复脚本到 HTML 文件
function injectPathFixer(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');

  // 移除旧的路径修复脚本（如果存在）- 使用更宽松的正则表达式
  // 匹配 <script> 到 </script> 之间的所有内容，包含 PathFixer
  html = html.replace(/<script>[\s\S]*?\[PathFixer\][\s\S]*?<\/script>/g, '');
  html = html.replace(/<script>[\s\S]*?PathFixer[\s\S]*?<\/script>/g, '');
  html = html.replace(/<script>[\s\S]*?路径修复[\s\S]*?<\/script>/g, '');

  // 移除旧的 base 标签（如果存在）
  html = html.replace(/<base[^>]*>/g, '');

  // 更彻底的清理：使用正则表达式匹配多行 script 标签
  // 匹配从 <script> 到 </script> 之间的所有内容（包括换行）
  html = html.replace(/<script>[\s\S]*?PathFixer[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script>[\s\S]*?路径修复[\s\S]*?<\/script>/gi, '');

  // 再次检查并清理
  if (html.includes('PathFixer') || html.includes('isTauriAsset')) {
    console.log(`⚠ ${htmlPath} 仍包含旧脚本，进行深度清理`);
    // 使用更精确的正则：匹配包含特定关键字的 script 块
    html = html.replace(/<script>[\s\S]{0,500}?isTauriAsset[\s\S]{0,2000}?<\/script>/gi, '');
  }

  // 在 <head> 标签开始后立即注入脚本，确保在资源加载前执行
  if (html.includes('<head>')) {
    // 在 <head> 标签后立即注入脚本和 base 标签
    // base 标签用于设置相对路径的基准路径
    const baseTag = '<base href="./">';
    html = html.replace('<head>', `<head>${baseTag}${pathFixerScript}`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✓ 已为 ${htmlPath} 注入路径修复脚本和 base 标签（在 head 开始处）`);
  } else if (html.includes('</head>')) {
    // 如果没有 <head> 开始标签，在 </head> 前注入
    html = html.replace('</head>', `${pathFixerScript}\n</head>`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✓ 已为 ${htmlPath} 注入路径修复脚本（在 head 结束处）`);
  } else if (html.includes('</body>')) {
    // 如果没有 </head>，在 </body> 前注入
    html = html.replace('</body>', `${pathFixerScript}\n</body>`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✓ 已为 ${htmlPath} 注入路径修复脚本（注入到 body）`);
  } else {
    console.warn(`⚠ ${htmlPath} 格式异常，无法注入脚本`);
  }
}

// 主函数
function main() {
  console.log('开始为项目 HTML 文件注入路径修复脚本...\n');

  const htmlFiles = findProjectHtmlFiles(projectsDir);

  if (htmlFiles.length === 0) {
    console.log('未找到任何项目的 index.html 文件');
    return;
  }

  htmlFiles.forEach(injectPathFixer);

  console.log(`\n完成！共处理 ${htmlFiles.length} 个文件`);
}

main();

