import { app, BrowserWindow, dialog, ipcMain, Menu, Tray, nativeImage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

// 版本号单一来源：package.json（前端另在 src/shared/version.ts 同步一份）
const APP_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')).version

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

// 关闭最后一个窗口时是否退出：由「行为设置 → 当所有窗口关闭时退出应用程序」控制
// （默认值与 macOS 一致：darwin 上保留在 dock，其他平台退出）
app.on('window-all-closed', () => {
  const shouldQuit = appSettings['quitWhenAllWindowsClosed']
  if (process.platform === 'darwin') {
    if (shouldQuit === true) app.quit()
  } else if (shouldQuit === false) {
    // 保持后台存活
  } else {
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

ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

// 渲染进程的行为设置（showTrayIcon / openInNewWindow / quitWhenAllWindowsClosed）
let appSettings: Record<string, unknown> = {}

function getSetting<K extends string>(key: K, fallback: unknown): unknown {
  return appSettings[key] === undefined ? fallback : appSettings[key]
}

let tray: Tray | null = null

function applyTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../../public/icon.png'))
  if (getSetting('showTrayIcon', true) === false) {
    if (tray) { tray.destroy(); tray = null }
    return
  }
  if (tray) return
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('lzeditor')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]))
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
}

ipcMain.on('app:settings', (_event, settings: Record<string, unknown>) => {
  appSettings = settings || {}
  applyTray()
})

// 文件关联：从资源管理器双击 .md/.markdown/.txt 打开
app.on('second-instance', (_event, argv) => {
  const file = argv.slice(1).pop()
  if (!file) return
  const ext = path.extname(file).toLowerCase()
  if (!['.md', '.markdown', '.txt'].includes(ext)) return
  if (getSetting('openInNewWindow', false) === true) {
    createWindow()
  }
  BrowserWindow.getAllWindows().slice(-1)[0]?.webContents.send('menu-open-file', file)
})

// 读取本地文件（供「打开文档」使用，返回文本内容）
ipcMain.handle('file:read', async (_event, filePath: string) => {
  try {
    const text = await fs.promises.readFile(filePath, 'utf8')
    return { ok: true, text, name: path.basename(filePath) }
  } catch (err: any) {
    return { ok: false, error: err.message || 'read failed', name: path.basename(filePath) }
  }
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
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectall' },
      ],
    },
    {
      label: '视图',
      submenu: [
        // 不给重新加载配加速器：Ctrl/⌘+R 归渲染进程切阅读模式，
        // 菜单加速器会把它吃掉，阅读模式的快捷键就永远到不了
        { label: '重新加载', click: () => mainWindow?.reload() },
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
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于 lzeditor',
              message: `lzeditor v${APP_VERSION}`,
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
