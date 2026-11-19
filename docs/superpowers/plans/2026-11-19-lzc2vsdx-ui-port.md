# lzeditor UI 复用 lzc2vsdx 实现样式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 整站 UI（顶栏/侧栏/面板/对话框/设置界面）采用 lzc2vsdx 的 Nebula 组件级视觉签名（8px 圆角/38px 输入/0.6px 发丝线/弹簧微交互/深色玻璃弹窗/发光标题条/设置 200px 青发光导航），功能不变。

**Architecture:** 方案 A —— CSS 令牌级签名移植。保留 React 结构 + 全屏编辑器 + 功能逻辑；在 `tokens.css`/`ui.css`/`layout.css`/`panels.css`/`settings-dialog.css` 铺 lzc2vsdx 视觉签名，深色玻璃经 `themes.ts` 深色令牌注入（无 `[data-theme]` 块），设置弹窗经 `SettingsDialog.tsx` PANEL 常量改尺寸。不新增依赖。

**Tech Stack:** TypeScript + Vite + React；CSS 变量令牌；node:test 静态一致性测试（`tests/*.test.mjs`）。

**Spec:** `docs/superpowers/specs/2026-11-19-lzc2vsdx-ui-port-design.md`（执行者两份同读）

## Global Constraints

- 视觉签名照 **lzc2vsdx 实现**；结构/规范照 **DESIGN-1**（不矛盾处）。
- 主题机制保持：`--color-*` 语义令牌 + JS 内联 `applyTheme`；**无 `[data-theme]` 覆写块**。深色玻璃经 `themes.ts` 令牌 + CSS `var(--x, fallback)` 回退（浅色不透明）。
- 玻璃/发光色调用**固定青** `rgba(var(--tech-cyan-rgb), …)`（与既有 `--glow-*` 静态一致），accent 跟随留后续。
- 发丝线 `0.7→0.6px` **仅限** ui/layout/panels/settings-dialog 4 文件；globals/floating/welcome/read-mode/scroll-rail 及 `theme-revision.css` 的 `letter-spacing: 0.7px` 不动。
- 功能不变：不改编辑器内核、AI 功能、设置行为、布局切换；不新增依赖；不改 React 组件结构（弹窗圆角经 UiModal 默认值）。
- 全屏编辑器保留（不改成 1180px 居中）。
- 色标图标**跳过**（用户决策）。

## Review Focus

1. **设置弹窗尺寸**（§5.5）：改 `88vw`/max `1100`/`86vh` —— 钉 `PANEL_WIDTH='88vw'`、`PANEL_MAX_WIDTH=1100`、`PANEL_HEIGHT='86vh'`。→ Task 4 断言。
2. **设置导航激活**（§5.5）：从系统蓝（180px/44px）改 lzc2vsdx（200px/42px 青发光条）—— 钉 `.settings-nav-list` 宽 200px、`.settings-nav-row` 高 42px、激活青色发光条。→ Task 4 断言。
3. **深色玻璃弹窗**（§5.6）：`.ui-modal` 在深色玻璃、浅色不透明 —— 钉 `var(--modal-glass-bg, var(--color-bg-secondary))` 回退。→ Task 2 断言。
4. **发光标题条**（§5.3/5.4）：设置/对话框/侧栏分区标题前 `4×16px` 青发光条 —— 钉 `::before` 4px×16px。→ Task 2/3/4 断言。
5. **弹簧微交互**（§5.2/5.3）：按钮/导航悬停 `translateY` + 按下 `scale(0.97)` —— 钉 `.ui-btn` 悬停/按下的 transform。→ Task 1 断言。

---

### Task 1: 输入/选择/按钮原子 + 令牌（圆角/高度/发丝线/微交互）

**Files:**
- Modify: `src/styles/tokens.css`（`--radius-btn` 令牌）
- Modify: `src/styles/ui.css`（`.ui-btn`/`.ui-input`/`.ui-select-trigger`）
- Modify: `src/styles/layout.css`（`.library-search-input`/`.library-folder-rename-input`）
- Test: `tests/input-css-boundary.test.mjs`、`tests/ui-interactions.test.mjs`

**Interfaces:**
- Consumes: 既有 `--radius-sm`(8px)/`--radius-md`(12px)/`--ease-spring`/`--t-snap` 令牌。
- Produces: `--radius-btn` 令牌（Task 2/3/4 的按钮/输入圆角复用）；`.ui-input`/`.ui-select-trigger` 38px 契约（Task 2+ 不改）。

- [ ] **Step 1: 更新既有测试到新值（红）**

`tests/input-css-boundary.test.mjs`：
- 加 `assert.match(tokensCss, /--radius-btn:\s*var\(--radius-sm\)/, '按钮/输入圆角由 --radius-btn(8px) 提供')`
- 改 L40 `.ui-input` 高 `42→38`；L41 `.library-search-input` 高 `42→38`；L42 `.library-folder-rename-input` 高 `34`（保留）
- 改 L52 三输入 `border: 0.7px solid var(--color-border)` → `0.6px solid var(--color-border)`
- 改 L53 三输入 `border-radius: var(--radius-md)` → `var(--radius-btn)`

`tests/ui-interactions.test.mjs`：
- 改 L590 `.ui-input` 高 `42→38px`；L591 `.ui-input` border `0.7px→0.6px`
- 改 L610 `.ui-select-trigger` 高 `42→38px`；L611 border `0.7px→0.6px`

- [ ] **Step 2: 运行确认先红**

Run: `node --import tsx --test tests/input-css-boundary.test.mjs tests/ui-interactions.test.mjs`
Expected: FAIL（.ui-input 仍 42px/0.7px/radius-md）

- [ ] **Step 3: 改 `tokens.css` 加 `--radius-btn`**

`tokens.css` 圆角块：`--radius: var(--radius-md);` 旁加 `--radius-btn: var(--radius-sm); /* 按钮/输入 8px（lzc2vsdx） */`

- [ ] **Step 4: 改 `ui.css` 按钮/输入/选择**

- `.ui-btn`：`border-radius: var(--radius-md)` → `var(--radius-btn)`；加悬停 `transform: translateY(-1px)`（`--t-base`/`--ease-spring`）+ 按下 `:active { transform: scale(0.97) }`（`--t-snap`）。
- `.ui-input`：`height: 42px` → `38px`；`border-radius: var(--radius-md)` → `var(--radius-btn)`；`border: 0.7px` → `0.6px`。
- `.ui-select-trigger`：`height: 42px` → `38px`；`border-radius: var(--radius-md)` → `var(--radius-btn)`；`border: 0.7px` → `0.6px`。

- [ ] **Step 5: 改 `layout.css` 库输入**

- `.library-search-input`：`height: 42px` → `38px`；`border-radius` → `var(--radius-btn)`；`border 0.7px` → `0.6px`。
- `.library-folder-rename-input`：`height: 34px`（保留，树行功能原因）；`border-radius` → `var(--radius-btn)`；`border 0.7px` → `0.6px`。

- [ ] **Step 6: 运行测试转绿**

Run: `node --import tsx --test tests/input-css-boundary.test.mjs tests/ui-interactions.test.mjs`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add src/styles/tokens.css src/styles/ui.css src/styles/layout.css tests/input-css-boundary.test.mjs tests/ui-interactions.test.mjs
git commit -m "feat(ui): 输入/选择/按钮 lzc2vsdx 化 — 8px 圆角 + 38px 高 + 0.6px 发丝线 + 弹簧微交互（--radius-btn 令牌）"
```

---

### Task 2: 弹窗玻璃深色 + 圆角 14 + 发光标题条 + 面板发丝线

**Files:**
- Modify: `src/styles/themes.ts`（深色 `--modal-glass-*` 令牌）
- Modify: `src/styles/ui.css`（`.ui-modal` 玻璃/0.6px、`.ui-modal-title` 发光条）
- Modify: `src/components/ui/UiModal.tsx`（默认 `radius 12→14`）
- Modify: `src/styles/panels.css`（0.6px 发丝线）
- Test: `tests/lzc2vsdx-ui-port.test.mjs`（新增）

**Interfaces:**
- Consumes: `--radius-btn`（Task 1）、`--tech-cyan-rgb`、`--color-bg-secondary`。
- Produces: `--modal-glass-*` 深色令牌（仅本任务消费）；`.ui-modal` 玻璃契约。

- [ ] **Step 1: 写失败测试 `tests/lzc2vsdx-ui-port.test.mjs`（弹窗部分）**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const ui = read('src/styles/ui.css')
const themes = read('src/styles/themes.ts')
const modal = read('src/components/ui/UiModal.tsx')

// 深色玻璃弹窗：.ui-modal 用 --modal-glass-* 回退（浅色不透明）
assert.match(ui, /\.ui-modal\s*\{[\s\S]{0,500}?background:\s*var\(--modal-glass-bg,\s*var\(--color-bg-secondary\)\)/, '.ui-modal 必须玻璃回退（浅色不透明）')
assert.match(ui, /\.ui-modal\s*\{[\s\S]{0,500}?border:\s*0\.6px solid var\(--modal-glass-border,\s*var\(--color-border-soft\)\)/, '玻璃边 0.6px')
// 深色令牌在 themes.ts
assert.match(themes, /'--modal-glass-bg':\s*'rgba\(10,\s*22,\s*40,\s*0\.95\)'/, '深色玻璃底')
assert.match(themes, /'--modal-glass-border':\s*'rgba\(0,\s*212,\s*170,\s*0\.12\)'/, '深色玻璃青边')
// UiModal 默认圆角 14（lzc2vsdx）
assert.match(modal, /radius\s*=\s*14/, 'UiModal 默认圆角必须 14（lzc2vsdx）')
// .ui-modal-title 前 4×16px 青发光条
assert.match(ui, /\.ui-modal-title[\s\S]{0,400}?::before[\s\S]{0,200}?width:\s*4px;[\s\S]{0,60}?height:\s*16px;[\s\S]{0,200}?box-shadow:\s*0 0 6px rgba\(var\(--tech-cyan-rgb\),\s*0\.35\)/, '标题前 4×16px 青发光条')
console.log('modal port ok')
```

- [ ] **Step 2: 运行确认先红**

Run: `node --import tsx --test tests/lzc2vsdx-ui-port.test.mjs`
Expected: FAIL（玻璃/radius 14/发光条未实现）

- [ ] **Step 3: 改 `themes.ts` 深色对象加玻璃令牌**

dark 对象新增：`'--modal-glass-bg': 'rgba(10, 22, 40, 0.95)'`、`'--modal-glass-border': 'rgba(0, 212, 170, 0.12)'`、`'--modal-glass-inset': 'rgba(0, 212, 170, 0.06)'`。（浅色 parchment 不设 —— CSS 回退保证不透明。）

- [ ] **Step 4: 改 `ui.css` `.ui-modal` + `.ui-modal-title`**

- `.ui-modal`：`background: var(--color-bg-secondary)` → `var(--modal-glass-bg, var(--color-bg-secondary))`；`border: 0.7px solid var(--color-border-soft)` → `0.6px solid var(--modal-glass-border, var(--color-border-soft))`；深色时加 `box-shadow: inset 0 1px 0 var(--modal-glass-inset, transparent)`（并入现有 `--color-modal-shadow` 或独立）。无 `[data-theme]` 块。
- `.ui-modal-title`：加 `::before` `content:''; display:inline-block; vertical-align:middle; width:4px; height:16px; border-radius:2px; background:var(--color-primary); box-shadow:0 0 6px rgba(var(--tech-cyan-rgb),0.35); margin-right:8px;`（若标题已有 flex/结构，用 inline-block 兼容）。

- [ ] **Step 5: 改 `UiModal.tsx` 默认 radius**

`radius = 12` → `radius = 14`。

- [ ] **Step 6: 改 `panels.css` 发丝线**

`panels.css` 内 `0.7px` → `0.6px`（发丝边框，非 letter-spacing）。

- [ ] **Step 7: 运行测试转绿**

Run: `node --import tsx --test tests/lzc2vsdx-ui-port.test.mjs tests/ui-interactions.test.mjs`
Expected: PASS（ui-interactions 弹窗 fixture 传 radius=12 显式，默认改 14 不影响）

- [ ] **Step 8: 提交**

```bash
git add src/styles/themes.ts src/styles/ui.css src/components/ui/UiModal.tsx src/styles/panels.css tests/lzc2vsdx-ui-port.test.mjs
git commit -m "feat(ui): 弹窗 lzc2vsdx 化 — 深色玻璃面板 + UiModal 默认圆角 14 + 标题发光条 + 0.6px 发丝线"
```

---

### Task 3: 布局 chrome — 发光标题条 + rail 弹簧微交互

**Files:**
- Modify: `src/styles/layout.css`
- Test: `tests/lzc2vsdx-ui-port.test.mjs`（追加断言）

**Interfaces:**
- Consumes: `--tech-cyan-rgb`、`--ease-spring`。
- Produces: 无（最后布局任务）。顶栏渐变已符合（accent 跟随 color-mix，等价 lzc2vsdx border-image）；`.toolbar-btn` 弹簧已有（L105/L107），不改。

- [ ] **Step 1: 追加失败测试到 `tests/lzc2vsdx-ui-port.test.mjs`**

```js
const layout = read('src/styles/layout.css')
// 侧栏分区标题 4×16px 青发光条（inline-block，因标题非 flex 容器）
assert.match(layout, /\.sidebar-header-title[\s\S]{0,500}?::before[\s\S]{0,200}?width:\s*4px;[\s\S]{0,60}?height:\s*16px;[\s\S]{0,200}?box-shadow:\s*0 0 6px rgba\(var\(--tech-cyan-rgb\),\s*0\.35\)/, '侧栏标题前 4×16px 青发光条')
assert.match(layout, /\.library-section-title[\s\S]{0,500}?::before[\s\S]{0,200}?width:\s*4px;[\s\S]{0,60}?height:\s*16px;/, '库分区标题前 4×16px 发光条')
// rail-btn 弹簧微交互（现仅背景变，无 transform）
assert.match(layout, /\.rail-btn:hover[\s\S]{0,300}?transform:\s*translateY\(-1px\)/, 'rail-btn 悬停抬起')
console.log('layout port ok')
```

- [ ] **Step 2: 运行确认先红**

Run: `node --import tsx --test tests/lzc2vsdx-ui-port.test.mjs`
Expected: FAIL（发光条/rail 弹簧未实现）

- [ ] **Step 3: 改 `layout.css`**

- 侧栏分区标题：`.sidebar-header-title`、`.library-section-title` 加 `::before`（`content:''; display:inline-block; vertical-align:middle; width:4px; height:16px; border-radius:2px; background:var(--color-primary); box-shadow:0 0 6px rgba(var(--tech-cyan-rgb),0.35); margin-right:8px;`）。若标题是块级非 flex，用 inline-block 使发光条与文字同行（CSS-only；如父容器需 flex 才能对齐，仅在 TSX 加最小 class 并标注）。
- `.rail-btn`：`:hover` 加 `transform: translateY(-1px)`（`--ease-spring`/`--t-base`）；`:active` 加 `transform: scale(0.97)`（`--t-snap`）。
- 顶栏渐变：**不改**（已符合）。

- [ ] **Step 4: 运行测试转绿**

Run: `node --import tsx --test tests/lzc2vsdx-ui-port.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/styles/layout.css tests/lzc2vsdx-ui-port.test.mjs
git commit -m "feat(ui): 布局 chrome lzc2vsdx 化 — 分区标题发光条 + rail 按钮弹簧微交互"
```

---

### Task 4: 设置界面全面 lzc2vsdx 化

**Files:**
- Modify: `src/components/panels/SettingsDialog.tsx`（PANEL 常量）
- Modify: `src/styles/settings-dialog.css`（导航/缩略图/色盘/✓/玻璃卡/发光条）
- Test: `tests/settings-conformance.test.mjs`（重写）、`tests/design1-v2-conformance.test.mjs`、`tests/ui-polish-round3.test.mjs`、`tests/e2e/e2e.test.mjs`

**Interfaces:**
- Consumes: `--radius-btn`（Task 1）、`--modal-glass-*`（Task 2）、`--tech-cyan-rgb`。
- Produces: 无（最终任务）。

- [ ] **Step 1: 更新测试到 lzc2vsdx 值（红）**

`tests/settings-conformance.test.mjs`（重写为 lzc2vsdx 值）：
- `PANEL_WIDTH = '88vw'`、`PANEL_MAX_WIDTH = 1100`、`PANEL_HEIGHT = '86vh'`
- `.settings-nav-list` 宽 `200px`、背景 `var(--color-bg-secondary)`
- `.settings-nav-row` 高 `42px`
- 激活态青色发光条：`.settings-nav-row.active::before` 宽 `3px` 高 `22px`、`box-shadow: 0 0 8px rgba(var(--tech-cyan-rgb), 0.5)`、背景 `var(--color-primary)`
- `.theme-preview-thumb` 高 `100px`
- `.accent-circle` 宽/高 `64px`
- `.accent-check-icon` 字号 `20px`、颜色 `var(--color-on-primary)`（深色 ✓，非 #fff）
- `.settings-nav-row:hover` 含 `transform: translateY(-1px)`（弹簧，§5.3 扩展）

`tests/design1-v2-conformance.test.mjs`：
- 改设置导航断言：`width: 200px`（原 180px）、`.settings-nav-row` `height: 42px`（原 44px）、激活 `var(--color-primary)` 青色（原 system-blue）
- 改 `PANEL_MAX_WIDTH = 1280` → `1100`

`tests/ui-polish-round3.test.mjs`：
- 改 `PANEL_MAX_WIDTH 1280→1100`、`PANEL_HEIGHT '92vh'→'86vh'`

`tests/e2e/e2e.test.mjs`：
- 改弹窗尺寸断言：`min(92vw,1280px) × min(92vh,calc(100vh-40px))` → `min(88vw,1100px) × min(86vh,calc(100vh-40px))`；数学 `min(1440*0.88,1100)=1100`、`min(900*0.86,860)=774`

- [ ] **Step 2: 运行确认先红**

Run: `node --import tsx --test tests/settings-conformance.test.mjs tests/design1-v2-conformance.test.mjs tests/ui-polish-round3.test.mjs`
Expected: FAIL（仍 1280/92vh/180px/44px/128px/80px）

- [ ] **Step 3: 改 `SettingsDialog.tsx` PANEL 常量**

`PANEL_WIDTH = '92vw'` → `'88vw'`；`PANEL_MAX_WIDTH = 1280` → `1100`；`PANEL_HEIGHT = '92vh'` → `'86vh'`。

- [ ] **Step 4: 改 `settings-dialog.css`（全面 lzc2vsdx 化）**

- `.settings-nav-list`：`width: 180px` → `200px`；`background: var(--color-bg-white)` → `var(--color-bg-secondary)`；圆角 `--radius-md`。
- `.settings-nav-row`：`height: 44px` → `42px`；圆角 `--radius-sm`；`:hover` 加 `transform: translateY(-1px)`（`--ease-spring`/`--t-base`）+ `:active` `scale(0.97)`。
- `.settings-nav-row.active`：背景 `var(--color-system-blue-soft)` → `var(--color-primary-soft)`；`.active::before` 改为 3×22px、`background: var(--color-primary)`、`box-shadow: 0 0 8px rgba(var(--tech-cyan-rgb), 0.5)`；`.active .settings-nav-ico`/`.active .settings-nav-txt` 颜色 `var(--color-system-blue)` → `var(--color-primary)`。
- `.theme-preview-thumb`：高 `128px` → `100px`；圆角 `var(--radius-sm)`。
- `.accent-circle`：`80px` → `64px`；选中 `box-shadow: 0 0 0 3px rgba(var(--tech-cyan-rgb), 0.2), 0 0 16px rgba(var(--tech-cyan-rgb), 0.4)`；悬停 `translateY(-2px)`。
- `.accent-check-icon`：字号 `30px` → `20px`（保持 `--color-on-primary` 深色）。
- 分区标题加 `4×16px` 青发光条（`.settings-section-title` 前 `::before`，inline-block）。
- 设置按钮/输入圆角 `--radius-btn`。
- 卡片深色玻璃（复用 `--modal-glass-*` 回退）。

- [ ] **Step 5: 运行测试转绿**

Run: `node --import tsx --test tests/settings-conformance.test.mjs tests/design1-v2-conformance.test.mjs tests/ui-polish-round3.test.mjs`
Expected: PASS

- [ ] **Step 6: typecheck + 全量测试 + e2e**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: typecheck 0 错；全量通过；e2e 通过（含更新后的 `min(88vw,1100) × min(86vh,…)` 断言）

- [ ] **Step 7: 提交**

```bash
git add src/components/panels/SettingsDialog.tsx src/styles/settings-dialog.css tests/settings-conformance.test.mjs tests/design1-v2-conformance.test.mjs tests/ui-polish-round3.test.mjs tests/e2e/e2e.test.mjs docs/superpowers/specs/2026-11-19-lzc2vsdx-ui-port-design.md
git commit -m "feat(ui): 设置界面全面 lzc2vsdx 化 — 弹窗 88vw/1100/86vh + 导航 200px/42px 青发光 + 缩略图 100px + 色盘 64px + 玻璃卡"
```

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §5.1（令牌/发丝线）→ Task 1；§5.2（按钮/输入/弹窗圆角）→ Task 1/2；§5.3（顶栏渐变/弹簧/发光条）→ Task 3；§5.4（对话框玻璃/发光条/0.6px）→ Task 2；§5.5（设置全面 lzc2vsdx 化）→ Task 4；§5.6（深色玻璃令牌）→ Task 2；§5.7（TSX：PANEL 常量/UiModal 默认 14）→ Task 4/2。无遗漏。
- **步骤扫描**：每步一个可检查动作（写/改测试、跑红、改 CSS/TSX、跑绿、提交）；无「TBD」；发光条 inline-block 细节已写为可执行步骤；未逐字转写既有 CSS 全文。
- **类型一致**：`--radius-btn` Task 1 定义，Task 2/3/4 消费同名；`--modal-glass-*` Task 2 定义，Task 2/4 消费；PANEL 常量名不变（仅值）；UiModal `radius` 默认值 Task 2 改。一致。
- **Review Focus** 5 条各挂断言（弹窗尺寸→Task 4；导航激活→Task 4；深色玻璃→Task 2；发光条→Task 2/3/4；弹簧→Task 1）。已覆盖。
- **比例**：计划 4 任务，与 spec 相当，无逐值转写冗余。
