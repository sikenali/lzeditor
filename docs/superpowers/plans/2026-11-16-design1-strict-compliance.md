# DESIGN-1.md 严格合规：毛玻璃背景 + 窗口 1280×900 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 lzeditor 严格符合 DESIGN-1.md §2.1（毛玻璃顶栏/页脚背景）并把应用窗口定为 1280×900（Electron + Web 观感），采用已批准的方案 A。

**Architecture:** 纯 CSS/配置改动。新增 `--bg-rgb` token（tokens.css + themes.ts 双主题），把 `.toolbar`/`.app-footer` 背景改为毛玻璃（`rgba(var(--bg-rgb), …)` + `backdrop-filter: blur(16px)` + `0.7px` 微光分割线）；`.app` 加 `max-width:1280px; margin:0 auto`（Web 居中限宽）；`electron/main.ts` 窗口 `width:1440→1280`。不改弹窗/面板定位（`position:fixed`、`calc(100vh-…)`、92vw/92vh/1280 保留）。

**Tech Stack:** React + Vite + Electron；node:test 静态一致性测试（沿用 `tests/design1-v2-conformance.test.mjs` 的 read-file + assert.match 模式）。

**Spec:** `docs/superpowers/specs/2026-11-16-design1-strict-compliance.md`

## Global Constraints

- 毛玻璃背景随主题切换：`--bg-rgb` 必须写进 `tokens.css :root`（浅色）与 `themes.ts` 的 `parchment`/`dark` 两个对象，禁止 `[data-theme]` 覆写块。
- 值精确：light `--bg-rgb: 250, 247, 242`（=#FAF7F2）；dark `--bg-rgb: 23, 23, 26`（=#17171A）。
- 顶栏毛玻璃：`background: rgba(var(--bg-rgb), 0.82)` + `backdrop-filter: blur(16px)` + 底部 `0.7px` 微光分割线（§2.1）。
- 页脚毛玻璃：`background: rgba(var(--bg-rgb), 0.75)` + 顶部 `0.7px` 微光分割线（§2.1）。
- Electron `BrowserWindow`：`width:1280`、`height:900`；`minWidth:1024`/`minHeight:640` 保留。
- 顶栏 `-webkit-app-region: drag` 保留（Electron 无边框窗口拖动区）。

## Review Focus

- **弹窗/面板/tooltip 不因 max-width/毛玻璃错位** —— 弹窗用 `position:fixed` + `calc(100vh-…)`，必须仍相对视口正确。测试：不动的 `ui.css`/`panels.css`/`floating.css` 中 `position: fixed` 与 `calc(100vh` 保持原样（Task 2 断言不回归）。
- **Electron 标题栏拖动** —— `.toolbar` 是 `-webkit-app-region: drag`，毛玻璃不得移除。测试：Task 1 断言 `.toolbar` 保留 `app-region: drag`。
- **浅色下无「深空窗口」割裂** —— 毛玻璃用 `--bg-rgb`（浅色=羊皮纸），非深空。测试：Task 1 断言浅色 `--bg-rgb: 250, 247, 242` 且 toolbar 背景用 `rgba(var(--bg-rgb), 0.82)`。

---

### Task 1: 毛玻璃顶栏/页脚背景 + `--bg-rgb` token

**Files:**
- Modify: `src/styles/tokens.css`（`:root` 加 `--bg-rgb`）
- Modify: `src/styles/themes.ts`（`parchment`/`dark` 两对象各加 `'--bg-rgb'`）
- Modify: `src/styles/layout.css`（`.toolbar`、`.app-footer`）
- Test: `tests/design1-v2-conformance.test.mjs`

**Interfaces:**
- Produces: `--bg-rgb` token（light `250,247,242` / dark `23,23,26`），供 Task 2 的 `.app` 背景上下文与后续视觉使用。

- [ ] **Step 1: 写失败测试（conformance 断言）**

在 `tests/design1-v2-conformance.test.mjs` 末尾追加：

```js
// §2.1 毛玻璃顶栏/页脚 + --bg-rgb 主题 token
assert.match(tokens, /--bg-rgb:\s*250,\s*247,\s*242/, '浅色 --bg-rgb 必须 = #FAF7F2')
assert.match(block('parchment'), /'--bg-rgb':\s*'250,\s*247,\s*242'/, 'parchment 主题必须含 --bg-rgb=#FAF7F2')
assert.match(block('dark'), /'--bg-rgb':\s*'23,\s*23,\s*26'/, 'dark 主题必须含 --bg-rgb=#17171A')
const tb = layoutCss4.match(/\.toolbar\s*\{[^}]*\}/)?.[0] || ''
assert.match(tb, /rgba\(var\(--bg-rgb\),\s*0\.82\)/, '顶栏背景必须毛玻璃 rgba(var(--bg-rgb),0.82)（§2.1）')
assert.match(tb, /backdrop-filter:\s*blur\(16px\)/, '顶栏必须 backdrop-filter blur(16px)（§2.1）')
assert.match(tb, /app-region:\s*drag/, '顶栏 Electron 拖动区必须保留（frame:false）')
assert.match(tb, /border-bottom:\s*0\.7px/, '顶栏底部必须 0.7px 分割线')
const ft = layoutCss4.match(/\.app-footer\s*\{[^}]*\}/)?.[0] || ''
assert.match(ft, /rgba\(var\(--bg-rgb\),\s*0\.75\)/, '页脚背景必须毛玻璃 rgba(var(--bg-rgb),0.75)（§2.1）')
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/design1-v2-conformance.test.mjs`
Expected: FAIL（`--bg-rgb` / 毛玻璃缺失）

- [ ] **Step 3: 实现**

- `tokens.css :root`：加 `--bg-rgb: 250, 247, 242;`
- `themes.ts` `parchment` 对象：加 `'--bg-rgb': '250, 247, 242',`
- `themes.ts` `dark` 对象：加 `'--bg-rgb': '23, 23, 26',`
- `layout.css` `.toolbar`：`background: var(--color-bg-white)` → `rgba(var(--bg-rgb), 0.82)`；加 `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px)`；`border-bottom` 保留 `0.7px`（改为微光分割线渐变可后调）。
- `layout.css` `.app-footer`：背景 → `rgba(var(--bg-rgb), 0.75)`；顶部 `0.7px` 分割线。
- `.toolbar` 内需在毛玻璃上保持可读的子元素（图标/文字）若有对比度问题，微调其颜色，不改毛玻璃整体。

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/design1-v2-conformance.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/styles/tokens.css src/styles/themes.ts src/styles/layout.css tests/design1-v2-conformance.test.mjs
git commit -m "feat(design1): 毛玻璃顶栏/页脚背景 + --bg-rgb token（DESIGN-1.md §2.1）"
```

---

### Task 2: Web `.app` 居中限宽 1280

**Files:**
- Modify: `src/styles/app.css`
- Test: `tests/design1-v2-conformance.test.mjs`

**Interfaces:**
- Consumes: `--bg-rgb`（Task 1）；`.app` 现为 `width:100vw; height:100vh`。
- Produces: `.app` 为 `max-width:1280px; margin:0 auto; height:100vh`（Web 窗口观感）。

- [ ] **Step 1: 写失败测试**

```js
// 方案 A：Web 应用内容居中限宽 1280（窗口观感），高度仍铺满视口
const appCss = read('src/styles/app.css')
const appRule = appCss.match(/\.app\s*\{[^}]*\}/)?.[0] || ''
assert.match(appRule, /max-width:\s*1280px/, '.app 必须 max-width:1280px（窗口观感）')
assert.match(appRule, /margin:\s*0 auto/, '.app 必须水平居中')
assert.match(appRule, /height:\s*100vh/, '.app 高度仍铺满视口')
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/design1-v2-conformance.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/styles/app.css` `.app`：`width:100vw` → `width:100%; max-width:1280px; margin:0 auto`；`height:100vh` 保留。`body` 已是 `background: var(--bg-primary)`，作为两侧背板，无需改。

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/design1-v2-conformance.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/styles/app.css tests/design1-v2-conformance.test.mjs
git commit -m "feat(design1): Web 应用内容居中限宽 1280px（窗口观感）"
```

---

### Task 3: Electron 窗口 1280×900

**Files:**
- Modify: `electron/main.ts`
- Test: `tests/design1-v2-conformance.test.mjs`

**Interfaces:**
- Produces: Electron `BrowserWindow` `width:1280, height:900`（min 1024×640 保留）。

- [ ] **Step 1: 写失败测试**

```js
// 窗口 1280×900（方案 A）
const main = read('electron/main.ts')
assert.match(main, /width:\s*1280/, 'Electron 窗口宽必须 1280')
assert.match(main, /height:\s*900/, 'Electron 窗口高必须 900')
assert.match(main, /minWidth:\s*1024/, 'minWidth 保留 1024')
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/design1-v2-conformance.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现**

`electron/main.ts` `createWindow()`：`width: 1440` → `1280`；`height: 900` 与 `minWidth:1024`/`minHeight:640` 保留。

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/design1-v2-conformance.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add electron/main.ts tests/design1-v2-conformance.test.mjs
git commit -m "feat(design1): Electron 窗口 1280×900"
```

---

## 执行备注

- 视觉确认（构建 + 截图）为可选项；静态一致性测试是本计划的验收主证据。
- 三个任务互相独立（不同文件），可顺序执行；每个任务结尾有独立可测交付物。
