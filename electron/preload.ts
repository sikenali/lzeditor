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
  offMenuNew: (callback: () => void) => ipcRenderer.removeListener('menu-new', callback),
  offMenuOpen: (callback: () => void) => ipcRenderer.removeListener('menu-open', callback),
  offMenuExport: (callback: () => void) => ipcRenderer.removeListener('menu-export', callback),

  // Platform
  platform: process.platform,
})
