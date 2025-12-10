/**
 * 多项目服务器管理器
 * 为每个项目启动独立的 HTTP 服务器
 * 运行: node servers-manager.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目配置
const projects = [
  { id: 'studio', port: 5174, path: 'studio/dist' },
  { id: 'project2', port: 5175, path: 'project2/dist' },
  { id: 'project3', port: 5176, path: 'project3/dist' },
];

console.log('🚀 启动多项目服务器管理器...\n');

const servers = [];

// 为每个项目启动独立的服务器
projects.forEach(project => {
  const serverProcess = spawn('node', [
    path.join(__dirname, 'server.js'),
    project.port.toString(),
    project.path
  ], {
    stdio: 'inherit',
    shell: false
  });

  servers.push({
    project: project.id,
    port: project.port,
    process: serverProcess
  });

  console.log(`✅ ${project.id} 服务器启动在端口 ${project.port}`);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n\n🛑 正在关闭所有服务器...');
  servers.forEach(({ project, process }) => {
    console.log(`  关闭 ${project} 服务器...`);
    process.kill();
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 正在关闭所有服务器...');
  servers.forEach(({ project, process }) => {
    console.log(`  关闭 ${project} 服务器...`);
    process.kill();
  });
  process.exit(0);
});

console.log('\n✨ 所有服务器已启动！');
console.log('   按 Ctrl+C 停止所有服务器\n');

