/**
 * LZEditor 插件系统 — 移植自 Textus 的纯逻辑模块桶导出。
 * 只含无 UI 依赖的模块；UI 部分（设置页/卡片）由宿主按样式重写。
 */

// store: 清单解析/校验/生命周期/权限/记录
export {
  ManifestError,
  MENU_IDS,
  object,
  list,
  text,
  parseMain,
  parseContributes,
} from "./store/manifest-parse";
export {
  isPermission,
  parseManifest,
  localize,
  compareVersions,
  engineSatisfied,
  matchesFilename,
  PLUGIN_PLATFORMS,
  REQUIRED_SETTINGS,
} from "./store/manifest";
export type {
  Permission,
  PluginPlatform,
  PluginManifest,
  CommandContribution,
  KeybindingContribution,
  MenuId,
  MenuContribution,
  Requirement,
  RequiredSetting,
  SidebarTabContribution,
  ViewContribution,
  CodeBlockContribution,
  CustomEditorContribution,
  SettingType,
  SettingContribution,
  ThemeContribution,
  AiToolContribution,
  CompletionContribution,
  LinkContribution,
  FloatingPlace,
  FloatingViewContribution,
  SuggestKind,
  EmbedKind,
  HoverContribution,
  Contributes,
} from "./store/manifest";
export {
  nextStatus,
  canRun,
  canSwitch,
} from "./store/lifecycle";
export type { PluginStatus, PluginEvent } from "./store/lifecycle";
export {
  permissionLabel,
  grantedHosts,
} from "./store/permissions";
export {
  pluginPath,
  mimeOf,
  toBase64,
  fromBase64,
  dataUrl,
} from "./store/files";
export type { PluginOrigin } from "./store/files";
export {
  configurePlugins,
  windowInfo,
  publish,
  update,
  subscribePlugins,
  pluginsSnapshot,
  pluginRecord,
  pluginName,
  pluginText,
  pluginMatches,
} from "./store/plugin-records";
export type { PluginRecord, PluginsSnapshot, WindowInfo } from "./store/plugin-records";

// host: JSON-RPC 端点（自我包含，可序列化注入沙盒 iframe）
export { createEndpoint } from "./host/rpc";
export type { Handlers, Endpoint } from "./host/rpc";

// app: 命令系统
export {
  registerCommand,
  commands,
  runCommand,
  commandShortcut,
  commandForCombo,
} from "./app/commands";
export type { CommandDef } from "./app/commands";

// 对外 API 面
export {
  pluginApi,
  configurePluginApiHooks,
  exposePluginApiForDevelopment,
} from "./plugin-api";
export type { PluginApi, PluginApiHooks, Undo } from "./plugin-api";

// utils
export { matchesWords, searchFold } from "../utils/match-words";
export type { Strings } from "../i18n/strings";
