# 全站 UI 严格重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 DESIGN-1.md §5/§6/§8.1 字面回退设置界面，并按 lzc2vsdx/Nebula 签名补齐全站其余 UI（玻璃/发丝线/圆角/编辑器纸面），功能不变、零新依赖。

**Architecture:** 全部经现有 CSS 变量令牌（新增 `--doc-bg` 进 themes.ts）+ 静态一致性测试（`tests/*.test.mjs` 钉值）。设置界面回退 DESIGN-1 字面；其余界面按 Nebula（玻璃 blur/0.6px 发丝/8px 按钮）。仅 G14（WYSIWYG contentWidth 接线）为 TSX 逻辑改动。

**Tech Stack:** React + TypeScript + CSS 变量令牌；一致性测试用 `node:assert` + `readFileSync` 正则钉值；`npm run typecheck` / `npm test` / `npm run test:e2e`。

**Spec:** `docs/superpowers/specs/2026-11-19-fullsite-ui-refactor-design.md`

## Global Constraints

- 零新增依赖；沿用现有 React + CSS 变量令牌体系。
- 无 `[data-theme]` 覆写块（AGENT.md §7）；颜色一律走 `--color-*`/`--t-*`/`--bg-rgb` 令牌。
- 设置界面按 DESIGN-1 §5/§6/§8.1 字面；非设置界面按 lzc2vsdx Nebula 签名。
- 内容区保留全屏（不 1180px 居中）；强调色保持青色；五色图标（G12）跳过。
- **发丝线裁决（自审修正）**：chrome 结构发丝（顶栏/页脚/侧栏/状态栏）= 0.7px（DESIGN-1 §2，已是）；面板/弹层/卡 = 0.6px（lzc2vsdx，本次从 0.7px 转）。控件边框不改。
- 每任务结束：`npm test` 全绿 + `git commit`。

## Review Focus

1. **浅色下弹窗不出现「深空割裂」**——`--color-modal-shadow` 浅色保持软化值 `0 4px 20px rgba(0,0,0,0.06)`（§8.1 字面 `0 8px 40px` 已被钉为双层圆框缺陷，不回归）；深色保持 `0 8px 48px …, inset 0 1px 0 rgba(0,212,170,0.08)`。→ Task 3 断言保持现有两值。
2. **设置导航激活不残留青色发光左条**——§5.3 无左条，激活 = system-blue 文字/图标 + system-blue-soft 底；不得再出现 `var(--color-primary)` 激活左条。→ Task 1 断言 `doesNotMatch` 旧左条。
3. **编辑器纸面在浅色下是羊皮纸而非透明落 #F4F7FA**——`.textus-editor-shell .milkdown` 必须 `var(--doc-bg)`。→ Task 6 断言。
4. **WYSIWYG 内容列跟随 contentWidth 设置**——MilkdownEditor 必须像 CodeEditor 一样 `style.setProperty('--document-width', …)`。→ Task 6 断言。
5. **全站 0.7px→0.6px 仅限面板/弹层**——chrome 结构发丝不得被误改。→ Task 4/5 断言 chrome 仍 0.7px。

---

### Task 1: 设置弹窗壳 + 导航回退（DESIGN-1 §5）

**Files:**
- Modify: `src/components/panels/SettingsDialog.tsx:38-39`（PANEL_HEIGHT/PANEL_MAX_WIDTH）
- Modify: `src/styles/settings-dialog.css:560-628`（`.settings-nav-list` / `.settings-nav-row` / `.settings-nav-row.active`）
- Test: `tests/settings-conformance.test.mjs:14-26`、`tests/ui-polish-round3.test.mjs:20-21`、`tests/design1-v2-conformance.test.mjs:38-56`

**Interfaces:**
- Consumes: 无（首个任务）。
- Produces: `PANEL_MAX_WIDTH = 1280`、`PANEL_HEIGHT = '92vh'`（Task 3 UiModal 消费）；`.settings-nav-list` 宽 180px 白底、`.settings-nav-row` 高 44px、激活 system-blue。

- [ ] **Step 1: 更新三处测试钉 DESIGN-1 新值（预期先失败）**

`tests/settings-conformance.test.mjs`：
```js
assert.match(dialog, /PANEL_MAX_WIDTH = 1280/, '弹窗最大宽必须 1280（DESIGN-1 §5.1）')
assert.match(dialog, /PANEL_HEIGHT = '92vh'/, '弹窗高必须 92vh（DESIGN-1 §5.1）')
assert.match(css, /\.settings-nav-list\s*\{[\s\S]{0,240}width:\s*180px;/, '设置导航侧栏必须 180px（§5.3）')
assert.match(css, /\.settings-nav-list\s*\{[\s\S]{0,320}background:\s*var\(--color-bg-white\)/, '设置导航侧栏必须白底（§5.3）')
assert.match(css, /\.settings-nav-row\s*\{[\s\S]{0,240}height:\s*44px;/, '导航条目必须 44px（§5.3）')
assert.doesNotMatch(css, /\.settings-nav-row\.active::before\s*\{[^}]*width:\s*3px;/, '§5.3 无激活左条')
assert.match(css, /\.settings-nav-row\.active\s*\{[^}]*var\(--color-system-blue-soft\)/, '激活态必须 system-blue-soft 底（§7）')
assert.match(css, /\.settings-nav-row\.active\s+\.settings-nav-ico[^}]*var\(--color-system-blue\)/, '激活态图标必须 system-blue（§7）')
assert.match(css, /\.settings-nav-row\.active\s+\.settings-nav-txt[^}]*var\(--color-system-blue\)/, '激活态文字必须 system-blue（§7）')
```
`tests/ui-polish-round3.test.mjs`：`PANEL_MAX_WIDTH\s*=\s*1280`、`PANEL_HEIGHT\s*=\s*'92vh'`。
`tests/design1-v2-conformance.test.mjs`：`PANEL_MAX_WIDTH = 1280`、`width:\s*180px`、`height:\s*44px`、激活 `var(--color-system-blue-soft)`、active::before 删、active ico/txt `var(--color-system-blue)`。

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/settings-conformance.test.mjs tests/ui-polish-round3.test.mjs tests/design1-v2-conformance.test.mjs`
Expected: FAIL（旧 1100/'86vh'/200px/42px/primary-soft/cyan 左条仍存）。

- [ ] **Step 3: 改 `SettingsDialog.tsx` PANEL 常量**

```ts
const PANEL_HEIGHT = '92vh'
const PANEL_MAX_WIDTH = 1280
```

- [ ] **Step 4: 改 `settings-dialog.css` 导航**

`.settings-nav-list`：`width: 180px`；`background: var(--color-bg-white)`。
`.settings-nav-row`：`height: 44px`。
`.settings-nav-row.active`：`background: var(--color-system-blue-soft)`。
删除 `.settings-nav-row.active::before`（3×22px 青发光左条整块）。
`.settings-nav-row.active .settings-nav-ico` / `.settings-nav-row.active .settings-nav-txt`：`color: var(--color-system-blue)`（txt 保持 font-weight 600）。

- [ ] **Step 5: 运行确认通过**

Run: `node --import tsx --test tests/settings-conformance.test.mjs tests/ui-polish-round3.test.mjs tests/design1-v2-conformance.test.mjs`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/components/panels/SettingsDialog.tsx src/styles/settings-dialog.css tests/settings-conformance.test.mjs tests/ui-polish-round3.test.mjs tests/design1-v2-conformance.test.mjs
git commit -m "refactor(settings): 设置弹窗壳+导航回退 DESIGN-1 §5（1280/92vh、180px 白底/44px、system-blue 激活）"
```

---

### Task 2: 设置主题卡 + 色盘 + 区块卡回退（DESIGN-1 §6）

**Files:**
- Modify: `src/styles/settings-dialog.css:184-192`（`.settings-section`）、`:856-874`（`.theme-preview-thumb`）、`:901-902`（色盘）、`:179-182`（`.settings-content`）
- Test: `tests/settings-conformance.test.mjs`（追加 §6 断言）

**Interfaces:**
- Consumes: Task 1（settings-dialog.css 已改）。
- Produces: `.theme-preview-thumb` 高 128px、色盘 80px、`.settings-section` 实心 16px 圆角。

- [ ] **Step 1: 追加 §6 断言（先失败）**

`tests/settings-conformance.test.mjs` 末尾：
```js
assert.match(css, /\.theme-preview-thumb\s*\{[^}]*height:\s*128px;/, '主题预览缩略图必须 128px（§6.2）')
assert.match(css, /\.accent-group\s*\{[^}]*gap:\s*40px;/, '色盘间距必须 40px（§6.3）')
assert.match(css, /\.accent-circle\s*\{[^}]*width:\s*80px;[^}]*height:\s*80px;/, '色盘直径必须 80px（§6.3）')
assert.match(css, /\.settings-section\s*\{[^}]*border-radius:\s*16px;/, '区块卡必须 16px 圆角（§6.1）')
assert.doesNotMatch(css, /\.settings-section\s*\{[^}]*backdrop-filter/, '区块卡必须实心（§6.1 不玻璃化）')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/settings-conformance.test.mjs`
Expected: FAIL（旧 100px/64px/14px/glass 仍存）。

- [ ] **Step 3: 改 CSS**

`.theme-preview-thumb`：`height: 128px`。
色盘（`.accent-item` 或对应类）：`width: 80px; height: 80px`。
`.settings-section`：`background: var(--color-bg-card)`（实心）；`border-radius: 16px`；删除 `backdrop-filter`/`-webkit-backdrop-filter`；`border: 0.6px solid var(--color-border-soft)`；保留 `box-shadow: var(--shadow-sm)`。
`.settings-content`：删除玻璃 backdrop-filter（若在 `:646/:694` 覆写层），实心/透明。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/settings-conformance.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/styles/settings-dialog.css tests/settings-conformance.test.mjs
git commit -m "refactor(settings): 主题卡/色盘/区块卡回退 DESIGN-1 §6（128px 缩略图、80px 色盘、16px 实心卡）"
```

---

### Task 3: UiModal 回退（DESIGN-1 §8.1）

**Files:**
- Modify: `src/components/ui/UiModal.tsx`（radius 默认）
- Modify: `src/styles/ui.css`（`.ui-modal` bg）
- Modify: `src/styles/themes.ts`（`--modal-glass-*` 移除）
- Test: `tests/lzc2vsdx-ui-port.test.mjs:9-15`、`tests/design1-v2-conformance.test.mjs:32-36`

**Interfaces:**
- Consumes: Task 1（PANEL_MAX_WIDTH=1280/PANEL_HEIGHT='92vh' 传入）。
- Produces: `.ui-modal` 圆角 12px、背景实心 `var(--color-bg-secondary)`。

- [ ] **Step 1: 更新测试（先失败）**

`tests/lzc2vsdx-ui-port.test.mjs`：
```js
assert.match(ui, /\.ui-modal\s*\{[\s\S]{0,500}?background:\s*var\(--color-bg-secondary\)/, '.ui-modal 背景必须实心 var(--color-bg-secondary)（§8.1）')
assert.match(modal, /radius\s*=\s*12/, 'UiModal 默认圆角必须 12px（§8.1）')
```
删 `--modal-glass-*` 两断言；`tests/design1-v2-conformance.test.mjs:34` 改 `radius = 12`。

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/lzc2vsdx-ui-port.test.mjs tests/design1-v2-conformance.test.mjs`
Expected: FAIL。

- [ ] **Step 3: 改 UiModal.tsx + ui.css + themes.ts**

`UiModal.tsx`：默认 `radius = 12`。
`ui.css` `.ui-modal`：`background: var(--color-bg-secondary)`（去 `--modal-glass-bg` 回退）；去 backdrop-filter（若有）；保留 0.6px 边 + `var(--color-modal-shadow)`。
`themes.ts`：删 `'--modal-glass-bg'`/`'--modal-glass-border'`/`'--modal-glass-inset'`。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/lzc2vsdx-ui-port.test.mjs tests/design1-v2-conformance.test.mjs`
Expected: PASS（浅色 shadow 断言 `0 4px 20px rgba(0,0,0,0.06)` / 深色 `0 8px 48px…inset` 必须仍绿 —— Review Focus 1）。

- [ ] **Step 5: 提交**

```bash
git add src/components/ui/UiModal.tsx src/styles/ui.css src/styles/themes.ts tests/lzc2vsdx-ui-port.test.mjs tests/design1-v2-conformance.test.mjs
git commit -m "refactor(modal): UiModal 回退 DESIGN-1 §8.1（圆角 12px、实心 bg-secondary，去玻璃）"
```

---

### Task 4: 表面玻璃 + 面板发丝线（G2/G3/G4/G15/G16）

**Files:**
- Modify: `src/styles/layout.css`（侧栏 rail/outline/library/preview 面板、页脚）、`src/styles/ai-chat.css`（AI 面板）、`src/styles/read-mode.css`（浮航）、`src/styles/scroll-rail.css`
- Test: `tests/nebula-surface.test.mjs`、`tests/design1-v2-conformance.test.mjs:133-150`（chrome 0.7px 不回归）

**Interfaces:**
- Consumes: 无。
- Produces: 侧栏/面板/AI 聊天/页脚/阅读浮航带 `backdrop-filter: blur(12px)` + 0.6px 发丝。

- [ ] **Step 1: 追加玻璃断言（先失败）**

`tests/nebula-surface.test.mjs` 追加（文件已定义 `read`/`layout`；需补 const）：
```js
const aiChat = read('src/styles/ai-chat.css')
const rail = layout.match(/\.(?:sidebar-rail|rail)\s*\{[^}]*\}/)?.[0] || ''
assert.match(rail, /backdrop-filter:\s*blur\(12px\)/, '侧栏 rail 必须玻璃 blur(12px)')
const ai = aiChat.match(/\.ai-chat-panel\s*\{[^}]*\}/)?.[0] || ''
assert.match(ai, /backdrop-filter:\s*blur\(12px\)/, 'AI 聊天面板必须玻璃 blur(12px)')
assert.match(ai, /border-left:\s*0\.6px/, 'AI 聊天面板左边必须 0.6px 发丝')
const footer = layout.match(/\.app-footer\s*\{[^}]*\}/)?.[0] || ''
assert.match(footer, /backdrop-filter:\s*blur\(12px\)/, '页脚必须玻璃 blur(12px)')
```
（侧栏面板/阅读浮航各加对应 `.sidebar-outline`/`.sidebar-library`/`.sidebar-preview-wrapper`/`.nav-float` blur 断言。）

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/nebula-surface.test.mjs`
Expected: FAIL（各面板当前不透明/blur 无效）。

- [ ] **Step 3: 改 CSS**

各表面加 `backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);`，背景改半透明玻璃（浅色 `rgba(var(--bg-rgb),0.72)`/深色玻璃），面板边框 `0.7px`→`0.6px`；页脚加 blur；阅读浮航加玻璃 + 0.6px + 8px 圆角。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/nebula-surface.test.mjs tests/design1-v2-conformance.test.mjs`
Expected: PASS（chrome 顶栏/页脚 0.7px 仍绿 —— Review Focus 5）。

- [ ] **Step 5: 提交**

```bash
git add src/styles/layout.css src/styles/ai-chat.css src/styles/read-mode.css src/styles/scroll-rail.css tests/nebula-surface.test.mjs
git commit -m "feat(ui): 侧栏/面板/AI聊天/页脚/阅读浮航玻璃化 + 0.6px 发丝（Nebula）"
```

---

### Task 5: 斜杠命令 + 按钮圆角 + Toast（G7/G10/G11/G19）

**Files:**
- Modify: `src/styles/floating.css:6-16`（`.slash-command`）、`src/styles/settings-dialog.css:431`（`.ud-btn` 10→8）、`:802`（`.page-reset-button` 12→8）、`src/styles/welcome-screen.css:67`（`.welcome-btn` 10→8）、`src/styles/panels.css:980`（`.search-btn` 6→8）、`src/utils/toast.ts:100`（12→10）
- Test: `tests/dialog-buttons-unify.test.mjs`、`tests/design1-v2-conformance.test.mjs:86`（welcome focus 环不回归）

**Interfaces:**
- Consumes: 无。
- Produces: slash 命令玻璃+0.6px+8px；四按钮 8px；toast 10px。

- [ ] **Step 1: 追加断言（先失败）**

`tests/nebula-surface.test.mjs` 追加（补 const）：
```js
const floating = read('src/styles/floating.css')
const settingsCss = read('src/styles/settings-dialog.css')
const welcomeCss = read('src/styles/welcome-screen.css')
const panelsCss = read('src/styles/panels.css')
const slash = floating.match(/\.slash-command\s*\{[^}]*\}/)?.[0] || ''
assert.match(slash, /border:\s*0\.6px/, 'slash 命令必须 0.6px 边')
assert.match(slash, /border-radius:\s*8px/, 'slash 命令必须 8px 圆角')
assert.match(slash, /backdrop-filter/, 'slash 命令必须玻璃')
assert.match(settingsCss, /\.ud-btn\s*\{[^}]*border-radius:\s*8px;/, '.ud-btn 必须 8px 圆角（G10）')
assert.match(welcomeCss, /\.welcome-btn\s*\{[^}]*border-radius:\s*8px;/, '.welcome-btn 必须 8px 圆角（G10）')
assert.match(panelsCss, /\.search-btn\s*\{[^}]*border-radius:\s*8px;/, '.search-btn 必须 8px 圆角（G10）')
assert.match(settingsCss, /\.page-reset-button\s*\{[^}]*border-radius:\s*8px;/, '.page-reset-button 必须 8px 圆角（G11）')
const toast = read('src/utils/toast.ts')
assert.match(toast, /borderRadius\s*=\s*'10px'|borderRadius:\s*'10px'/, 'toast 必须 10px 圆角（G19）')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/nebula-surface.test.mjs`
Expected: FAIL。

- [ ] **Step 3: 改 CSS + toast.ts**

`.slash-command`：`background: var(--color-bg-card)`→半透明玻璃；`border: 0.7px`→`0.6px solid`；`border-radius: var(--radius-lg)`→`8px`；加 `backdrop-filter: blur(12px)`。
`.ud-btn`/`.welcome-btn`/`.search-btn`/`.page-reset-button`：`border-radius` 各→`8px`。
`toast.ts`：`el.style.borderRadius = 'var(--radius-md)'`→`'10px'`（并修注释）。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/nebula-surface.test.mjs tests/dialog-buttons-unify.test.mjs tests/design1-v2-conformance.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/styles/floating.css src/styles/settings-dialog.css src/styles/welcome-screen.css src/styles/panels.css src/utils/toast.ts tests/nebula-surface.test.mjs
git commit -m "feat(ui): slash 命令玻璃+8px、按钮统一 8px 圆角、toast 10px（G7/G10/G11/G19）"
```

---

### Task 6: 编辑器纸面 + contentWidth 接线（G13/G14）

**Files:**
- Modify: `src/styles/themes.ts`（新增 `--doc-bg`）、`src/additional/milkdown/milkdown.css:34-38`（`.milkdown` 纸面 bg）、`src/components/editor/MilkdownEditor.tsx`（contentWidth 接线）
- Test: `tests/content-measure.test.mjs`、新增 `tests/doc-paper.test.mjs`

**Interfaces:**
- Consumes: 无。
- Produces: `--doc-bg`（parchment '#faf6ee'/dark '#1C1C1F'）；`.milkdown` bg `var(--doc-bg)`；MilkdownEditor 设 `--document-width` from contentWidth。

- [ ] **Step 1: 写失败测试 `tests/doc-paper.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const themes = read('src/styles/themes.ts')
const milkdown = read('src/additional/milkdown/milkdown.css')
const milk = read('src/components/editor/MilkdownEditor.tsx')
assert.match(themes, /'--doc-bg':\s*'#faf6ee'/, 'parchment 纸面必须羊皮纸 #faf6ee')
assert.match(themes, /'--doc-bg':\s*'#1C1C1F'/, 'dark 纸面必须 #1C1C1F')
assert.match(milkdown, /\.textus-editor-shell \.milkdown\s*\{[^}]*background:\s*var\(--doc-bg\)/, '纸面必须涂 var(--doc-bg)')
assert.match(milk, /setProperty\("--document-width"/, 'MilkdownEditor 必须接线 contentWidth → --document-width')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/doc-paper.test.mjs`
Expected: FAIL（`--doc-bg` 未定义、milkdown bg 透明、MilkdownEditor 未接线）。

- [ ] **Step 3: 实现**

`themes.ts`：parchment 加 `'--doc-bg': '#faf6ee'`；dark 加 `'--doc-bg': '#1C1C1F'`。
`milkdown.css` `.textus-editor-shell .milkdown`：`background: var(--doc-bg)`。
`MilkdownEditor.tsx`：仿 CodeEditor.tsx:140-156 —— `const contentWidth = useSettingsStore(s => s.contentWidth)`；`useEffect` 内 `shellRef.current?.style.setProperty('--document-width', \`${contentWidth}px\`)`，deps `[contentWidth]`。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/doc-paper.test.mjs tests/content-measure.test.mjs`
Expected: PASS（content-measure 的 `--document-width: 760px` 默认仍绿）。

- [ ] **Step 5: 提交**

```bash
git add src/styles/themes.ts src/additional/milkdown/milkdown.css src/components/editor/MilkdownEditor.tsx tests/doc-paper.test.mjs
git commit -m "feat(editor): WYSIWYG 纸面涂 --doc-bg + 接线 contentWidth（G13/G14）"
```

---

### Task 7: 死代码清理（G20）

**Files:**
- Modify: `src/styles/code-mode.css`（删 split 死规则）
- Test: `tests/code-mode-boundary.test.mjs`

**Interfaces:**
- Consumes: 无。
- Produces: code-mode.css 无死 split 规则。

- [ ] **Step 1: 写失败断言**

`tests/code-mode-boundary.test.mjs` 追加：
```js
const codeMode = read('src/styles/code-mode.css')
assert.doesNotMatch(codeMode, /\.code-split(?:ter|ter-container)\b/, 'code-mode.css 不得残留 .code-split 死规则')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/code-mode-boundary.test.mjs`
Expected: FAIL（死规则仍存）。

- [ ] **Step 3: 删死规则**

`code-mode.css` 删除 `.code-splitter`/`.code-splitter-container`/相关 `.code-split*` 死块（若引用处无对应组件）。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/code-mode-boundary.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/styles/code-mode.css tests/code-mode-boundary.test.mjs
git commit -m "chore(ui): 删 code-mode.css 死 split 规则（G20）"
```

---

## 收尾（合并前）

- [ ] 全量：`npm run typecheck` 0 错；`npm test` 全绿；`npm run test:e2e` 3/3；build-artifacts 绿。
- [ ] 整站评审（对照 DESIGN-1 §5/§6/§8.1 + Nebula 签名，目测关键面）。
- [ ] 合并 `dev`；升版本（1.4.1→1.5.0，UI 重设计=minor）；`LPK_VERSION` 重打包；`lzc-cli app install`；删 lzc 构建产物。
