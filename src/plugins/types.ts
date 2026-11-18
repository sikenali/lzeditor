import type { ReactNode } from 'react'

/* ═══════════════════════════════════════════════════════════
   lzeditor 轻量插件 API —— 贡献点类型（对标 Textus pluginApi）
   全部为「新增注册表 + 新增渲染插槽」，不触碰现有功能路径。
   ═══════════════════════════════════════════════════════════ */

/** 一个命令：id 必须带插件命名空间（如 `myplugin.cmd`）。 */
export interface PluginCommand {
  id: string
  title: string
  run: (args?: unknown) => unknown | Promise<unknown>
}

/** 设置中心里新增的一个页面（对标 contributes.settingsPage）。 */
export interface PluginSettingsPage {
  id: string
  label: string
  icon?: string
  render: () => ReactNode
}

/** 页脚状态栏里新增的一项（对标 contributes.statusItems）。 */
export interface PluginStatusItem {
  id: string
  render: () => ReactNode
}

/** AI 面板里新增的一个工具（对标 contributes.aiTools）。 */
export interface PluginAiTool {
  id: string
  label: string
  run: (text: string, args?: Record<string, unknown>) => Promise<string>
}

/** 新增的一个设置项定义（对标 contributes.settings）。 */
export interface PluginSettingDef {
  key: string
  label: string
  default: unknown
  type?: 'boolean' | 'string' | 'number'
}

/** 一个菜单项挂到的菜单（对标 contributes.menus 的可用子集）。 */
export type PluginMenuId = 'block' | 'floating' | 'plugins' | 'tray'

export interface PluginMenuItem {
  id: string
  menu: PluginMenuId
  label: string
  icon?: string
  run: () => void
}

/** 浮动视图（对标 contributes.floatingViews）。 */
export interface PluginFloatingView {
  id: string
  title: string
  render: () => ReactNode
}

/** 快捷键绑定（对标 contributes.keybindings；priority 决定冲突优先级）。 */
export interface PluginKeybinding {
  id: string
  key: string
  command: string
  priority?: number
}

/** 本地化词表（对标 manifest.l10n）。 */
export interface PluginLocale {
  lang: string
  table: Record<string, string>
}

/** 保存前钩子（对标 contributes.will-save）。 */
export interface PluginWillSave {
  id: string
  run: (doc: { md: string; title: string }) => void
}

/** 导出前钩子（对标 contributes.will-export）。 */
export interface PluginWillExport {
  id: string
  run: (format: string) => void
}

/** 注册表可订阅：UI 组件靠它重渲染（React 端用 useSyncExternalStore）。 */
export interface PluginRegistry<T> {
  list: () => T[]
  subscribe: (fn: () => void) => () => void
  getSnapshot: () => T[]
}
