import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Secrets (AI API keys)
  setSecret: (key: string, value: string) => ipcRenderer.invoke('secrets:set', key, value),
  getSecret: (key: string) => ipcRenderer.invoke('secrets:get', key),
  deleteSecret: (key: string) => ipcRenderer.invoke('secrets:delete', key),

  // Menu events
  onMenuNew: (callback: () => void) => ipcRenderer.on('menu-new', callback),
  onMenuOpen: (callback: () => void) => ipcRenderer.on('menu-open', callback),
  onMenuExport: (callback: () => void) => ipcRenderer.on('menu-export', callback),
  // 从资源管理器打开的本地文件路径
  onMenuOpenFile: (callback: (filePath: string) => void) =>
    ipcRenderer.on('menu-open-file', (_event, filePath: string) => callback(filePath)),
  readLocalFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  offMenuNew: (callback: () => void) => ipcRenderer.removeListener('menu-new', callback),
  offMenuOpen: (callback: () => void) => ipcRenderer.removeListener('menu-open', callback),
  offMenuExport: (callback: () => void) => ipcRenderer.removeListener('menu-export', callback),

  // 把渲染进程的行为设置同步给主进程（托盘图标、关窗即退等）
  sendSettings: (settings: Record<string, unknown>) => ipcRenderer.send('app:settings', settings),

  // Platform
  platform: process.platform,
})
