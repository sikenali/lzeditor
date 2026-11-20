import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ElectronAPI } from './api'

// 渲染侧靠这份 ElectronAPI 消掉 (window as any)；这里标注是为了保证暴露的名字
// 没写错。onMenu* 的返回值（ipcRenderer.on 的链式结果）不用，解绑走 offMenu*。
const api: ElectronAPI = {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Menu events
  onMenuNew: (callback: () => void) => ipcRenderer.on('menu-new', callback),
  onMenuOpen: (callback: () => void) => ipcRenderer.on('menu-open', callback),
  onMenuExport: (callback: () => void) => ipcRenderer.on('menu-export', callback),
  // 从资源管理器打开的本地文件路径。
  // 必须返回解绑函数：ipcRenderer.on 收到的是这里包出来的 wrapper，
  // 外面拿不到它就无法用 removeListener 真正卸掉监听。
  onMenuOpenFile: (callback: (filePath: string) => void) => {
    const wrapper = (_event: unknown, filePath: string) => callback(filePath)
    ipcRenderer.on('menu-open-file', wrapper)
    return () => ipcRenderer.removeListener('menu-open-file', wrapper)
  },
  readLocalFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  gitHistory: (filePath: string) => ipcRenderer.invoke('git:history', filePath),
  gitShow: (filePath: string, oid: string) => ipcRenderer.invoke('git:show', filePath, oid),
  gitAuthorize: (filePath: string) => ipcRenderer.invoke('git:authorize', filePath),
  // Ctrl+S 保存历史：Electron 打包态没有 /api 代理，走 IPC 存到 userData。
  versionsSave: (payload: { docId: string; md: string; html: string; changes: number }) =>
    ipcRenderer.invoke('versions:save', payload),
  versionsList: (docId: string) => ipcRenderer.invoke('versions:list', docId),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  offMenuNew: (callback: () => void) => ipcRenderer.removeListener('menu-new', callback),
  offMenuOpen: (callback: () => void) => ipcRenderer.removeListener('menu-open', callback),
  offMenuExport: (callback: () => void) => ipcRenderer.removeListener('menu-export', callback),

  // 把渲染进程的行为设置同步给主进程（托盘图标、关窗即退等）
  sendSettings: (settings: Record<string, unknown>) => ipcRenderer.send('app:settings', settings),

  // 插件托盘项：渲染侧登记 → 主进程追加到托盘菜单；点击 → 回调回渲染侧运行
  setPluginTrayItems: (items: Array<{ id: string; label: string }>) =>
    ipcRenderer.send('plugins:tray-set', items),
  onPluginTrayItem: (callback: (id: string) => void) => {
    const wrapper = (_event: unknown, id: string) => callback(id)
    ipcRenderer.on('plugins:tray-item', wrapper)
    return () => ipcRenderer.removeListener('plugins:tray-item', wrapper)
  },

  // Platform
  platform: process.platform,
}

contextBridge.exposeInMainWorld('electronAPI', api)
