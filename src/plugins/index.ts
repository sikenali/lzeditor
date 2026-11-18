/* ═══════════════════════════════════════════════════════════
   lzeditor 轻量插件系统 —— 桶导出
   进程内插件 API（对标 Textus pluginApi 形状），纯增量，
   不触碰现有功能路径（CodeMirror / 面板 / 保存导出 / 快捷键）。
   ═══════════════════════════════════════════════════════════ */

export { pluginApi, pluginRegistries, runWillSave, runWillExport } from './api'
export { exposePluginApiForDevelopment } from './api'
export { usePluginRegistry } from './hooks'
export { createRegistry, type Registry } from './registry'
export type {
  PluginAiTool,
  PluginCommand,
  PluginFloatingView,
  PluginKeybinding,
  PluginLocale,
  PluginMenuItem,
  PluginMenuId,
  PluginSettingDef,
  PluginSettingsPage,
  PluginStatusItem,
  PluginWillExport,
  PluginWillSave,
} from './types'
