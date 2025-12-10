import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export interface ProjectWindowConfig {
  width?: number;
  height?: number;
  resizable?: boolean;
  fullscreen?: boolean;
}

/**
 * 打开项目窗口（使用 WebviewWindow，类似 Flutter 的 WebView 架构）
 * 每个项目在独立窗口中运行，互不影响
 */
export async function openProjectWindow(
  projectId: string,
  projectName: string,
  url: string,
  config?: ProjectWindowConfig
) {
  try {
    // 查找窗口（Tauri 2.x 返回 Promise）
    const existingWindow = await WebviewWindow.getByLabel(projectId);

    // 如果窗口已存在，直接聚焦
    if (existingWindow) {
      await existingWindow.setFocus();
      console.log(`项目窗口 ${projectId} 已存在，已聚焦`);
      return existingWindow;
    }

    // 创建新窗口
    const window = new WebviewWindow(projectId, {
      url,
      title: projectName,
      width: config?.width || 1200,
      height: config?.height || 800,
      resizable: config?.resizable !== false,
      fullscreen: config?.fullscreen || false,
      // 可选：设置窗口位置、最小尺寸等
      minWidth: 400,
      minHeight: 300,
    });

    console.log(`项目窗口 ${projectId} 已创建`);

    // 等待窗口创建完成
    await window.once('tauri://created', () => {
      console.log(`项目窗口 ${projectId} 创建完成`);
    });

    return window;
  } catch (error) {
    console.error(`创建项目窗口失败 (${projectId}):`, error);
    throw error;
  }
}
