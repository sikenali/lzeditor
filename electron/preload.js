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
    offMenuNew: (callback) => electron_1.ipcRenderer.removeListener('menu-new', callback),
    offMenuOpen: (callback) => electron_1.ipcRenderer.removeListener('menu-open', callback),
    offMenuExport: (callback) => electron_1.ipcRenderer.removeListener('menu-export', callback),
    // Platform
    platform: process.platform,
});
