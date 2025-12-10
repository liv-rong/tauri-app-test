/**
 * 恢复项目 HTML 文件到原始状态
 * 移除所有注入的路径修复脚本和 base 标签
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectsDir = path.join(__dirname, '../projects');

// 查找所有项目的 index.html 文件
function findProjectHtmlFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findProjectHtmlFiles(fullPath));
    } else if (item === 'index.html') {
      files.push(fullPath);
    }
  }

  return files;
}

// 恢复 HTML 文件到原始状态
function restoreHtmlFile(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const originalHtml = html;

  // 移除所有路径修复脚本
  html = html.replace(/<script>[\s\S]*?\[PathFixer\][\s\S]*?<\/script>/g, '');
  html = html.replace(/<script>[\s\S]*?PathFixer[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script>[\s\S]*?路径修复[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script>[\s\S]{0,500}?isTauriAsset[\s\S]{0,2000}?<\/script>/gi, '');

  // 移除 base 标签
  html = html.replace(/<base[^>]*>/gi, '');
  html = html.replace(/<head><base[^>]*>/gi, '<head>');
  html = html.replace(/<head>\s*<base[^>]*>/gi, '<head>');

  // 清理多余的空行
  html = html.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (html !== originalHtml) {
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✓ 已恢复: ${htmlPath}`);
    return true;
  } else {
    console.log(`- 无需恢复: ${htmlPath}`);
    return false;
  }
}

// 主函数
const htmlFiles = findProjectHtmlFiles(projectsDir);
console.log(`找到 ${htmlFiles.length} 个 HTML 文件\n`);

let restoredCount = 0;
for (const file of htmlFiles) {
  if (restoreHtmlFile(file)) {
    restoredCount++;
  }
}

console.log(`\n完成！已恢复 ${restoredCount} 个文件`);

