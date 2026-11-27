import { app, BrowserWindow, dialog, ipcMain, Menu, Tray, nativeImage, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'
import { getGitHistory, getGitShow } from './gitHistory'
import { autoUpdater } from 'electron-updater'

let mainWindow: BrowserWindow | null = null

// 允许被 file:read 读取的路径。只在「操作系统文件关联」这条链路上发放授权——
// 那是用户主动双击 .md 文件触发的，路径由 OS 给出。渲染进程拿不到别的路径读取能力：
// 没有它，任何从预览里逃出的脚本都能读任意本地文件（readLocalFile('~/.ssh/id_rsa')）。
// 注：UI 里没有自由输入路径的入口（文件打开走系统选择器，路径由 OS 给出），所以不需要对话框发放授权。
const allowedPaths = new Set<string>()

const ALLOWED_FILE_EXT = ['.md', '.markdown', '.mdown', '.mkd', '.txt']
const isAllowedPath = (filePath: string): boolean =>
  ALLOWED_FILE_EXT.includes(path.extname(filePath).toLowerCase()) && allowedPaths.has(path.resolve(filePath))

/**
 * 处理操作系统文件关联（双击 .md / 命令行参数 / macOS open-file）。
 * 必须先登记授权再读：allowedPaths 初始为空，先 isAllowedPath 再 add 会让
 * 第一次打开永远被拒。
 */
function openAssociatedFile(file: string): void {
  const p = path.resolve(String(file || ''))
  if (!ALLOWED_FILE_EXT.includes(path.extname(p).toLowerCase())) return
  if (!fs.existsSync(p)) return
  allowedPaths.add(p)
  const win = BrowserWindow.getAllWindows().slice(-1)[0]
  if (win) win.webContents.send('menu-open-file', p)
}

/** macOS 在 app ready 前就可能发 open-file；先排队，ready 后再开。 */
let pendingOpenFile: string | null = null
app.on('open-file', (event, file) => {
  event.preventDefault()
  if (app.isReady()) openAssociatedFile(file)
  else pendingOpenFile = file
})

const isDev = !app.isPackaged

// 版本号单一来源：package.json（前端另在 src/shared/version.ts 同步一份）
const APP_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')).version

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
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
      // 打包态 __dirname = resources/app.asar/electron，dist 在 asar 根 → 上一级 ../dist
      url.pathToFileURL(path.join(__dirname, '../dist/index.html')).href,
    )
  }

  // 外链一律交给系统浏览器：不让它在应用窗口里打开，也不让任何页面把当前窗口导航走。
  // 例外是 window.open('', '_blank') 的 PDF 打印窗口——它是 about:blank，靠 document.write 写纯
  // HTML+CSS，必须在应用内开窗口才能调起系统打印。这个窗口不带 preload，拿不到任何 IPC。
  const openExternal = (target: string): void => {
    if (!target || target === 'about:blank') return
    if (/^https?:/i.test(target)) void shell.openExternal(target)
  }

  const wc = mainWindow.webContents

  wc.setWindowOpenHandler(({ url }) => {
    if (!url || url === 'about:blank') return { action: 'allow' }
    if (/^https?:/i.test(url)) {
      void shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'deny' }
  })

  wc.on('will-navigate', (event, target) => {
    // location.reload() 的目标等于当前 URL，放行，否则开发模式的热更新刷新会被拦掉
    if (target === wc.getURL()) return
    event.preventDefault()
    openExternal(target)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  // 自动更新：只在打包态运行；检查失败（离线/代理）不阻塞启动。
  // latest*.yml 由 release 工作流生成，electron-updater 按平台渠道下载安装。
  if (app.isPackaged) {
    try {
      autoUpdater.autoDownload = true
      autoUpdater.autoInstallOnAppQuit = true
      autoUpdater.checkForUpdatesAndNotify().catch(() => { /* 离线忽略 */ })
    } catch { /* 更新器初始化失败不影响应用 */ }
  }

  // 首启通过命令行参数带来的文件（Windows/Linux 双击关联），以及 macOS 在
  // ready 前排队等着的 open-file。
  const launchArg = process.argv.slice(1).find((a) =>
    ALLOWED_FILE_EXT.includes(path.extname(String(a)).toLowerCase()) && fs.existsSync(path.resolve(String(a))),
  )
  if (launchArg) openAssociatedFile(launchArg)
  else if (pendingOpenFile) {
    openAssociatedFile(pendingOpenFile)
    pendingOpenFile = null
  }

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

// 插件托盘项（渲染侧登记，追加到托盘菜单，纯增量不覆盖现有项）
let pluginTrayItems: Array<{ id: string; label: string }> = []

function applyTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../public/icon.png'))
  if (getSetting('showTrayIcon', true) === false) {
    if (tray) { tray.destroy(); tray = null }
    return
  }
  if (tray) return
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: '显示主窗口', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
  ]
  // 插件托盘项：点击时把插件项 id 回发渲染进程，由插件 run() 执行
  for (const item of pluginTrayItems) {
    template.push({ label: item.label, click: () => mainWindow?.webContents.send('plugins:tray-item', item.id) })
  }
  if (pluginTrayItems.length) template.push({ type: 'separator' })
  template.push({ label: '退出', click: () => app.quit() })
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('lzeditor')
  tray.setContextMenu(Menu.buildFromTemplate(template))
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
}

ipcMain.on('plugins:tray-set', (_event, items: Array<{ id: string; label: string }>) => {
  pluginTrayItems = Array.isArray(items) ? items : []
  applyTray()
})

ipcMain.on('app:settings', (_event, settings: Record<string, unknown>) => {
  appSettings = settings || {}
  applyTray()
})

// 文件关联：从资源管理器双击 .md/.markdown/.mdown/.mkd/.txt 打开
app.on('second-instance', (_event, argv) => {
  const file = argv.slice(1).pop()
  if (!file) return
  if (getSetting('openInNewWindow', false) === true) createWindow()
  openAssociatedFile(file)
})

// 读取本地文件（供「打开文档」使用，返回文本内容）
ipcMain.handle('file:read', async (_event, filePath: string) => {
  const name = path.basename(String(filePath || ''))
  // 两道闸门：先查授权集合（谁发放的），再看扩展名（读什么）。
  // 拒绝时返回 ok:false，渲染进程按普通读取失败处理，不会抛异常。
  if (!isAllowedPath(String(filePath || ''))) {
    return { ok: false, error: 'path not allowed', name }
  }
  try {
    const text = await fs.promises.readFile(filePath, 'utf8')
    return { ok: true, text, name }
  } catch (err: any) {
    return { ok: false, error: err.message || 'read failed', name }
  }
})

// 保存文档到磁盘：路径为空时弹系统「另存为」对话框。
// 保存后的路径登记进 allowedPaths，后续 file:read / git:history 才能继续读。
ipcMain.handle('file:save', async (_event, payload: { path?: string | null; text?: string; suggestedName?: string }) => {
  let target = String(payload?.path || '')
  if (!target) {
    const r = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: String(payload?.suggestedName || 'untitled.md'),
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: '文本', extensions: ['txt'] },
      ],
    })
    if (r.canceled || !r.filePath) return { ok: false, canceled: true }
    target = r.filePath
  }
  try {
    await fs.promises.writeFile(target, String(payload?.text || ''), 'utf8')
    allowedPaths.add(path.resolve(target))
    return { ok: true, path: target }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'save failed' }
  }
})

// 导入授权：文件选择器导入的本地 md 文件，其磁盘路径不在「操作系统文件关联」链路
// （second-instance）发放的授权里。渲染进程拿到 File 真实路径后调这里登记进
// allowedPaths，git:history/git:show 才能读它的仓库。扩展名白名单 + existsSync 双检，
// 只登记 markdown 类且真实存在的文件，避免任意路径注入。
ipcMain.handle('git:authorize', (_event, filePath: string) => {
  const p = String(filePath || '')
  if (!ALLOWED_FILE_EXT.includes(path.extname(p).toLowerCase())) return { ok: false }
  if (!fs.existsSync(p)) return { ok: false }
  allowedPaths.add(path.resolve(p))
  return { ok: true }
})

// Git 提交历史：只放行授权过的文件（与 file:read 同闸门），堵「读任意仓库文件」漏洞。
ipcMain.handle('git:history', async (_event, filePath: string) => {
  if (!isAllowedPath(String(filePath || ''))) {
    return { ok: false, error: 'path not allowed' }
  }
  return getGitHistory(String(filePath))
})

// Git 提交内容：只放行授权过的文件，只读 blob，不改仓库。
ipcMain.handle('git:show', async (_event, filePath: string, oid: string) => {
  if (!isAllowedPath(String(filePath || ''))) {
    return { ok: false, error: 'path not allowed' }
  }
  return getGitShow(String(filePath), String(oid || ''))
})

/* ── Ctrl+S 保存历史 ──────────────────────────────────────────────
 * 打包态窗口用 file:// 加载，相对 `/api/versions` 解析成 file:///api/versions，
 * 永远打不到本地服务。所以 Electron 下改走 IPC，把快照存到 userData；
 * 浏览器 / LPK 仍走 HTTP。两者字段与 server 的 StoredVersion 一致。 */
interface StoredVersion {
  id: string
  docId: string
  md: string
  html: string
  changes: number
  ts: number
  date: string
  time: string
  desc: string
  source: 'local'
}

const MAX_SAVES = 10
let versionStore: Record<string, StoredVersion[]> | null = null

function versionsFilePath(): string {
  return path.join(app.getPath('userData'), 'versions.json')
}

function loadVersionStore(): Record<string, StoredVersion[]> {
  if (versionStore) return versionStore
  let loaded: Record<string, StoredVersion[]> = {}
  try {
    const parsed = JSON.parse(fs.readFileSync(versionsFilePath(), 'utf8'))
    if (parsed && typeof parsed === 'object') loaded = parsed
  } catch { /* 损坏则从空开始 */ }
  versionStore = loaded
  return loaded
}

function persistVersionStore(): void {
  try {
    fs.writeFileSync(versionsFilePath(), JSON.stringify(loadVersionStore()))
  } catch { /* 持久化失败不阻塞保存 */ }
}

function pad2(n: number): string { return String(n).padStart(2, '0') }

function recordVersionIPC(docId: string, data: { md: string; html: string; changes: number }): StoredVersion {
  const store = loadVersionStore()
  const ts = Date.now()
  const d = new Date(ts)
  const version: StoredVersion = {
    id: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    docId,
    md: data.md ?? '',
    html: data.html ?? '',
    changes: Number(data.changes) || 0,
    ts,
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
    desc: 'ctrl+s 保存',
    source: 'local',
  }
  const list = store[docId] || []
  const last = list[0]
  if (last && last.md === version.md) return last
  store[docId] = [version, ...list].slice(0, MAX_SAVES)
  persistVersionStore()
  return version
}

ipcMain.handle('versions:save', (_event, payload: { docId?: string; md?: string; html?: string; changes?: number }) => {
  const docId = String(payload?.docId || '')
  if (!docId) return { ok: false, error: 'docId required' }
  const version = recordVersionIPC(docId, {
    md: String(payload.md ?? ''),
    html: String(payload.html ?? ''),
    changes: Number(payload.changes) || 0,
  })
  return { ok: true, version }
})

ipcMain.handle('versions:list', (_event, docId: string) => {
  const id = String(docId || '')
  if (!id) return { ok: false, error: 'docId required' }
  return { ok: true, versions: (loadVersionStore()[id] || []).slice(0, MAX_SAVES) }
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
