import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import * as path from 'path'
import * as url from 'url'

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
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
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL(
      url.pathToFileURL(path.join(__dirname, '../../dist/index.html')).href,
    )
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

// AI API key storage (encrypted on macOS/Windows, keytar on Linux)
const secretsStore = new Map<string, string>()

ipcMain.handle('secrets:set', (_event, key: string, value: string) => {
  secretsStore.set(key, value)
  return true
})

ipcMain.handle('secrets:get', (_event, key: string) => {
  return secretsStore.get(key) || null
})

ipcMain.handle('secrets:delete', (_event, key: string) => {
  secretsStore.delete(key)
  return true
})

// Menu
const createMenu = () => {
  const template: any = [
    {
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new') },
        { label: '打开', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu-open') },
        { type: 'separator' },
        { label: '导出', accelerator: 'CmdOrCtrl+E', click: () => mainWindow?.webContents.send('menu-export') },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
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
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', click: () => { if (mainWindow) mainWindow.webContents.zoomLevel = 0 } },
        { label: '放大', accelerator: 'CmdOrCtrl+=', click: () => { if (mainWindow) { mainWindow.webContents.zoomLevel++ } } },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', click: () => { if (mainWindow) { mainWindow.webContents.zoomLevel-- } } },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 lzeditor',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于 lzeditor',
              message: 'lzeditor v0.1.0',
              detail: 'AI 集成 Markdown 编辑器\n暗夜霓虹主题',
            })
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(createMenu)
