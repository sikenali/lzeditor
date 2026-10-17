"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => electron_1.ipcRenderer.send('window-minimize'),
    maximize: () => electron_1.ipcRenderer.send('window-maximize'),
    close: () => electron_1.ipcRenderer.send('window-close'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window-is-maximized'),
    // Secrets (AI API keys)
    setSecret: (key, value) => electron_1.ipcRenderer.invoke('secrets:set', key, value),
    getSecret: (key) => electron_1.ipcRenderer.invoke('secrets:get', key),
    deleteSecret: (key) => electron_1.ipcRenderer.invoke('secrets:delete', key),
    // Menu events
    onMenuNew: (callback) => electron_1.ipcRenderer.on('menu-new', callback),
    onMenuOpen: (callback) => electron_1.ipcRenderer.on('menu-open', callback),
    onMenuExport: (callback) => electron_1.ipcRenderer.on('menu-export', callback),
    // 从资源管理器打开的本地文件路径
    onMenuOpenFile: (callback) => electron_1.ipcRenderer.on('menu-open-file', (_event, filePath) => callback(filePath)),
    readLocalFile: (filePath) => electron_1.ipcRenderer.invoke('file:read', filePath),
    offMenuNew: (callback) => electron_1.ipcRenderer.removeListener('menu-new', callback),
    offMenuOpen: (callback) => electron_1.ipcRenderer.removeListener('menu-open', callback),
    offMenuExport: (callback) => electron_1.ipcRenderer.removeListener('menu-export', callback),
    // 把渲染进程的行为设置同步给主进程（托盘图标、关窗即退等）
    sendSettings: (settings) => electron_1.ipcRenderer.send('app:settings', settings),
    // Platform
    platform: process.platform,
});
