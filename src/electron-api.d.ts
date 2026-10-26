import type { ElectronAPI } from '../electron/api'

// preload.ts 只在 Electron 下挂 window.electronAPI；浏览器里是 undefined，
// 所以类型留可选，渲染侧一律用 api?.xxx 判空。
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
