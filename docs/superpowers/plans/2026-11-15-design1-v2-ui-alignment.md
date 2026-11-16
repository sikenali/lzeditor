# DESIGN-1.md v2 视觉对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 DESIGN-1.md v2「科技紧凑版」视觉规范应用到 lzeditor：主题感知弹框阴影、设置中心系统蓝导航、全局圆角 v2 体系、全局焦点环系统蓝、chrome 悬浮表面主题感知阴影。

**Architecture:** 全部为 token + CSS 选择器 + 两个 TSX 常量改动（UiModal 默认 radius、SettingsDialog maxWidth）。无新组件、无新逻辑。主题感知靠 `themes.ts` 双对象 + `useTheme` 内联写入（已验证 `applyTheme` 遍历 `themeTokens[type]` 逐个 setProperty）。

**Tech Stack:** React 19 + TypeScript + Vite + Vitest（node --test + happy-dom）。测试为「边界测试」：读 CSS/TSX 源文本断言 token/选择器值（`tests/*.test.mjs`），无 DOM 渲染断言（除 ui-interactions 用 happy-dom）。

**Spec:** `docs/superpowers/specs/2026-11-15-design1-v2-ui-alignment.md`（实现者须与本文档一起读，本计划从 spec 立论）

## Global Constraints

- 主题感知 token 必须**同时**写进 `src/styles/tokens.css :root`（parchment 默认值）与 `src/styles/themes.ts` 的 `parchment`、`dark` 两个对象（`applyTheme` 遍历 `themeTokens[type]` 内联写入，缺一个主题对象则该主题拿不到值）。
- 禁止新增 `[data-theme]` 覆写块（`color-tokens.css` 头注释主题边界；`theme-boundary.test.mjs` 断言 `color-tokens.css` 无 `[data-theme]`）。
- 圆角体系 v2：xs=4 / sm=8 / md=12 / lg=16 / xl=20。弹框外壳统一 12px（UiModal radius prop，不走 `--radius-*`）。
- 弹框外壳统一 `UiModal`，禁止在 UiModal 外另写 teleport overlay（`ui-atoms.test.mjs` 已断言每个弹框渲染 `<UiModal>`）。
- 焦点环语义（用户已确认）：键盘 `:focus-visible` 环色改系统蓝 `#007AFF`；**输入框/下拉的 focus 边框与外发光保持主色**（§8.2/§10.2 明确「主色边框+外发光」，与键盘导航环是两回事）。
- 测试命令：`npm test`（`node --import tsx --test tests/*.test.mjs`）；全量 `npm run check`（typecheck + test）。

## Review Focus

Spec 暗示但无任务测试覆盖、最可能咬到使用者的五类：

1. **浅色主题弹框阴影**：§8.1 明令禁止「深空窗口」割裂感 —— 浅色必须 `0 8px 40px rgba(0,0,0,0.1)`（柔和），不是深空。→ Task 2 断言 `--color-modal-shadow` 在 parchment 主题为柔和浅值。
2. **深色主题弹框阴影**：§8.1 深色必须深空底 + 青绿内发光 `inset 0 1px 0 rgba(0,212,170,0.08)`。→ Task 2 断言 dark 主题的 modal-shadow 含 `rgba(0,212,170` 内发光。
3. **设置导航激活态可辨识**：系统蓝激活 + 3px 左条，条目 44px 紧凑（§5.3）。→ Task 3 断言 `.settings-nav-row.active` 用 `--color-system-blue-soft` 底 + `--color-system-blue` 文字 + `::before` 3px 左条，条目 height 44px。
4. **设置弹框最大宽**：§5.1 = 1280px（不是 1400）。→ Task 2/3 断言 `PANEL_MAX_WIDTH = 1280` 且 UiModal 渲染 `min(92vw, 1280px)`。
5. **输入框 focus 外发光必须保持主色**：§8.2/§10.2 明确输入框 focus = 主色边框+外发光，与键盘导航环（系统蓝）是两回事；实现者若把输入框外发光也改成系统蓝会破坏 §8.2。→ Task 4 断言 `.ui-input:focus-within` 外发光仍 `color-mix` 主色。

---

### Task 1: 主题 token 扩展（system-blue / glow / 阴影主题对 / focus-ring / 圆角重映射）

**Files:**
- Modify: `src/styles/tokens.css:41-43`（`--radius-*`）、`:root` 追加 token
- Modify: `src/styles/themes.ts` `parchment` + `dark` 两对象追加 token
- Test: `tests/design1-v2-conformance.test.mjs`（新建，本任务 + 后续任务共用）
- Modify: `tests/input-css-boundary.test.mjs:32`（`10px`→`12px`）
- Modify: `tests/ui-interactions.test.mjs:594`（`10px`→`12px`）

**Interfaces:**
- Produces（后续任务依赖的 token）：`--color-system-blue` / `--color-system-blue-soft` / `--color-glow` / `--color-modal-shadow` / `--color-popover-shadow` / `--color-inset-highlight` / `--color-focus-ring`；`--radius-xs:4px`、`--radius-sm:8px`、`--radius-md:12px`、`--radius-lg:16px`、`--radius-xl:20px`。

- [ ] **Step 1: 更新两个「圆角 10px」断言到 12px，并新增 token 一致性测试**

修改 `tests/input-css-boundary.test.mjs:32`：`/--radius-md:\s*10px/` → `/--radius-md:\s*12px/`（消息改「圆角 12px 由 --radius-md 提供」）。
修改 `tests/ui-interactions.test.mjs:594`：同改 `12px`。
新建 `tests/design1-v2-conformance.test.mjs`：

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const tokens = read('src/styles/tokens.css')
const themes = read('src/styles/themes.ts')

// 圆角 v2 体系
for (const [t, v] of [['--radius-xs','4px'],['--radius-sm','8px'],['--radius-md','12px'],['--radius-lg','16px'],['--radius-xl','20px']]) {
  assert.match(tokens, new RegExp(`${t}:\\s*${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`), `Missing ${t}=${v}`)
}
// 主题不变 token（system-blue / glow / focus-ring）在 tokens.css 与两个主题对象
for (const t of ['--color-system-blue','--color-system-blue-soft','--color-glow','--color-focus-ring']) {
  assert.match(tokens, new RegExp(t + ':'), `Missing ${t} in tokens.css`)
  assert.match(themes, /parchment/, 'themes.ts must define parchment')
}
// 主题感知阴影：必须存在于两个主题对象，且 dark 与 parchment 值不同
const block = (name) => themes.slice(themes.indexOf(`${name}: {`), themes.indexOf('}', themes.indexOf(`${name}: {`)))
for (const t of ['--color-modal-shadow','--color-popover-shadow','--color-inset-highlight']) {
  assert.match(block('parchment'), new RegExp(`'${t}':`), `Missing ${t} in parchment`)
  assert.match(block('dark'), new RegExp(`'${t}':`), `Missing ${t} in dark`)
}
assert.notEqual(block('parchment').match(/'--color-modal-shadow':\s*'([^']+)'/)?.[1], block('dark').match(/'--color-modal-shadow':\s*'([^']+)'/)?.[1], 'modal-shadow 必须随主题感知')
// §8.1 弹框阴影主题感知精确值：浅色柔和无深空晕，深色深空底 + 青绿内发光
assert.match(block('parchment'), /'--color-modal-shadow':\s*'0 8px 40px rgba\(0,\s*0,\s*0,\s*0\.1\)'/, '浅色弹框阴影必须柔和 0 8px 40px rgba(0,0,0,0.1)（§8.1 禁深空割裂）')
assert.match(block('dark'), /'--color-modal-shadow':\s*'0 8px 48px rgba\(0,\s*0,\s*0,\s*0\.55\),\s*inset 0 1px 0 rgba\(0,\s*212,\s*170,\s*0\.08\)'/, '深色弹框阴影必须深空底 + 青绿内发光（§8.1）')
// system-blue 常量 #007AFF（§7）
assert.match(tokens, /--color-system-blue:\s*#007AFF/)
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test 2>&1 | grep -E "design1-v2|input-css-boundary|ui-interactions|fail|pass" | head -20`
Expected: FAIL —— 圆角断言（12px）失败、token 一致性失败（token 未定义）。

- [ ] **Step 3: 重映射全局圆角 + 新增 token**

`tokens.css :root`：
```
--radius-xs: 4px;      /* 新增 */
--radius-sm: 8px;      /* 6 → 8 */
--radius-md: 12px;     /* 10 → 12 */
--radius-lg: 16px;     /* 14 → 16 */
--radius-xl: 20px;     /* 18 → 20 */
--radius-2xl: 24px;    /* 不变 */
```
`tokens.css :root` 追加（parchment 默认值）：
```
--color-system-blue: #007AFF;
--color-system-blue-soft: rgba(0,122,255,0.10);
--color-glow: #00D4AA;
--color-focus-ring: #007AFF;
--color-modal-shadow: 0 8px 40px rgba(0,0,0,0.1);
--color-popover-shadow: 0 4px 24px rgba(0,0,0,0.10);
--color-inset-highlight: rgba(255,255,255,0.55);
```
`themes.ts` `parchment` 追加（system-blue/glow/focus-ring 与 tokens.css 同值；阴影为浅色值）：
```
'--color-system-blue': '#007AFF',
'--color-system-blue-soft': 'rgba(0,122,255,0.10)',
'--color-glow': '#00D4AA',
'--color-focus-ring': '#007AFF',
'--color-modal-shadow': '0 8px 40px rgba(0,0,0,0.1)',
'--color-popover-shadow': '0 4px 24px rgba(0,0,0,0.10)',
'--color-inset-highlight': 'rgba(255,255,255,0.55)',
```
`themes.ts` `dark` 追加（阴影为深色值，§8.1）：
```
'--color-system-blue': '#007AFF',
'--color-system-blue-soft': 'rgba(0,122,255,0.10)',
'--color-glow': '#00D4AA',
'--color-focus-ring': '#007AFF',
'--color-modal-shadow': '0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(0,212,170,0.08)',
'--color-popover-shadow': '0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(0,212,170,0.05)',
'--color-inset-highlight': 'rgba(255,255,255,0.05)',
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test 2>&1 | grep -E "design1-v2|input-css-boundary|ui-interactions" | head`
Expected: PASS（圆角 12px 断言、token 一致性、system-blue 全部通过）。

- [ ] **Step 5: 提交**

```bash
git add src/styles/tokens.css src/styles/themes.ts tests/design1-v2-conformance.test.mjs tests/input-css-boundary.test.mjs tests/ui-interactions.test.mjs
git commit -m "feat(design1-v2): add system-blue/glow/theme-aware shadow tokens, remap radius to v2"
```

---

### Task 2: UiModal 圆角 12px + 主题感知阴影

**Files:**
- Modify: `src/components/ui/UiModal.tsx:23,29`（`radius = 18`→`12`）
- Modify: `src/styles/ui.css:20-30`（`.ui-modal` `box-shadow` → `var(--color-modal-shadow)`）
- Test: `tests/design1-v2-conformance.test.mjs`（追加 modal 断言）
- Modify: `tests/ui-interactions.test.mjs:472-483`（`radius: 18`→`12`、`maxWidth: 1400`→`1280`、断言值同步）

**Interfaces:**
- Consumes: Task 1 的 `--color-modal-shadow`。
- Produces: 后续任务的 UiModal 默认 radius=12 / 阴影走 var。

- [ ] **Step 1: 更新/新增测试**

`ui-interactions.test.mjs:472-483`：把 `radius: 18` 改 `radius: 12`、`maxWidth: 1400` 改 `maxWidth: 1280`；断言 `style.borderRadius == 12`、`style.width == 'min(92vw, 1280px)'`；测试名改「UiModal §8.1 尺寸：92vw/92vh + 1280px 上限、圆角 12」。
`design1-v2-conformance.test.mjs` 追加：
```js
const modal = read('src/components/ui/UiModal.tsx')
assert.match(modal, /radius = 12/, 'UiModal 默认圆角必须 12px（§8.1）')
const uiCss = read('src/styles/ui.css')
assert.match(uiCss, /\.ui-modal\s*\{[\s\S]{0,400}?box-shadow:\s*var\(--color-modal-shadow\)/, '弹框阴影必须主题感知 var(--color-modal-shadow)（§8.1）')
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test 2>&1 | grep -E "ui-interactions|design1-v2" | head`
Expected: FAIL（UiModal 默认仍 18px、.ui-modal 仍硬编码 0 12px 40px）。

- [ ] **Step 3: 实现**

`UiModal.tsx:29`：`radius = 18` → `radius = 12`。
`ui.css` `.ui-modal`：`box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);` → `box-shadow: var(--color-modal-shadow);`。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test 2>&1 | grep -E "ui-interactions|design1-v2|ui-atoms|ui-modal-exit" | head`
Expected: PASS（含既有 `ui-atoms.test.mjs`、`ui-modal-exit.test.mjs` 不回归）。

- [ ] **Step 5: 提交**

```bash
git add src/components/ui/UiModal.tsx src/styles/ui.css tests/ui-interactions.test.mjs tests/design1-v2-conformance.test.mjs
git commit -m "feat(design1-v2): UiModal radius 12px + theme-aware modal shadow"
```

---

### Task 3: 设置中心系统蓝导航 + 1280px

**Files:**
- Modify: `src/components/panels/SettingsDialog.tsx:37`（`PANEL_MAX_WIDTH = 1400`→`1280`）
- Modify: `src/styles/settings-dialog.css:602-668`（`.settings-panel-shell` / `.settings-nav-list` / `.settings-nav-row` / `.settings-nav-ico` / `.settings-nav-txt`）
- Test: `tests/design1-v2-conformance.test.mjs`（追加设置导航断言）

**Interfaces:**
- Consumes: Task 1 的 `--color-system-blue` / `--color-system-blue-soft`。
- Produces: 设置导航 180px/44px/系统蓝激活。

- [ ] **Step 1: 新增测试**

`design1-v2-conformance.test.mjs` 追加：
```js
const settings = read('src/components/panels/SettingsDialog.tsx')
assert.match(settings, /PANEL_MAX_WIDTH = 1280/, '设置弹框最大宽必须 1280px（§5.1）')
const sdlg = read('src/styles/settings-dialog.css')
const navList = sdlg.match(/\.settings-nav-list\s*\{[^}]*\}/)?.[0] || ''
assert.match(navList, /width:\s*180px/, '设置导航侧栏必须 180px（§5.3）')
const navRow = sdlg.match(/\.settings-nav-row\s*\{[^}]*\}/)?.[0] || ''
assert.match(navRow, /height:\s*44px/, '设置导航条目必须 44px（§5.3）')
const navActive = sdlg.match(/\.settings-nav-row\.active\s*\{[^}]*\}/)?.[0] || ''
assert.match(navActive, /var\(--color-system-blue-soft\)/, '激活态必须系统蓝浅底')
// 3px 左条是独立伪元素规则（.settings-nav-row.active::before），不能嵌在 .active 块里，单独断言
const navBefore = sdlg.match(/\.settings-nav-row\.active::before\s*\{[^}]*\}/)?.[0] || ''
assert.match(navBefore, /width:\s*3px/, '激活态必须 3px 左条（::before）')
assert.match(navBefore, /var\(--color-system-blue\)/, '左条必须系统蓝')
// 激活态文字/图标颜色在各自子规则（.settings-nav-row.active .settings-nav-ico/.txt），单独断言
assert.match(sdlg, /\.settings-nav-row\.active\s+\.settings-nav-ico[^}]*var\(--color-system-blue\)/, '激活态图标必须系统蓝')
assert.match(sdlg, /\.settings-nav-row\.active\s+\.settings-nav-txt[^}]*var\(--color-system-blue\)/, '激活态文字必须系统蓝')
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test 2>&1 | grep design1-v2 | head`
Expected: FAIL（PANEL_MAX_WIDTH 仍 1400、导航仍 240px/52px/primary-soft 激活）。

- [ ] **Step 3: 实现**

`SettingsDialog.tsx:37`：`PANEL_MAX_WIDTH = 1400` → `1280`。
`settings-dialog.css`：
- `.settings-panel-shell`：`padding: 8px 28px 24px` → `8px 32px 24px`（gap 20px 不动）。
- `.settings-nav-list`：`width: 240px`→`180px`；`padding: 16px`→`8px`；`border-radius: 16px`→`12px`；`gap: 4px`→`2px`。
- `.settings-nav-row`：`height: 52px`→`44px`；`padding: 0 20px`→`0 12px`；`border-radius: 12px`→`8px`；`gap: 14px`→`10px`；`position: relative`（供 ::before 定位）。
- `.settings-nav-row.active`：`background: var(--color-system-blue-soft)`；加 `::before`（`content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:18px; border-radius:2px; background: var(--color-system-blue)`）。
- `.settings-nav-row.active .settings-nav-ico`、`.settings-nav-row.active .settings-nav-txt`：`color: var(--color-system-blue)`；文字 `font-weight: 600`。
- `.settings-nav-ico`：`font-size: 20px`→`18px`；`width: 22px`→`20px`。
- `.settings-nav-txt`：`font-size: 15px`→`14px`。
- 移除 `.settings-nav-row.active` 旧 `background: var(--color-primary-soft)` 与旧文字主色。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test 2>&1 | grep design1-v2 | head`
Expected: PASS（含 `settings-structure.test.mjs` 不回归 —— 它只断言标签文本，不涉 CSS）。

- [ ] **Step 5: 提交**

```bash
git add src/components/panels/SettingsDialog.tsx src/styles/settings-dialog.css tests/design1-v2-conformance.test.mjs
git commit -m "feat(design1-v2): settings nav 180px/44px system-blue active + 1280px max width"
```

---

### Task 4: 全局键盘焦点环 → 系统蓝

**Files:**
- Modify: `src/styles/ui.css:381-384`（Global focus-visible 环 4px `var(--accent-a60)`→`var(--color-focus-ring)`）
- Modify: `src/styles/layout.css`（`.toolbar-submenu-item:focus-visible`、`.outline-jump-btn:focus-visible` 等外圈环色→`var(--color-focus-ring)`）
- Modify: `src/styles/globals.css:34-37,3345-3347`、`src/styles/code-mode.css:104-107`、`src/styles/welcome-screen.css:84-87,220-223`（键盘导航环→`var(--color-focus-ring)`；**保持** `globals.css:67-71` `select:focus-visible` 主色边框+外发光为表单控件 focus）
- Test: `tests/design1-v2-conformance.test.mjs`（追加焦点环断言）

**Interfaces:**
- Consumes: Task 1 的 `--color-focus-ring`。
- Produces: 键盘焦点环统一系统蓝。

- [ ] **Step 1: 新增测试**

`design1-v2-conformance.test.mjs` 追加：
```js
const uiCss4 = read('src/styles/ui.css')
const ring = uiCss4.match(/Global focus-visible[\s\S]*?\n\}/)?.[0] || ''
assert.match(ring, /var\(--color-focus-ring\)/, '全局 focus-visible 环必须用 var(--color-focus-ring)（系统蓝）')
assert.match(ring, /box-shadow:\s*0 0 0 2px[\s\S]{0,60}0 0 0 4px/, '环必须保留 2px 白内圈 + 4px 外圈结构')
// 输入框 focus 外发光保持主色（§8.2/§10.2），不得被系统蓝带走
assert.match(uiCss4, /\.ui-input:focus-within,\s*\.ui-select-trigger:focus[\s\S]{0,300}?box-shadow:\s*0 0 0 3px color-mix/, '输入框 focus 外发光必须保持主色 color-mix（§8.2）')
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test 2>&1 | grep design1-v2 | head`
Expected: FAIL（Global focus-visible 仍 `var(--accent-a60)`）。

- [ ] **Step 3: 实现**

`ui.css` Global focus-visible：`0 0 0 4px var(--accent-a60)` → `0 0 0 4px var(--color-focus-ring)`。
`layout.css` 及其余 chrome：`grep -rn "focus-visible" src/styles/layout.css panels.css floating.css` 找外圈环用 `var(--accent-a60)` / `color-mix(...var(--color-primary)...)` 的，把环色改为 `var(--color-focus-ring)`。**不动** `.ui-input:focus-within` / `.ui-select-trigger:focus` 的主色边框与外发光（§8.2/§10.2）。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test 2>&1 | grep -E "design1-v2|ui-interactions|ui-controls-designmd|dark-hardcode" | head`
Expected: PASS（`ui-interactions.test.mjs:775-780`「焦点环不许写死非黑 rgba」、`:799`「box-shadow 出光环」不回归）。

- [ ] **Step 5: 提交**

```bash
git add src/styles/ui.css src/styles/layout.css tests/design1-v2-conformance.test.mjs
git commit -m "feat(design1-v2): keyboard focus ring to system blue"
```

---

### Task 5: Chrome 悬浮表面主题感知阴影/高光

**Files:**
- Modify: `src/styles/layout.css`（`.toolbar-submenu`、tooltip、`.sidebar-outline`、`.sidebar-preview-wrapper`）
- Modify: `src/styles/panels.css`（`.search-panel-inner`、历史面板容器、bottom dock、`.insert-nav-item`、`.format-card.active`、`.format-chip.active`、`.library-cat-btn.active`、`.library-doc-item.active` 内描高光）
- Modify: `src/styles/floating.css`（`.ai-panel`、`.slash-command`）
- Modify: `src/styles/read-mode.css`（read-mode 表面阴影）
- Modify: `src/styles/settings-dialog.css`（内描高光）
- Test: `tests/design1-v2-conformance.test.mjs`（追加表面阴影断言）

**Interfaces:**
- Consumes: Task 1 的 `--color-popover-shadow` / `--color-modal-shadow` / `--color-inset-highlight`。
- Produces: chrome 悬浮表面阴影主题感知。

- [ ] **Step 1: 新增测试**

`design1-v2-conformance.test.mjs` 追加：
```js
const layout = read('src/styles/layout.css')
const panels = read('src/styles/panels.css')
const floating = read('src/styles/floating.css')
// 悬浮表面阴影走主题感知 token
for (const [file, sel] of [[layout, /\.toolbar-submenu\s*\{/],[layout, /\.sidebar-outline\s*\{/],[layout, /\.sidebar-preview-wrapper\s*\{/],[panels, /\.search-panel-inner\s*\{/],[floating, /\.ai-panel\s*\{/],[floating, /\.slash-command\s*\{/]]) {
  const block = file.match(new RegExp(sel.source + '[^}]*\\}'))?.[0] || ''
  assert.match(block, /var\(--color-popover-shadow\)/, `${sel} 悬浮表面阴影必须 var(--color-popover-shadow)`)
}
// 历史面板是内联布局面板（.history-main-panel，flex:1），非弹框，不参与本规范 —— 断言它不被误改
assert.match(panels, /\.history-main-panel\s*\{[\s\S]{0,200}?flex:\s*1/, '历史面板保持内联全高面板（非弹框）')
// 内描高光走主题感知（代表性表面，spec §5.5 显式清单）
// 用 [^{}]*\{[^}]*var(...) 匹配「该选择器（或其状态变体）的某块含高亮」——
// 因为 .format-card.active 在 panels.css 出现两次（:9 是 1px accent 环、:109 才是 inset 高亮），
// .outline-jump-btn 只有 :hover（:370）有 inset 高亮（base 无 shadow），不能用首匹配。
for (const sel of [/\.insert-nav-item\s*\{/, /\.format-card\.active\s*\{/, /\.library-cat-btn\.active\s*\{/, /\.outline-jump-btn\s*\{/]) {
  const src = (sel.source.includes('outline') ? layout : panels)
  const b = src.match(new RegExp(sel.source.replace(/\s*\{$/, '') + '[^{}]*\\{[^}]*var\\(--color-inset-highlight\\)'))?.[0] || ''
  assert.ok(b.length > 0, `${sel} 必须有一个块含 var(--color-inset-highlight)`)
}
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test 2>&1 | grep design1-v2 | head`
Expected: FAIL（各表面仍硬编码 rgba 阴影/白内描高光）。

- [ ] **Step 3: 实现**

按 spec §5.5 表逐条替换为 `var(--color-popover-shadow)`（浮层）。
内描高光（spec §5.5 显式清单）：`.insert-nav-item`、`.format-card.active`、`.format-chip.active`、`.library-cat-btn.active`、`.library-doc-item.active`、`.outline-jump-btn`、`.outline-depth-btn.active`、`.sidebar-close-btn` 里的 `inset 0 1px 0 rgba(255,255,255,0.x)` → `var(--color-inset-highlight)`。
`grep -rn "inset 0 1px 0 rgba(255,255,255" src/styles/*.css` 复核，若清单外仍有 0.1+ 的悬浮表面白内描高光，一并改（**排除** hover/active 1px 微反馈 `0 1px 3px`/`0 2px 8px` 类，避免大范围回归）。
**不动** `.history-main-panel`（内联面板，非弹框）；`panels.css:308` 处有一块**未闭合注释**吞掉的历史面板旧规则（`/* ── History Panel — timeline style {` 到 `/* ── Preview area ── */`）为既有死代码，本任务**不修复**（避免激活幽灵规则），仅在实现报告里记录。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test 2>&1 | grep -E "design1-v2|dark-hardcode|dark-accent-floor|ui-interactions" | head`
Expected: PASS（`dark-hardcode.test.mjs` 需仍通过 —— 它断言 panels.css 有深色覆写，本任务只改阴影值，不改选择器结构）。

- [ ] **Step 5: 提交**

```bash
git add src/styles/layout.css src/styles/panels.css src/styles/floating.css src/styles/read-mode.css src/styles/settings-dialog.css tests/design1-v2-conformance.test.mjs
git commit -m "feat(design1-v2): theme-aware popover/modal shadows and inset highlights"
```

---

### Task 6: 全量校验 + 手工回归

**Files:**
- 无代码改动（仅验证）

- [ ] **Step 1: 全量 typecheck + 测试**

Run: `npm run check`
Expected: 全部通过。

- [ ] **Step 2: 深色主题 token 对比度抽查（§10）**

Run: `npm test 2>&1 | grep -E "dark|theme-boundary" | head`
Expected: `theme-boundary.test.mjs`、`dark-accent-floor.test.mjs`、`dark-hardcode.test.mjs`、`ui-interactions` 深色断言全过。

- [ ] **Step 3: 提交（若 Step 1-2 有修正）**

```bash
git add -A && git commit -m "chore(design1-v2): final verification fixes"
```

## 执行说明

- 实现顺序：Task 1 → 2 → 3 → 4 → 5 → 6。Task 2/3/4/5 均只依赖 Task 1 的 token，可并行，但顺序执行更易回归定位。
- 每个任务的 TDD 环：先改/加测试（红）→ 改 CSS/TSX（绿）→ 全量相关测试 → 提交。
- 若某个既有测试（如 `input-css-boundary`、`ui-interactions` 的 §8.1 阴影断言）因 spec 值变更而必须改断言，属**预期**：旧断言 pin 的是旧值，spec 已决定改新值。改断言时要同步改测试名与消息，保持语义准确。
- 实现者不得把 `.ui-modal` 的圆角走 `--radius-*`（它由 UiModal radius prop 注入，spec §5.6 明确）。
