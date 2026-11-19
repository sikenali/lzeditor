# 设计文档 — lzeditor UI 复用 lzc2vsdx 实现样式 + DESIGN-1 规范（Nebula 组件级移植）

> 状态：**待批准**（批准前不写产品代码）
> 日期：2026-11-19
> 范围：**整站 UI**（顶栏/侧栏/面板/对话框/编辑器/欢迎页/AI 面板/设置界面）—— 用户「复用 lzc2vsdx 项目的 UI 实现样式 以及 DESIGN-1.md 的设计规范，重新对界面 UI 进行优化，功能不变」。
> 参考实现：`/home/jingle/opc/lzc2vsdx/frontend/src`（tokens.css / base.css / AppHeader.vue / SideNav.vue / UiModal.vue / SettingsModal.vue / settings/*.vue / TweakDrawer.vue）。
> 设计规范：`/home/jingle/opc/DESIGN-1.md`。

## 1. 需求与决策

用户请求：**复用 lzc2vsdx 项目的 UI 实现样式 以及 DESIGN-1.md 的设计规范，重新对界面 UI 进行优化，功能不变。**

brainstorming 澄清（用户三次拍板）：
1. **目标**：更贴近 **lzc2vsdx 的实现**（组件级视觉签名），而非以 DESIGN-1 文字为准；含设置界面。
2. **设置界面**：**全面 lzc2vsdx 化** —— 覆盖上次「严格对齐 §5/§6」的精确尺寸决策（保留 §6.1 页头/恢复默认等结构）。
3. **实施方式**：**方案 A — CSS 令牌级签名移植**（保留 React 结构 + 全屏编辑器 + 功能逻辑；CSS 层铺 lzc2vsdx 视觉签名）。

**不做**：不改功能逻辑；不改布局结构（保持 DESIGN-1 v2 全屏编辑器，不改成 lzc2vsdx 的 1180px 内容居中）；不新增依赖；不做 Vue 逐组件移植。

## 2. 目标 / 非目标 / 反目标

- **目标**：lzeditor 各界面视觉与 lzc2vsdx 实现一致（圆角/线宽/微交互/玻璃/发光标题条/设置导航）；功能与行为不变。
- **非目标**：不改编辑器内核、AI 功能、设置功能行为、布局模式切换；不改组件结构（React 组件保持）。
- **反目标（失败标准）**：引入功能回归；改动编辑器内核；把全屏编辑器改成 1180px 居中；新增运行时依赖；破坏主题切换。

## 3. 约束

- 视觉签名照 **lzc2vsdx 实现**；结构/规范照 **DESIGN-1**（不矛盾处）。
- 主题机制保持：`--color-*` 语义令牌 + JS 内联 `applyTheme`（**无 `[data-theme]` 覆写块**，AGENT.md §7 边界）；深色玻璃弹窗通过 `themes.ts` 深色令牌注入，不在 CSS 加 `[data-theme]` 块。
- 设置界面按用户决策采用 **lzc2vsdx 实现值**（覆盖刚批准的 §5/§6 尺寸）：弹窗 `88vw`/max `1100px`/`86vh`、导航 `200px`/条目 `42px`/青色发光激活条、缩略图 `100px`、色盘 `64px`、✓ 徽标 `20px`、卡片/按钮 `8px` 圆角、玻璃卡、发光标题条。保留 §6.1 页头结构（面包屑/30px Bold 标题/恢复默认按钮）。
- 既有测试钉的是 §5/§6 值，需随本变更更新到 lzc2vsdx 值（见 §6）。

## 4. 方式（Approaches）

| 方式 | 取舍 | 结论 |
|---|---|---|
| **A. CSS 令牌级签名移植** | 保留 React 结构/全屏编辑器/功能；CSS 层铺签名（8px 圆角/38px 输入/0.6px 线/弹簧微交互/玻璃 dark 弹窗/发光标题条/色标图标/设置 200px 青发光导航）。风险最低、可回退。 | **用户选定** |
| B. 逐界面逐组件移植 | 更字面镜像 lzc2vsdx 逐组件 scoped 样式；但侵入强、Vue scoped CSS 难套 React，回归风险高。 | 否 |
| C. 布局枢轴 1180px 居中 | 额外改全屏为 1180px 居中；推翻 DESIGN-1 v2 全屏 + 模式重构，侵入最大。 | 否 |

## 5. 变更清单（方案 A）

### 5.1 令牌与全局 — `src/styles/tokens.css`
- 新增按钮/输入圆角令牌 `--radius-btn: var(--radius-sm)`（8px）；卡片保持 `--radius-md`（12px）。
- 发丝线 `0.7px → 0.6px`（lzc2vsdx 用 0.6px）——**范围限定**在本重设计的 4 个文件（ui/layout/panels/settings-dialog），**不全局替换**（globals/floating/welcome/read-mode/scroll-rail 保持 0.7px，避免波及范围外界面及 `theme-revision.css` 的 `letter-spacing: 0.7px`）。builder-call。
- `--ease-spring`/`--t-snap` 已存在；新增微交互约定（悬停 `translateY(-1~2px)` + 按下 `scale(0.97)` @80ms，spring 缓动）。

### 5.2 UI 原子 — `src/styles/ui.css`
- `.ui-btn`：圆角 `--radius-md→--radius-btn`；悬停 `translateY(-1px)` + 按下 `scale(0.97)`（`--t-snap`/`--ease-spring`）。
- `.ui-input`：高 `42→38px`，圆角 `--radius-btn`。
- `.ui-select-trigger`：高 `42→38px`，圆角 `--radius-btn`。
- `.ui-modal`：深色玻璃面板（`--modal-glass-*` 令牌，见 5.6）；发丝线 0.6px。**圆角**：UiModal 默认 `radius 12→14`（lzc2vsdx UiModal 默认 14，作用于所有对话框 + 设置弹窗，一致）。builder-call。
- `.ui-check`/`.ui-switch` 保持（已 Nebula）。

### 5.3 布局 chrome — `src/styles/layout.css`
- 顶栏底部发光发丝渐变：**已符合**（lzeditor 现有 `color-mix(in srgb, var(--color-primary) 25%, transparent)`，与 lzc2vsdx `border-image` 同为 accent 跟随发光渐变；等价，不改）。builder-call。
- 弹簧微交互：`.toolbar-btn` 已有（悬停 `translateY(-1px)` L105 + 按下 `scale(0.97)` L107）；**扩展到** `.rail-btn`（现仅背景变，无 transform）与设置导航项。builder-call。
- 侧栏分区标题：加 `4×16px` 青色发光标题条（`::before`，`0 0 6px rgba(var(--tech-cyan-rgb),0.35)` 发光；因候选标题非 flex 容器，用 `display:inline-block; vertical-align:middle` 实现，CSS-only 不改 TSX）。目标选择器：`.sidebar-header-title`（大纲/预览/库）、`.library-section-title`。builder-call。
- 色标图标：**跳过**（用户决策 §8——lzeditor ~17 个格式化命令与 lzc2vsdx 的 2 工具模型不映射，强行着色为发明而非移植；图标保持单色）。

### 5.4 面板与对话框 — `src/styles/panels.css`
- 对话框面板圆角 `14px`（继承 UiModal 默认 12→14）、玻璃深色、发光标题条（`.ui-modal-title` 前 `4×16px` 青条，inline-block 实现）、发丝线 0.6px。

### 5.5 设置界面 — `src/styles/settings-dialog.css` + `src/components/panels/SettingsDialog.tsx`（全面 lzc2vsdx 化）
- 弹窗：`PANEL_WIDTH '92vw'→'88vw'`、`PANEL_MAX_WIDTH 1280→1100`、`PANEL_HEIGHT '92vh'→'86vh'`（lzc2vsdx `width="88vw" max-width="1100" height="86vh"`）。
- 导航：`.settings-nav-list` 宽 `180→200px`、背景 `white→--color-bg-secondary`（软底）、圆角 `--radius-md`；`.settings-nav-row` 高 `44→42px`、圆角 `--radius-sm`；激活态 **系统蓝→青色发光条**（3×22px，`box-shadow: 0 0 8px rgba(tech-cyan,0.5)`，图标/文字青）。
- 卡片：圆角 `--radius-md`、深色玻璃、分区标题加 `4×16px` 青发光条（恢复上次删除的小圆点装饰 → 改 lzc2vsdx 的发光条）。
- 缩略图：`128→100px`、圆角 `--radius-sm`。
- 色盘：`80→64px`、选中 `0 0 0 3px rgba(tech-cyan,0.2), 0 0 16px rgba(tech-cyan,0.4)` 光晕 + 悬停 `translateY(-2px)`。
- ✓ 徽标：`30→20px`，深色 on-color（lzc2vsdx `accent.on`）。
- 按钮/输入：`8px` 圆角。
- 保留 §6.1 页头结构（面包屑/30px Bold/恢复默认按钮）。

### 5.6 深色玻璃弹窗令牌 — `src/styles/themes.ts`
- 深色对象新增：`--modal-glass-bg: rgba(10,22,40,0.95)`、`--modal-glass-border: rgba(0,212,170,0.12)`、`--modal-glass-inset: rgba(0,212,170,0.06)`；`ui.css` `.ui-modal` 消费时用**回退** `var(--modal-glass-bg, var(--color-bg-secondary))` 等，保证浅色主题不透明（浅色不设 `--modal-glass-*`，回退到现有表面）。**无 `[data-theme]` 块**。builder-call。
- 玻璃色调用**固定青**（与既有 `--glow-*` 静态 `rgba(0,212,170,…)` 一致，lzeditor 的 `--tech-cyan-rgb` 不随 accent 变）；accent 跟随玻璃/发光系统留作后续增强，本设计不扩scope。builder-call。

### 5.7 TSX 微调
- 发光标题条优先用 CSS `::before`（避免 TSX 结构改动）；无图标着色改动（色标已跳过）。弹窗圆角经 UiModal 默认 `radius 12→14`（TSX `UiModal.tsx` 默认值），设置弹窗无需单独传 radius。

## 6. 验证

1. `npm run typecheck` 0 错；`npm test` 全量通过（更新钉 §5/§6 值的测试到 lzc2vsdx 值：`settings-conformance.test.mjs`、`design1-v2-conformance.test.mjs`、`ui-polish-round3.test.mjs`、`e2e/e2e.test.mjs` 的弹窗/导航/缩略图/色盘断言；**另更新** `input-css-boundary.test.mjs`、`ui-interactions.test.mjs` 的 `.ui-input` 0.7px/radius-md/42px 断言到 0.6px/radius-btn/38px——builder-check 发现这两个测试也钉了变更值）。
2. `npm run test:e2e` 通过（弹窗尺寸断言更新：`min(88vw,1100) × min(86vh,calc(100vh-40px))`）。
3. 浏览器手测浅/深两主题：整站无暖色/朱红残留，青色发光标题条/玻璃深色弹窗/弹簧微交互/设置 200px 青发光导航均生效；功能（编辑/AI/设置切换/恢复默认）不变。
4. 打包 1.3.1 安装盒上核对（视合并进度）。

**输入一致性**：`.library-search-input`/`.library-folder-rename-input`（layout.css，现 42px/0.7px/radius-md）随本设计同步为 38px/0.6px/radius-btn，避免应用内两套输入样式（builder-call，一并更新 input-css-boundary 相应断言）。

## 7. 已知取舍与风险

- 设置界面从刚批准的 §5/§6（1280/92vh、180px/44px 系统蓝、128px、80px、30px ✓）改为 lzc2vsdx 实现值（88vw/1100/86vh、200px/42px 青发光、100px、64px、20px ✓）——**用户明确选择「全面 lzc2vsdx 化」**，属规范优先级变更（lzc2vsdx 实现 > DESIGN-1 文字，对设置界面）。
- 全屏编辑器保留（DESIGN-1 v2 认可；不改成 lzc2vsdx 1180px 居中）。
- 既有 `design1-v2-conformance`/`ui-polish-round3`/`e2e` 中「§5.1 1280/92vh」「§5.3 44px」断言随本次改为 lzc2vsdx 值。
- builder-check 裁决（我的 call，写入文档）：modal 圆角改 **UiModal 默认 12→14**（lzc2vsdx UiModal 默认 14，作用于所有弹窗）；玻璃用回退 var 保浅色不透明 + 固定青（与既有 `--glow-*` 静态一致，accent 跟随留后续）；0.6px 限定 4 文件不全局；发光条 inline-block 实现；库输入同步 38px（folder-rename 34px 保留，树行功能原因）。

## 8. 用户决策汇总（brainstorming）

| 决策 | 结论 |
|---|---|
| 目标 | 更贴近 lzc2vsdx 实现（组件级签名），含设置界面 |
| 设置界面 | 全面 lzc2vsdx 化（覆盖 §5/§6 精确尺寸，保留 §6.1 页头结构） |
| 实施方式 | A：CSS 令牌级签名移植（保留 React 结构 + 全屏编辑器 + 功能不变） |
| 色标图标 | **跳过**（~17 命令与 lzc2vsdx 2 工具模型不映射；图标保持单色） |
