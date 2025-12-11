// 项目配置
export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  // 本地文件路径（相对于资源目录），例如 "studio/dist/index.html"
  // 前端会使用 convertFileSrc 将其转换为 asset:// 协议的 URL
  localPath: string;
  windowConfig?: {
    width?: number;
    height?: number;
    resizable?: boolean;
    fullscreen?: boolean;
  };
}

export const projects: ProjectConfig[] = [
  {
    id: 'studio',
    name: 'Studio 项目',
    description: '这是 Studio 应用项目（直接加载本地文件，无需 HTTP 服务器）',
    // 相对于资源目录的路径，指向 dist 目录下的 index.html
    localPath: 'studio/dist/index.html',
    windowConfig: {
      width: 1400,
      height: 900,
      resizable: true
    }
  },
  {
    id: 'project2',
    name: '项目 2',
    description: '第二个应用项目（直接加载本地文件，无需 HTTP 服务器）',
    // 相对于资源目录的路径
    localPath: 'project2/dist/index.html',
    windowConfig: {
      width: 1200,
      height: 800,
      resizable: true
    }
  },
  {
    id: 'project3',
    name: '项目 3',
    description: '第三个应用项目（直接加载本地文件，无需 HTTP 服务器）',
    // 相对于资源目录的路径
    localPath: 'project3/dist/index.html',
    windowConfig: {
      width: 1000,
      height: 700,
      resizable: true
    }
  }
];
