/**
 * preload.ts 通过 contextBridge 暴露到 window.electronAPI 的接口。
 *
 * 放成 electron/ 下的 .ts（不是 .d.ts——electron/*.d.ts 是 tsc 的编译产物，被 gitignore 掉），
 * 两边共用一份定义：渲染侧靠它消掉 (window as any).electronAPI，preload.ts 靠它
 * 保证暴露出来的方法名没打错。改这里必须同步 preload.ts 暴露的字段。
 */

export interface ReadLocalFileResult {
  ok: boolean
  text?: string
  name?: string
  error?: string
}

export interface ElectronAPI {
  // ── 无边框窗口的自绘标题栏用 ──
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>

  // ── 菜单事件：ipcRenderer.on 的包装。渲染侧订阅后必须调 offMenu* 成对解绑，
  // 否则 StrictMode 重挂会叠出重复监听。onMenu* 的返回值不用。 ──
  onMenuNew: (callback: () => void) => void
  onMenuOpen: (callback: () => void) => void
  onMenuExport: (callback: () => void) => void
  onMenuOpenFile: (callback: (filePath: string) => void) => () => void
  offMenuNew: (callback: () => void) => void
  offMenuOpen: (callback: () => void) => void
  offMenuExport: (callback: () => void) => void
  readLocalFile: (filePath: string) => Promise<ReadLocalFileResult>

  // ── 把渲染侧的行为设置同步给主进程（托盘图标、关窗即退）──
  sendSettings: (settings: Record<string, unknown>) => void

  platform: NodeJS.Platform
}
