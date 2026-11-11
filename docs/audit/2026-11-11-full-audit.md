# lzeditor 全面审计报告（2026-11-11）

对 4 个维度做只读审计：前后端对接、按钮/标签联调、冗余文件、UI 与 DESIGN.md 差异。

## 1. 前后端功能对接 — ✅ 100% 对接，无功能性断点

项目「前后端」拆成两条不相交链路：
- **Electron IPC**（渲染进程↔主进程）：**10/10 channel 全部双向咬合**（窗口控制、设置、文件读写、菜单事件），参数契约字段级一致。
- **HTTP**（前端→本地 :3001）：前端**零调用**，服务仅保留 `GET /health`、`GET /api/health` 供 LPK 平台健康检查消费，属预期设计。

4 项信息级观察（非断点）：平台健康端点前端不调用（预期）；`platform` 字段暴露未读（闲置）；`DATA_DIR` 无契约（文档走前端 localStorage）；`server/core` 是遗留 ELF 产物。

## 2. 功能按钮/标签联调 — 1 处整体失效 + 3 处标签不符 + 1 处重复渲染

### 失效（点击无效果）
- **[高] WYSIWYG 模式下整条工具栏命令失效**：`wysiwyg` 开关后渲染 `<MilkdownEditor>`，但它从不注册 editor facade，`getEditorFacade()` 为 null → 粗体/斜体/删除线、格式菜单（标题/清除/列表/引用）、插入菜单（引言/引用）、查找/替换/跳转、大纲点击全部静默 no-op（`editorActions.tsx:217-229`、`SearchPanel.tsx:42`、`SidebarOutline.tsx:54-56`）。图片/链接/代码/公式等走 fallback 分支仍能用 → 同栏有的能用有的不能。
- **[高] 左侧导航模式 history 重复渲染**：`LeftNav.tsx:63` 对 history 设 `showRightPanel=true`，绕过 `App.tsx:496` 外层条件（`showRightPanel` 短路），右栏 `App.tsx:498` 与中心内容 `App.tsx:428-430` 各渲染一份 `HistoryPanel`。**本次任务 H 的修复只排除了 `appMode==='history'&&navMode!=='left'` 这一 OR 项，未排除 `showRightPanel` 短路，修复不彻底。**

### 标签与实际功能不符
- **[中] 关于页「开源许可」死链**：`AboutSettingsTab.tsx:63` `<a href="/licenses/THIRD_PARTY_NOTICES.md">` 在 `public/`、`dist/` 都不存在 → 404。
- **[中] 文档库 Git/博客/GitBook 导入名不副实**：`LibraryPanel.tsx:70-128` + `ImportButtons.tsx:26/42/58` 三个「连接…」按钮打开的**都是本地 md 文件选择器**，与「连接 Git 仓库/从博客导入/从 GitBook 导入」不符。
- **[低] 新建菜单「新建文件-模板」文案误导**：`editorActions.tsx:19` 点击打开的是「文件」对话框，非直建模板。

### 观察（非死按钮）
- 表格结构菜单 7 项源码模式永久置灰（`getTableContext()` 恒 null，故意禁用，可考虑隐藏）。

## 3. 冗余文件/代码 — 高置信度可回收 ~600MB+

### 高置信（未引用/遗留）
- **`src/additional/plugins/` 整簇 + `i18n/strings.ts` + `utils/match-words.ts` + `additional/index.ts` + `additional/milkdown/index.ts`**：约 1560 行，从入口不可达（`MilkdownEditor.tsx` 只引 `@milkdown/kit`，不引 plugins）。**注意 `additional/milkdown/MilkdownEditor.tsx` + `milkdown.css` 是活的（wysiwyg 模式在用），勿删。**
- **`server/core`**：46MB core dump（ELF 崩溃转储），`.gitignore` 忽略。
- **`lzc/*.lpk`（6 个 ~464MB）+ `lzc/_lpk_content/` + `lzc/_runtime_cache/`**：构建残留，`.gitignore` 忽略。
- **`electron/{api,main,preload}.js` + `.d.ts`（6 个）**：`tsc` 编译产物，与 `.ts` 源并存。

### 中置信（需确认）
- **`src/utils/pendingSave.ts`**（65 行）、**`src/utils/split.ts`**（38 行）：生产零引用，仅测试文本/import。
- **`buildCM6Extensions` 死导出**（`cm6-extensions.ts`）：生产无人 import（CodeEditor 用 `createCm6Settings().build`），仅测试文本断言。
- **双编辑器并存**：CM6 源码 vs Milkdown WYSIWYG（`wysiwyg` 开关），Milkdown 配套插件系统未接入。
- **双排版主题轨道**：`styles/themes.ts`（backward-compat）vs `styles/typography-themes.ts`（1051 行权威）。
- **4 个面板本地重定义 `UDSection`/`UDSettingRow`**（LinkDialog/CodeDialog/ChartDialog/ImageDialog），未复用 `ui/sections.tsx`。

### 无风险（已核实非冗余）
`mdToHtml`/`render`、`mdOutline`/`outline`、三个 store、全部 `src/services/*`（动态 import 在用的）、全部 CSS（`@import`/`main.tsx` 核实在用）、`public/{favicon.svg,logo.svg,icon.png}`、全部 `src/content/*.md`。

## 4. UI 与 DESIGN.md 差异 — 合规约 24 处，差异 6 处

### 合规
双色板（Light/Dark 逐项一致）、圆角/过渡/8px 网格、TopNav+PageFooter 骨架、设置中心（§5）、主题管理（§6）、UiModal/UiInput/UiSwitch/UiSelect/UiSelectCard（§8.1-8.5）、Toast（§9 全达标）、深色检查清单（§10.2，6/7）。

### 差异
- **[中] 深色强调色地板**：`useTheme.ts:83-89`+`themes.ts:445-451` 只提亮两个红色，非红色预设（鎏金/玉绿/云蓝/黛墨）深色下直接写成暗色；黛墨 `#2F3640` 对 `#17171A` 对比度仅 ~1.5:1（§7 要求 4.5:1）。
- **[中] 顶栏标签按钮 ★**：`layout.css:77-96` 实际 76×49 纵向、图标 21/标签 12、圆角 8；hover 无底色无位移；激活灰底 `rgba(0,0,0,0.08)` 非 `--color-primary-soft`；无 `aria-current`（§2.3.3/2.3.4 要求 12×18 横排、15px/500、primary-soft 激活）。
- **[低] UiCheck 白勾实心圆**：`ui.css:253-257` 用白色 ✓ 非主色 ✓（§8.3）。
- **[低] UiModal 无离开动画**：`ui.css:29-34` 仅 `ui-pop-in`（§8.1）。
- **[低] 深色硬编码**：`panels.css:757,766,1141,1155` `.history-bar-body` 近白、`read-mode.css:248` `.version-bar` 亮蓝，无主题覆写（§10.3）。
- **[低] SideNav 按钮 40px 图标-only**：`layout.css:1462-1493` 40×40 无文字标签（§2.2 要求 56×56+11px 标签；激活底色已用 primary-soft ✅）。

### 不适用（约 9 节，未牵强对照）
§2.3.2 六星色板、§3 上传页、§4 结果页、§A.6/A.7/A.9/A.11/A.12/A.13/A.14 上传/微前端/结果页场景、§8.6 Pagination（单文档编辑器无数据表格）。
