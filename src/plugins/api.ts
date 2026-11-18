import { createRegistry } from './registry'
import type {
  PluginAiTool, PluginCommand, PluginFloatingView, PluginKeybinding,
  PluginLocale, PluginMenuItem, PluginSettingDef, PluginSettingsPage,
  PluginStatusItem, PluginWillExport, PluginWillSave,
} from './types'

/* ═══════════════════════════════════════════════════════════
   lzeditor 轻量插件 API（对标 Textus pluginApi 的形状）
   纯进程内：插件在应用启动时调用 register* 注册贡献点，
   UI 组件通过 pluginRegistries.* 订阅渲染。不加载外部沙箱。
   ═══════════════════════════════════════════════════════════ */

const commands = createRegistry<PluginCommand>()
const settingsPages = createRegistry<PluginSettingsPage>()
const statusItems = createRegistry<PluginStatusItem>()
const aiTools = createRegistry<PluginAiTool>()
const settingDefs = createRegistry<PluginSettingDef>()
const menuItems = createRegistry<PluginMenuItem>()
const floatingViews = createRegistry<PluginFloatingView>()
const keybindings = createRegistry<PluginKeybinding>()
const locales = createRegistry<PluginLocale>()
const willSaveHooks = createRegistry<PluginWillSave>()
const willExportHooks = createRegistry<PluginWillExport>()

/** 插件设置值（独立于 settingsStore，避免触碰其落盘/迁移逻辑）。 */
const settingValues = new Map<string, unknown>()

export const pluginApi = {
  commands: {
    register: (cmd: PluginCommand) => commands.register(cmd),
    run: async (id: string, args?: unknown): Promise<unknown> => {
      const cmd = commands.list().find((c) => c.id === id)
      if (!cmd) throw new Error(`No plugin command "${id}".`)
      return cmd.run(args)
    },
  },
  settingsPages: { register: (p: PluginSettingsPage) => settingsPages.register(p) },
  statusItems: { register: (s: PluginStatusItem) => statusItems.register(s) },
  aiTools: { register: (t: PluginAiTool) => aiTools.register(t) },
  settings: {
    register: (def: PluginSettingDef) => {
      if (!settingValues.has(def.key)) settingValues.set(def.key, def.default)
      return settingDefs.register(def)
    },
    get: (key: string): unknown => settingValues.get(key),
    set: (key: string, value: unknown) => { settingValues.set(key, value) },
  },
  menus: { register: (m: PluginMenuItem) => menuItems.register(m) },
  floatingViews: { register: (v: PluginFloatingView) => floatingViews.register(v) },
  keybindings: { register: (k: PluginKeybinding) => keybindings.register(k) },
  locales: { register: (l: PluginLocale) => locales.register(l) },
  willSave: { register: (h: PluginWillSave) => willSaveHooks.register(h) },
  willExport: { register: (h: PluginWillExport) => willExportHooks.register(h) },
}

/** UI 组件订阅用：每类注册表的只读快照（保留具体元素类型）。 */
export const pluginRegistries = {
  commands, settingsPages, statusItems, aiTools, settingDefs,
  menuItems, floatingViews, keybindings, locales, willSaveHooks, willExportHooks,
}

/** 在应用保存前调用所有 will-save 钩子（只读，不改保存逻辑）。 */
export function runWillSave(doc: { md: string; title: string }): void {
  for (const h of willSaveHooks.list()) {
    try { h.run(doc) } catch { /* 插件钩子失败不阻断保存 */ }
  }
}

/** 在应用导出前调用所有 will-export 钩子（只读）。 */
export function runWillExport(format: string): void {
  for (const h of willExportHooks.list()) {
    try { h.run(format) } catch { /* 不阻断导出 */ }
  }
}

/** 开发构建把 API 挂到 window.__lzPlugins，便于插件/控制台调试。 */
export function exposePluginApiForDevelopment(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return
  ;(window as unknown as { __lzPlugins?: typeof pluginApi }).__lzPlugins = pluginApi
}
