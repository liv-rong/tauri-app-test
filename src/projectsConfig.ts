// 项目配置
export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  path: string; // 相对于 projects 目录的路径
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
    description: '这是 Studio 应用项目',
    path: 'studio/dist/index.html',
    windowConfig: {
      width: 1400,
      height: 900,
      resizable: true
    }
  },
  {
    id: 'project2',
    name: '项目 2',
    description: '第二个应用项目',
    path: 'project2/dist/index.html',
    windowConfig: {
      width: 1200,
      height: 800,
      resizable: true
    }
  },
  {
    id: 'project3',
    name: '项目 3',
    description: '第三个应用项目',
    path: 'project3/dist/index.html',
    windowConfig: {
      width: 1000,
      height: 700,
      resizable: true
    }
  }
];
