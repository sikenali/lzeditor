# Textus 功能移植计划 — LZEditor

## 目标
1. 移植 Textus 插件系统**纯逻辑模块**到 `src/additional/plugins/`（无 UI 依赖，可直接跑）。
2. 集成 **Milkdown 7** 编辑器核心（并存模式，不破坏 CodeMirror）。
3. 接入 `src/App.tsx` 提供编辑器切换。

## 任务清单

### 纯逻辑模块（src/additional/plugins/）— ✅ 全部完成，typecheck 通过
- [x] `store/manifest-parse.ts` — 完整版（含 parseMain/parseContributes/floatingPlace）
- [x] `store/manifest.ts` — 清单 schema 与校验
- [x] `store/lifecycle.ts` — 状态机 off/on/broken/incompatible/failed
- [x] `store/permissions.ts` — permissionLabel/grantedHosts
- [x] `store/files.ts` — PluginOrigin/pluginPath/mimeOf/dataUrl
- [x] `store/plugin-records.ts` — 插件记录/快照/订阅
- [x] `utils/match-words.ts` — matchesWords/searchFold
- [x] `i18n/strings.ts` — 本地 Strings 类型
- [x] `host/rpc.ts` — JSON-RPC 2.0 createEndpoint（自我包含）
- [x] `app/commands.ts` — registerCommand/runCommand/commands/commandForCombo
- [x] `plugin-api.ts` — 对外 API 面（hooks 注入）
- [x] `plugins/index.ts` — 桶导出

### Milkdown 编辑器（src/additional/milkdown/）— ✅ 完成
- [x] `MilkdownEditor.tsx` — React 组件（@milkdown/kit + @milkdown/react，commonmark/gfm，受控 md，listener 回调）
- [x] `milkdown.css` — 基础样式（复用 app token 与 document-width 变量）
- [x] `index.ts` — 导出

### 集成 — ✅ 完成
- [x] `src/App.tsx` — 编辑器模式切换（wysiwyg ? MilkdownEditor : CodeEditor）
- [x] `src/store/editorStore.ts` + `src/shared/types.ts` — 新增 wysiwyg 状态
- [x] `src/components/layout/editorActions.tsx` — 模式菜单加「WYSIWYG 模式」切换
- [x] `src/additional/index.ts` — 桶导出
- [x] `tests/cm6-core-boundary.test.mjs` — 更新：Milkdown 仅限 src/additional，主 src 仍禁；新增并存断言
- [x] 验证 `npm run typecheck`（通过）
- [x] 验证 `npm test`（225/225 通过）
- [x] 验证 `npx vite build`（成功）

## 状态
- 当前工作区：基于 HEAD（CodeMirror 6）。yeli 回退改动已 stash（`temp: stash yeli-revert worktree (keep HEAD CodeMirror)`）。
- 依赖：`@milkdown/kit@^7.23.0` + `@milkdown/react@^7.23.0` 已安装。
