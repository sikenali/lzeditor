# Phase 2：三模式改版 实现计划

> 承接 Phase 1（CM6 内核，`3ab6032`）—— TipTap 已下线，CM6 是唯一编辑内核。
> 规格来源：`docs/superpowers/specs/2026-10-24-lzeditor-cm6-integration-design.md` §D2「三模式语义（Phase 2）」。

**目标：** 模式菜单收敛为「预览 / 代码 / 排版」三态；预览模式是左源码右预览的分屏 + 双向滚动同步；代码模式是全宽源码；排版模式是左源码右样式预览（`style-panel`、`main-nav-float` 组件不动，只重排内容区）；阅读模式退出菜单但 `read-mode.css` 保留。

**验收门槛：** `npm run check` 全绿 + `npm run build` 通过；手动核对三种模式的左右分屏、预览滚动同步、代码模式无右栏、排版模式的样式主题实时生效。

---

## 任务 M2-1：模式菜单与语义

**文件：** `src/components/layout/editorActions.tsx`

- [x] `MODE_ITEMS` 改为 `预览模式(preview) / 代码模式(code) / 排版模式(style)`，图标分别 `ri-eye-2-line / ri-code-s-line / ri-palette-line`；删除 `阅读模式(read)`。
- [x] `modeAction('preview')` 从「弹模态 `PreviewPanel`」改为「切换 `setShowPreview`」——分屏预览才是真正的左右分屏，模态面板与 D2 语义不符。
- [x] `modeAction('preview')` 打开时若当前不在 `edit` 态则先回落 `edit`，避免与代码/排版态叠加。
- [x] `modeAction('code' | 'style')` 改为 toggle：已在该模式则回落 `edit`。

## 任务 M2-2：排版模式重排内容区

**文件：** `src/App.tsx`、`src/styles/layout.css`

- [x] `centerContent` 删掉 `appMode === 'style' → <StyleMainPanel />` 独占分支：编辑 / 代码 / 排版三态都挂 `<LZEditor />`（左源码），样式预览走右栏。
- [x] `appMode === 'style'` 时右栏用 `<div className="style-mode-stack"><StyleMainPanel /></div>` 承载：`.app-right-panel > *` 的 `flex:1` 只会作用到这一层，`style-panel` 底部 dock 的 `flex-shrink:0` 不被吞。
- [x] 新增 `.app-right-panel--style { width: 46%; min-width: 420px; max-width: 760px }`：360px 常规右栏装不下「样式主题预览 + 13 张样式卡片」。
- [x] `.app-right-panel--style .style-panel { flex: 0 0 auto; max-height: 42% }`：保证预览区永远比样式面板高。
- [x] `style-panel`、`main-nav-float` 组件本体未改，仅调整它们所在的容器宽度。

## 任务 M2-3：预览模式分屏 + 代码模式无右栏

**文件：** `src/App.tsx`、`src/styles/app.css`

- [x] 抽出 `showRightPreview = showPreview && appMode !== 'code' && appMode !== 'history' && appMode !== 'style'`，顶栏布局与左侧布局两处引用，代码模式不给右栏留位。
- [x] **滚动同步的前置修复**：`app.css` 里 `.cm-editor { height: 100% }` + `.cm-scroller { overflow: auto }` 会让 CM6 内部滚动，而 `useScrollSync` 挂的是外层 `.lz-editor-content` 的 scroll 事件——两套滚动会导致同步完全不触发或互相打架。改为 `.cm-editor, .cm-scroller { height: auto; min-height: 100%; overflow: visible }`，滚动只发生在 `.lz-editor-content` 一个容器上。
- [x] 复核 `SidebarPreview` 的 `useScrollSync(editorContentRef, scrollContainerRef)` 双向比例同步与 150ms `canDrive` 冷却，直接沿用，未改 hook。

## 任务 M2-4：边界静态断言

**文件：** `tests/mode-boundary.test.mjs`（新增）

- [x] 模式菜单三项齐备、`action: 'read'` 不存在。
- [x] `modeAction` 块内必须出现 `setShowPreview(next)` 且不得再出现 `setOpenPanel(`。
- [x] `App.tsx` 必须有 `style-mode-stack` 与 `app-right-panel--style`。
- [x] `app.css` 必须出现 `overflow: visible`（守住「CM6 不自滚」这个滚动同步前提）。

---

## 实现偏差记录

- **滚动同步只做比例同步，不是 D2 写的「编辑行 ↔ 预览块映射」。** `useScrollSync` 是既有实现（比例 + 150ms 冷却 + rAF），本次只补了它的前置条件（唯一滚动容器）。块级映射需要源码行→渲染块的对应表，属于 Phase 3 预览引擎移植时一起做更合适。
- **代码模式沿用了既有的 textarea 全宽源码界面**，没有改成 CM6 全宽。理由：它是「全宽源码（无右侧预览）」的字面满足，且不删功能；但代价是 `appMode='code'` 时 CM6 仍在 DOM 里（`display:none` 保活），textarea 通过 `getCM6Editor()?.setText()` 与它双向同步。若要统一为 CM6 源码视图，需要在 CM6 上加「纯源码、关 live-preview」的形态开关，属另立任务。
- **阅读模式只是退出菜单，代码与 CSS 都保留**（`LZEditor` 的 read 分支、`read-mode.css`、`appMode: 'read'` 类型都还在），按 D2「read-mode.css 保留」的字面执行；目前没有任何 UI 入口能触发它。
- **`previewModeEnabled` 设置项与 `showPreview` 可能出现一次性的不同步**：Footer 按钮切换时会同步写设置项，而模式菜单只改 `showPreview`。刻意不在 `modeAction` 里写设置项，避免菜单动作带副作用。
- **未做浏览器实测**：本次只有静态断言 + typecheck + build。CM6 高度改动的实际视觉影响（尤其 live-preview 打开时）需要手验。

**验证结果：** `npm run check` 10/10 通过（新增 `mode-boundary.test.mjs`）；`npm run build` 通过，主 chunk 1670.33 kB / 537.48 kB gzip，`vendor-codemirror` 1620.34 kB / 554.76 kB gzip。
