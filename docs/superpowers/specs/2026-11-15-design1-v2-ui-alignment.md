# DESIGN-1.md v2 视觉规范应用到 lzeditor —— 设计文档

> 日期：2026-11-15
> 规范来源：`/home/jingle/opc/DESIGN-1.md`（bid-platform 统一设计规范 v2 · 科技紧凑版）
> 目标项目：`lzeditor`（React + Vite + Electron Markdown 编辑器）

## 1. 意图与为什么

lzeditor 已有一套从 bid-platform 继承的 `--color-*` token 系统（parchment/dark 双主题，
由 `useTheme` → `themes.ts` 运行时写入 `<html>`），界面整体已接近 DESIGN.md 早期版本。
本次把视觉规范**升级到 DESIGN-1.md 的 v2「科技紧凑版」**，重点是：

- **设置中心弹框**：侧栏收敛到 180px/44px，激活态改为系统蓝（`#007AFF`）+ 左侧 3px accent 条，
  弹框最大宽 1280px。
- **全部弹框/对话框**：圆角统一 12px（v2 §8.1），阴影改为**主题感知**（浅色柔和、深色深空底 +
  青绿内发光），修复当前 `0 12px 40px rgba(0,0,0,0.2)` 硬编码阴影在浅色下「割裂」、深色下「偏浅」的问题。
- **整体 chrome**：把顶栏/面板/状态栏等悬浮表面的阴影、内描高光统一到主题感知 token，
  深色模式有正确层次；其余已符合 v2 的（背景微透+文字变色激活态、无下划线指示器）保持不变。

## 2. 目标 / 非目标 / 反目标

### 目标
- 设置中心与全部对话框严格对齐 v2 §5 / §8.1（尺寸、圆角、阴影、导航激活态、系统蓝）。
- 弹框与悬浮面板阴影主题感知：浅色 Light `0 8px 40px rgba(0,0,0,0.1)`；深色 Dark
  `0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(0,212,170,0.08)`。
- 全局圆角体系对齐 v2（sm=8 / md=12 / lg=16 / xl=20，新增 xs=4）。
- 全局键盘焦点环改用系统蓝 `#007AFF`（v2 §1 焦点环用途）。
- 新增 `--color-system-blue` / `--color-system-blue-soft` / 青绿光效 `#00D4AA` token。
- 深色模式下所有弹框、面板、tooltip 的可读性与层次达标（v2 §10 检查清单）。

### 非目标（明确不做）
- 不重写顶栏/工具栏的交互结构（lzeditor 是编辑器，不是 bid 平台的门户+子应用壳；
  v2 §2.1 的毛玻璃顶栏与微光分割线是导航型 TopNav 的特征，对一个密集编辑工具条收益低、风险高）。
- 不迁移布局模式（topbar/sidebar 已存在且工作正常，v2 §2 的两种布局不新增）。
- 不动编辑器的内容排版（typography-themes.ts、read-mode.css 的内容样式与本文档无关）。
- 不把「上传页/结果页」结构引入 lzeditor（lzeditor 没有上传/结果流程）。

### 反目标（失败标准）
- 浅色主题下出现「深空窗口」割裂感（v2 §8.1 明令禁止：阴影不得无条件硬编码深空风）。
- 任何弹框在深色模式下边框/文字对比度跌破 v2 §10 要求。
- 改动破坏现有功能（打开/关闭弹框、主题切换、设置即时生效落盘）。

## 3. 约束

- 弹框外壳统一走 `UiModal`（`src/components/ui/UiModal.tsx` + `src/styles/ui.css`），
  **禁止**在 UiModal 外另写 `<teleport>` overlay（v2 §8.1 / §5.1）。
- 主题感知靠现有机制：`themes.ts` 的 `themeTokens`（parchment/dark 双对象）+ `useTheme` 内联写入。
  新增 token 必须同时写进 `tokens.css :root`（默认/浅色）与 `themes.ts` 两个主题对象（深色），
  禁止在 CSS 里加 `[data-theme]` 覆写块（color-tokens.css 头注释：主题边界）。
- 弹框/面板阴影必须随主题切换，浅色与深色用同一套选择器、不同 token 值。
- 圆角体系 v2：xs=4 / sm=8 / md=12 / lg=16 / xl=20 / full。**重映射全局 `--radius-*`** 到 v2 体系
  （§5.6），弹框外壳统一 12px（§5.2）。

## 4. 方案（Approaches）

用户已选定 **「整个应用外观」** 范围。此前考虑的三种范围：

1. **仅设置中心**（最窄）：只改 SettingsDialog + UiModal 外壳。未选 —— 无法覆盖用户强调的
   「其他的弹框界面组件」。
2. **设置中心 + 全部弹框组件**（中）：对齐 UiModal + 全部对话框到 v2。被「整个应用外观」覆盖。
3. **整个应用外观**（选定）：在 2 的基础上，把顶栏/面板/状态栏等 chrome 的阴影与高光
   统一到主题感知 token；顶栏已符合 v2 的激活态（背景微透+文字变色）保持不变。

选定方案权衡：整体 chrome 的「激活态」当前已与 v2 一致（无下划线、背景微透+变色），
因此额外工作量集中在**主题感知阴影/高光**与**新增 token**，而非结构改动 —— 风险可控、收益明确
（修复深色模式层次不足）。

## 5. 具体改动（how）

### 5.1 Token（`src/styles/tokens.css` + `src/styles/themes.ts`）

新增以下 token，浅色/深色各写一份（同一 token 名，两主题值不同则主题感知）：

| token | parchment / Light | dark / Dark | 用途 |
|-------|-------------------|-------------|------|
| `--color-system-blue` | `#007AFF` | `#007AFF`（共用） | 设置导航激活 / 焦点环 |
| `--color-system-blue-soft` | `rgba(0,122,255,0.10)` | `rgba(0,122,255,0.10)`（共用） | 系统蓝浅背景 |
| `--color-glow` | `#00D4AA` | `#00D4AA` | 青绿光效（弹框内发光） |
| `--color-modal-shadow` | `0 8px 40px rgba(0,0,0,0.1)` | `0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(0,212,170,0.08)` | 弹框/对话框阴影（§8.1） |
| `--color-popover-shadow` | `0 4px 24px rgba(0,0,0,0.10)` | `0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(0,212,170,0.05)` | 面板/下拉/浮层阴影 |
| `--color-inset-highlight` | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.05)` | 卡片顶部内描高光（浅色明显/深色极弱） |

> `--color-glow` 即 v2 的青绿光效 `#00D4AA`，深色弹框内发光用它。

### 5.2 UiModal（`ui.css` + `UiModal.tsx`）

- 默认 `radius` prop：`18` → `12`。
- 默认 `shadow`：改为 `var(--color-modal-shadow)`（随主题感知）。UiModal 的 `shadow` prop 保留，
  调用方仍可覆盖（设置中心不再需要单独传更浅阴影，直接继承默认即可）。
- `.ui-modal`：`box-shadow: var(--color-modal-shadow)`；`border-radius` 已由 inline style 注入，
  改默认值即可。背景保持 `var(--color-bg-secondary)`（§5.1）。
- 头部 `.ui-modal-icon` 48px / 标题 22px / 副标题 13px 已符合 §5.2，不动。

### 5.3 设置中心（`SettingsDialog.tsx` + `settings-dialog.css`）

- `PANEL_MAX_WIDTH`：`1400` → `1280`（§5.1）。`PANEL_WIDTH='92vw'`、`PANEL_HEIGHT='92vh'` 已符合。
- `.settings-panel-shell` 内边距：`8px 28px 24px` → `8px 32px 24px`（§5.1 padding 32px 36px 的容器近似），
  gap 保持 20px（§5.3 结构 `.settings-body` flex-row gap:20）。
- `.settings-nav-list`：`width: 240px` → `180px`（§5.3）；`padding: 16px` → `8px`；
  `border-radius: 16px` → `12px`；`gap: 4px` → `2px`。
- `.settings-nav-row`：`height: 52px` → `44px`；`padding: 0 20px` → `0 12px`；
  `border-radius: 12px` → `8px`；`gap: 14px` → `10px`。
  - 激活态改为系统蓝：`background: var(--color-system-blue-soft)`，图标+文字 `var(--color-system-blue)`，
    `font-weight: 600`，并加 `::before` 左侧 3px accent 条（`--color-system-blue`）。
  - hover 保持 `var(--color-bg-secondary)`。
- `.settings-nav-ico`：`font-size: 20px` → `18px`（§5.3 图标 18px）；`width: 22px` → `20px`。
- `.settings-nav-txt`：`font-size: 15px` → `14px`（§5.3 文字 14px）。
- 子标签 `.settings-subtabs` / `.settings-subtab`：不动（页内分段控件，v2 §2.3.4 C 型已符合）。

### 5.4 其余对话框（自动继承 UiModal 变更）

图片/链接/代码/公式/图表/表情/导出/文档库/文件 均使用 `UiModal`，radius + shadow 自动对齐，
无需逐文件改。**历史面板不在此列**：`HistoryPanel` 不挂 UiModal，根节点是 `.history-main-panel`
（`panels.css:993`，`flex:1` 全高布局面板，无圆角/阴影/背景），是**内联面板**而非弹框 —— 无需
弹框类圆角/阴影改造，排除出本规范（`.history-main-panel` 保持原样）。
`ud-*` 内容类不涉及弹框外壳尺寸/阴影，不动。

### 5.5 Chrome 主题感知阴影/高光（`layout.css` / `panels.css` / `floating.css` / `read-mode.css`）

把悬浮表面（非 hover 微反馈）的硬编码阴影换成主题感知 token：

| 位置 | 当前 | 改为 |
|------|------|------|
| `.toolbar-submenu`（下拉） | `var(--shadow-modal)` | `var(--color-popover-shadow)` |
| `.toolbar-icon-only .toolbar-btn[data-title]:hover::after`（tooltip） | `0 2px 12px rgba(0,0,0,0.25)` | `var(--color-popover-shadow)` |
| `.statusbar-action/.statusbar-collapse[data-title]:hover::after`（tooltip） | `0 3px 14px rgba(0,0,0,0.28)` | `var(--color-popover-shadow)` |
| `.sidebar-outline`（大纲面板） | `0 2px 12px rgba(0,0,0,0.12)` | `var(--color-popover-shadow)` |
| `.sidebar-preview-wrapper`（预览面板） | `0 2px 12px rgba(0,0,0,0.12)` | `var(--color-popover-shadow)` |
| `.search-panel-inner` | `0 -4px 22px rgba(0,0,0,0.12)` | 保留方向，改 `var(--color-popover-shadow)` |
| bottom dock 面板 | `0 -2px 16px rgba(0,0,0,0.08)` | 保留方向，改 `var(--color-popover-shadow)` |
| `.ai-panel` / `.slash-command` | `var(--shadow-lg)` | `var(--color-popover-shadow)` |

卡片顶部内描高光（浅色白 / 深色极弱）：把 `inset 0 1px 0 rgba(255,255,255,0.x)` 的高亮值
改为 `var(--color-inset-highlight)`，使深色下不再出现「白描边」假象。

**扫除规则（交给实现者，保证穷尽）**：在上述五个 chrome CSS 文件（layout.css / panels.css /
floating.css / read-mode.css / settings-dialog.css）里 `grep` 两类模式 ——
① `inset 0 1px 0 rgba(255,255,255`；② 悬浮表面的 `box-shadow: 0 …rgba(0,0,0,…)`（非 hover 微反馈）。
把 ① 的白色高亮替换为 `var(--color-inset-highlight)`；把 ② 的阴影替换为
`var(--color-popover-shadow)`（或弹框类用 `var(--color-modal-shadow)`）。
**排除**：hover/active 的 1px 级微反馈阴影（`0 1px 3px` / `0 2px 8px` 这类）不改 —— 它们在两主题下
都是细微层次，改与不改视觉差异可忽略，且改动面大。

> 顶栏/工具栏/状态栏/页脚的**激活态**已符合 v2（背景微透+文字变色、无下划线、hover 位移 ≤2px），
> 本次**不调整**（frontend-design 的克制原则：改动只为收益，不为风格化）。

### 5.6 全局圆角体系重映射（`tokens.css` `:root`）

| 现 token | 现值 | 改为（v2） |
|----------|------|-----------|
| `--radius-xs` | （不存在） | `4px`（新增） |
| `--radius-sm` | `6px` | `8px` |
| `--radius-md` | `10px` | `12px` |
| `--radius-lg` | `14px` | `16px` |
| `--radius-xl` | `18px` | `20px` |
| `--radius-2xl` | `24px` | `24px`（不变） |
| `--radius-full` | `9999px` | 不变 |

- `--radius`（=`var(--radius-md)`）随 md 变 12px。所有消费方（`ui-btn`/`ui-input`/`ui-select`/
  `.ud-btn`/`.toolbar-submenu-item` 等）自动对齐，无需逐条改。
- **注意**：`.ui-modal` 的圆角由 `UiModal` 的 `radius` prop 以 inline style 注入，不走 `--radius-*`，
  所以 §5.2 仍须把默认值 `18` → `12`（v2 §8.1 弹框统一 12px，不被 xl=20 带走）。

### 5.7 全局焦点环改用系统蓝

- 新增 token `--color-focus-ring: var(--color-system-blue)`（两主题共用）。
- 把全应用 `:focus-visible` / `:focus` 的外圈环色从 `var(--accent-a60)` / `color-mix(... var(--color-primary) ...)`
  改为 `var(--color-focus-ring)`，内圈 `var(--color-bg-white)` 保持（保证环与内容对比）。
- 涉及的已知规则：`ui.css` `.ui-btn/.ui-switch/.ui-modal-close/.ui-input-clear/.ui-check/.ui-select-card:focus-visible`、
  `layout.css` `.toolbar-submenu-item:focus-visible`、`.outline-jump-btn:focus-visible` 等；
  实现者以 `grep -rn "focus-visible\\|:focus" src/styles` 穷尽，凡外圈环用强调色/主色的都改系统蓝。
- **语义说明（用户已确认）**：焦点环不再跟随用户强调色，统一为系统蓝 —— 这正是 v2 §1 的规范意图
  （系统蓝 = 设置导航激活 / 焦点环）。焦点环是「可达性指示」，不参与强调色语义，改动安全。

## 6. 验收清单

- [ ] 设置中心：侧栏 180px / 条目 44px / 系统蓝激活 + 3px 左条 / 弹框最大宽 1280px。
- [ ] UiModal 默认圆角 12px，阴影 `var(--color-modal-shadow)`。
- [ ] 全局 `--radius-*` 重映射为 4/8/12/16/20，消费方自动对齐。
- [ ] 全局键盘焦点环为系统蓝 `#007AFF`。
- [ ] 浅色下弹框阴影柔和 `0 8px 40px rgba(0,0,0,0.1)`，无深空割裂感。
- [ ] 深色下弹框阴影深空 + 青绿内发光，边框对比度 ≥ 3:1。
- [ ] 全部 UiModal 弹框（图片/链接/代码/公式/图表/表情/导出/文档库/文件）圆角/阴影随 UiModal 对齐。
- [ ] 主题切换（parchment/dark）不破版：弹框、面板、tooltip 层次清晰。
- [ ] 新增 token 在 `tokens.css` 与 `themes.ts` 两处同步，无 `[data-theme]` 覆写块。
- [ ] `npm run check`（typecheck + test）通过。

## 7. 交给实现者的边界

- 实现者可自行微调间距（±4px）以贴合视觉，但不得改 token 色值、弹框尺寸语义（92vw/92vh/1280px）。
- 设置导航激活态的 3px 左条用 `::before` 实现，避免新增 DOM。
- 若某处悬浮阴影当前已走 `--t-*` 主题对（如 `.toolbar-submenu` 用 `--shadow-modal`），
  实现者判断后可直接改用新增 token，无需保留旧值。
- 不新建组件、不改组件 props 语义（`UiModal.shadow` 保留覆盖能力）。
