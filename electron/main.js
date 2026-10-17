"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs = require("fs");
const path = require("path");
const url = require("url");
let mainWindow = null;
const isDev = !electron_1.app.isPackaged;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        frame: false,
        transparent: false,
        backgroundColor: '#0A0E13',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 20, y: 13 },
        ...(isDev ? { icon: path.join(__dirname, '../../public/icon.png') } : {}),
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadURL(url.pathToFileURL(path.join(__dirname, '../../dist/index.html')).href);
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// 关闭最后一个窗口时是否退出：由「行为设置 → 当所有窗口关闭时退出应用程序」控制
// （默认值与 macOS 一致：darwin 上保留在 dock，其他平台退出）
electron_1.app.on('window-all-closed', () => {
    const shouldQuit = appSettings['quitWhenAllWindowsClosed'];
    if (process.platform === 'darwin') {
        if (shouldQuit === true)
            electron_1.app.quit();
    }
    else if (shouldQuit === false) {
        // 保持后台存活
    }
    else {
        electron_1.app.quit();
    }
});
// IPC handlers for window controls
electron_1.ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);
electron_1.ipcMain.on('window-close', () => {
    mainWindow?.close();
});
// AI API key storage (encrypted on macOS/Windows, keytar on Linux)
const secretsStore = new Map();
electron_1.ipcMain.handle('secrets:set', (_event, key, value) => {
    secretsStore.set(key, value);
    return true;
});
electron_1.ipcMain.handle('secrets:get', (_event, key) => {
    return secretsStore.get(key) || null;
});
electron_1.ipcMain.handle('secrets:delete', (_event, key) => {
    secretsStore.delete(key);
    return true;
});
// 渲染进程的行为设置（enableTabs / showTrayIcon / openInNewWindow / quitWhenAllWindowsClosed）
let appSettings = {};
function getSetting(key, fallback) {
    return appSettings[key] === undefined ? fallback : appSettings[key];
}
let tray = null;
function applyTray() {
    const icon = electron_1.nativeImage.createFromPath(path.join(__dirname, '../../public/icon.png'));
    if (getSetting('showTrayIcon', true) === false) {
        if (tray) {
            tray.destroy();
            tray = null;
        }
        return;
    }
    if (tray)
        return;
    tray = new electron_1.Tray(icon.isEmpty() ? electron_1.nativeImage.createEmpty() : icon);
    tray.setToolTip('lzeditor');
    tray.setContextMenu(electron_1.Menu.buildFromTemplate([
        { label: '显示主窗口', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
        { type: 'separator' },
        { label: '退出', click: () => electron_1.app.quit() },
    ]));
    tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
}
electron_1.ipcMain.on('app:settings', (_event, settings) => {
    appSettings = settings || {};
    applyTray();
});
// 文件关联：从资源管理器双击 .md/.markdown/.txt 打开
electron_1.app.on('second-instance', (_event, argv) => {
    const file = argv.slice(1).pop();
    if (!file)
        return;
    const ext = path.extname(file).toLowerCase();
    if (!['.md', '.markdown', '.txt'].includes(ext))
        return;
    if (getSetting('openInNewWindow', false) === true) {
        createWindow();
    }
    electron_1.BrowserWindow.getAllWindows().slice(-1)[0]?.webContents.send('menu-open-file', file);
});
// 读取本地文件（供「打开文档」使用，返回文本内容）
electron_1.ipcMain.handle('file:read', async (_event, filePath) => {
    try {
        const text = await fs.promises.readFile(filePath, 'utf8');
        return { ok: true, text, name: path.basename(filePath) };
    }
    catch (err) {
        return { ok: false, error: err.message || 'read failed', name: path.basename(filePath) };
    }
});
// Menu
const createMenu = () => {
    const template = [
        {
            label: '文件',
            submenu: [
                { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new') },
                { label: '打开', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu-open') },
                { type: 'separator' },
                { label: '导出', accelerator: 'CmdOrCtrl+E', click: () => mainWindow?.webContents.send('menu-export') },
                { type: 'separator' },
                { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => electron_1.app.quit() },
            ],
        },
        {
            label: '编辑',
            submenu: [
                { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
                { type: 'separator' },
                { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
            ],
        },
        {
            label: '视图',
            submenu: [
                { label: '重新加载', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
                { label: '开发者工具', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.openDevTools() },
                { type: 'separator' },
                { label: '实际大小', accelerator: 'CmdOrCtrl+0', click: () => { if (mainWindow)
                        mainWindow.webContents.zoomLevel = 0; } },
                { label: '放大', accelerator: 'CmdOrCtrl+=', click: () => { if (mainWindow) {
                        mainWindow.webContents.zoomLevel++;
                    } } },
                { label: '缩小', accelerator: 'CmdOrCtrl+-', click: () => { if (mainWindow) {
                        mainWindow.webContents.zoomLevel--;
                    } } },
            ],
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于 lzeditor',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于 lzeditor',
                            message: 'lzeditor v0.1.0',
                            detail: 'AI 集成 Markdown 编辑器\n暗夜霓虹主题',
                        });
                    },
                },
            ],
        },
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
};
electron_1.app.whenReady().then(createMenu);
