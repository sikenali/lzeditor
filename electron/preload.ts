import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
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
  offMenuNew: (callback: () => void) => ipcRenderer.removeListener('menu-new', callback),
  offMenuOpen: (callback: () => void) => ipcRenderer.removeListener('menu-open', callback),
  offMenuExport: (callback: () => void) => ipcRenderer.removeListener('menu-export', callback),

  // 把渲染进程的行为设置同步给主进程（托盘图标、关窗即退等）
  sendSettings: (settings: Record<string, unknown>) => ipcRenderer.send('app:settings', settings),

  // Platform
  platform: process.platform,
})
