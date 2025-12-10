/**
 * 自定义 HTTP 服务器
 * 支持路径重写，解决项目中的绝对路径问题
 * 运行: node server.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5174;
const PROJECTS_DIR = path.join(__dirname, 'projects');

// MIME 类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

// 路径修复脚本（在服务器端注入到 HTML 中）
const pathFixerScript = `
<script>
(function() {
  'use strict';
  const isTauriAsset = window.location.protocol === 'tauri:';
  const isHttpServer = window.location.hostname === 'localhost' &&
                       (window.location.port === '5174' || window.location.port === '');

  if (!isTauriAsset && !isHttpServer) return;

  console.log('[PathFixer] 检测到项目页面，开始修复路径');

  const currentPath = window.location.pathname;
  const baseDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

  function fixResourcePath(url) {
    if (!url) return url;
    if (url.startsWith('/') && !url.startsWith('//')) {
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
    if (document.head) {
      document.head.querySelectorAll('link[href]').forEach(link => fixElement(link, 'href'));
      document.head.querySelectorAll('script[src]').forEach(script => fixElement(script, 'src'));
    }
    if (document.body) {
      document.body.querySelectorAll('img[src]').forEach(img => fixElement(img, 'src'));
    }
  }

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

    if (document.head) observer.observe(document.head, { childList: true, subtree: true });
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });

    if (!document.head || !document.body) {
      const checkInterval = setInterval(() => {
        if (document.head && document.body) {
          clearInterval(checkInterval);
          observer.observe(document.head, { childList: true, subtree: true });
          observer.observe(document.body, { childList: true, subtree: true });
          fixExistingResources();
        }
      }, 10);
    }
  }

  fixExistingResources();
  setupMutationObserver();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fixExistingResources();
      console.log('[PathFixer] DOM 加载完成，再次修复路径');
    });
  } else {
    fixExistingResources();
  }

  console.log('[PathFixer] 路径修复脚本已初始化');
})();
</script>
`;

// 处理 HTML 文件：注入 base 标签和路径修复脚本
function processHtml(content, urlPath) {
  // 计算 base href（相对于项目 dist 目录）
  let baseHref = './';
  const match = urlPath.match(/\/(studio|project2|project3)\/dist\//);
  if (match) {
    baseHref = `/${match[1]}/dist/`;
  }

  // 检查是否已经包含 base 标签或路径修复脚本
  if (content.includes('<base') || content.includes('PathFixer')) {
    return content; // 已经处理过，直接返回
  }

  // 在 <head> 标签开始后立即注入 base 标签和路径修复脚本
  const headMatch = content.match(/<head[^>]*>/i);
  if (headMatch) {
    const headTag = headMatch[0];
    const injection = `<base href="${baseHref}">${pathFixerScript}`;
    content = content.replace(headTag, headTag + injection);
  } else {
    // 如果没有 head 标签，在 <html> 后添加
    const htmlMatch = content.match(/<html[^>]*>/i);
    if (htmlMatch) {
      content = content.replace(htmlMatch[0], htmlMatch[0] + `<head><base href="${baseHref}">${pathFixerScript}</head>`);
    }
  }

  return content;
}

function serveFile(filePath, res, urlPath = '') {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    // 如果是目录，尝试查找 index.html
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      serveFile(indexPath, res, urlPath);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Directory listing not allowed');
    }
    return;
  }

  let content = fs.readFileSync(filePath);
  const mimeType = getMimeType(filePath);

  // 如果是 HTML 文件，在服务器端动态处理（不修改源文件）
  if (mimeType === 'text/html') {
    content = Buffer.from(processHtml(content.toString('utf8'), urlPath), 'utf8');
  }

  res.writeHead(200, {
    'Content-Type': mimeType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(content);
}

function resolvePath(urlPath, referer = '') {
  // 移除查询参数和 hash
  const cleanPath = urlPath.split('?')[0].split('#')[0];

  // 处理绝对路径（以 / 开头，但不是项目路径）
  // 例如：/_expo/static/css/... 需要根据 referer 确定项目目录
  if (cleanPath.startsWith('/_expo/') || cleanPath.startsWith('/assets/') ||
      (cleanPath.startsWith('/') && !cleanPath.startsWith('/studio/') &&
       !cleanPath.startsWith('/project2/') && !cleanPath.startsWith('/project3/'))) {

    // 从 referer 中提取项目名称
    let projectName = null;
    if (referer) {
      const refererMatch = referer.match(/\/(studio|project2|project3)\//);
      if (refererMatch) {
        projectName = refererMatch[1];
      }
    }

    // 如果无法从 referer 确定，尝试所有项目
    const projects = projectName ? [projectName] : ['studio', 'project2', 'project3'];

    for (const project of projects) {
      const distPath = path.join(PROJECTS_DIR, project, 'dist', cleanPath.substring(1));
      if (fs.existsSync(distPath)) {
        console.log(`  ✓ 找到资源: ${cleanPath} -> ${distPath}`);
        return distPath;
      }
    }

    // 如果找不到，返回 404 路径
    console.log(`  ✗ 未找到资源: ${cleanPath}`);
    return null;
  }

  // 处理相对路径
  // 例如：/studio/dist/index.html -> projects/studio/dist/index.html
  const relativePath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
  const fullPath = path.join(PROJECTS_DIR, relativePath);

  return fullPath;
}

const server = http.createServer((req, res) => {
  // 处理 OPTIONS 请求（CORS 预检）
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const urlPath = req.url || '/';
  const referer = req.headers.referer || '';
  console.log(`[${req.method}] ${urlPath}${referer ? ` (from: ${referer})` : ''}`);

  try {
    const filePath = resolvePath(urlPath, referer);

    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`File not found: ${urlPath}`);
      return;
    }

    serveFile(filePath, res, urlPath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Projects HTTP Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${PROJECTS_DIR}`);
});

