/**
 * 自定义 HTTP 服务器（单项目服务器）
 * 支持路径重写，解决项目中的绝对路径问题
 * 运行: node server.js [port] [projectPath]
 * 例如: node server.js 5174 studio/dist
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从命令行参数获取端口和项目路径
const PORT = process.argv[2] ? parseInt(process.argv[2]) : 5174;
const PROJECT_RELATIVE_PATH = process.argv[3] || 'studio/dist';
const PROJECTS_DIR = path.join(__dirname, 'projects');
const PROJECT_DIR = path.join(PROJECTS_DIR, PROJECT_RELATIVE_PATH);

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
// 多端口模式下，每个项目在根路径，所以 base href 就是 /
const pathFixerScript = `
<script>
(function() {
  'use strict';
  const isTauriAsset = window.location.protocol === 'tauri:';
  // 支持多个端口：5174, 5175, 5176
  const isHttpServer = window.location.hostname === 'localhost' &&
                       ['5174', '5175', '5176'].includes(window.location.port);

  if (!isTauriAsset && !isHttpServer) return;

  console.log('[PathFixer] 检测到项目页面，开始修复路径 (端口:', window.location.port, ')');

  // 多端口模式下，base href 就是根路径
  const baseDir = '/';

  function fixResourcePath(url) {
    if (!url) return url;
    // 多端口模式下，绝对路径就是相对于项目根目录
    // 例如：/_expo/static/css/... 保持不变（因为每个项目在根路径）
    return url;
  }

  function fixElement(element, attribute) {
    const value = element.getAttribute(attribute);
    if (value) {
      // 多端口模式下，路径不需要修改
      // 但为了兼容性，仍然检查
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

// 返回主页按钮（在服务器端注入到项目页面）
const backButton = `
<div id="tauri-back-button" style="position: fixed; top: 10px; left: 10px; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <button id="tauri-back-btn"
          style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
          "
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)'">
    ← 返回主页
  </button>
  <script>
    (function() {
      const btn = document.getElementById('tauri-back-btn');
      if (btn) {
        btn.onclick = function() {
          const protocol = window.location.protocol;
          const hostname = window.location.hostname;

          let homeUrl;
          if (protocol === 'tauri:') {
            homeUrl = 'tauri://localhost';
          } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
            homeUrl = 'http://localhost:1420/';
          } else {
            homeUrl = protocol + '//' + hostname + (window.location.port ? ':' + window.location.port : '') + '/';
          }

          console.log('[BackButton] 返回主页:', homeUrl);
          window.location.href = homeUrl;
        };
      }
    })();
  </script>
</div>
`;

// 处理 HTML 文件：注入 base 标签、路径修复脚本和返回按钮
function processHtml(content, urlPath) {
  // 多端口模式下，每个项目在根路径，所以 base href 就是根路径
  const baseHref = '/';

  // 检查是否已经包含 base 标签或路径修复脚本
  const alreadyProcessed = content.includes('<base') || content.includes('PathFixer');

  // 注入 base 标签和路径修复脚本（如果还没有）
  if (!alreadyProcessed) {
    const headMatch = content.match(/<head[^>]*>/i);
    if (headMatch) {
      const headTag = headMatch[0];
      const injection = `<base href="${baseHref}">${pathFixerScript}`;
      content = content.replace(headTag, headTag + injection);
    } else {
      const htmlMatch = content.match(/<html[^>]*>/i);
      if (htmlMatch) {
        content = content.replace(htmlMatch[0], htmlMatch[0] + `<head><base href="${baseHref}">${pathFixerScript}</head>`);
      }
    }
  }

  // 注入返回按钮（如果还没有）
  if (!content.includes('tauri-back-button')) {
    const bodyMatch = content.match(/<body[^>]*>/i);
    if (bodyMatch) {
      const bodyTag = bodyMatch[0];
      content = content.replace(bodyTag, bodyTag + backButton);
    } else {
      const headCloseMatch = content.match(/<\/head>/i);
      if (headCloseMatch) {
        content = content.replace(headCloseMatch[0], headCloseMatch[0] + `<body>${backButton}`);
      }
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

function resolvePath(urlPath) {
  // 移除查询参数和 hash
  const cleanPath = urlPath.split('?')[0].split('#')[0];

  // 多端口模式下，每个服务器只服务一个项目
  // 所有路径都相对于 PROJECT_DIR（项目的 dist 目录）

  // 处理绝对路径（以 / 开头）
  // 例如：/_expo/static/css/... -> PROJECT_DIR/_expo/static/css/...
  if (cleanPath.startsWith('/')) {
    const resourcePath = path.join(PROJECT_DIR, cleanPath.substring(1));
    if (fs.existsSync(resourcePath)) {
      console.log(`  ✓ 找到资源: ${cleanPath} -> ${resourcePath}`);
      return resourcePath;
    } else {
      console.log(`  ✗ 未找到资源: ${cleanPath} (在 ${PROJECT_DIR})`);
      return null;
    }
  }

  // 处理相对路径
  // 例如：index.html -> PROJECT_DIR/index.html
  const fullPath = path.join(PROJECT_DIR, cleanPath);

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
  console.log(`[${req.method}] ${urlPath}`);

  try {
    const filePath = resolvePath(urlPath);

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
  console.log(`🚀 Project Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${PROJECT_DIR}`);
  console.log(`📦 Project: ${PROJECT_RELATIVE_PATH}\n`);
});
