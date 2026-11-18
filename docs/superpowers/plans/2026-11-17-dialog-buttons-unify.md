# 弹框按钮统一 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一所有弹框按钮的文字/背景/线框，全部走 accent token（随强调色变化），并修掉看不清/不显示的问题。

**Architecture:** 纯 CSS 层统一 + 修根因。`--accent-hover` 从 20% 透明浅红改为加深 accent（一处修好 `.ud-btn--primary`/`.search-btn--primary` hover 白字消失）；主按钮统一为 `--accent-primary` 实底 + `--accent-foreground` 文字 + 同色线框；次/幽灵按钮统一 `0.7px var(--border-subtle)` 线框 + `--text-secondary` 文字 + hover accent 边框。`.ui-btn--primary` 缺 base 规则（静止无底=不显示），需补。

**Tech Stack:** CSS（token + 组件样式），无组件逻辑。

**Spec:** `docs/superpowers/specs/2026-11-17-dialog-buttons-unify-design.md`

## Global Constraints

- 主按钮文字一律 `var(--accent-foreground)`（禁硬编码 `white`/`#fff`），背景 `var(--accent-primary)`，线框 `0.7px` 同色。
- 次/幽灵按钮线框 `0.7px solid var(--border-subtle)`，文字 `var(--text-secondary)`，hover 边框 `var(--accent-primary)` + 文字 `var(--text-primary)`。
- `--accent-hover` 必须为加深 accent（`color-mix(in srgb, var(--accent-primary) 88%, #000)`），不得再是浅色 alpha 底。
- 不改组件 classNames / 尺寸 / 圆角；不引入新组件。
- `.welcome-btn` 与 `.search-btn--primary` 属非弹框，但共用同一 token 体系，一并对齐（同一根因）。

## Review Focus

1. **hover 对比度**：主按钮 hover 后（加深 accent 底 + `--accent-foreground` 字）在浅色/深色主题下都可读，白字不再压浅红。
2. **静止态可读**：`.ui-btn--primary` 静止时必须有 accent 实底（此前无 base 规则=不显示）。
3. **token 统一**：任何主按钮不得绕过 accent token（无 `--color-primary`/`--color-on-primary` 直接做按钮文字/背景）。
4. **线框统一**：`.settings-save-btn`/`.welcome-btn--primary` 从 `border: none` 改为同色线框，不出现尺寸突变或布局抖动。
5. **无回归**：既有 `ui-interactions` / `ui-check-primary` / `design1-v2-conformance` 测试继续通过（它们断言的是 classNames/checkbox/focus-ring，不涉本次改的值）。

---

### Task 1: 修根因 `--accent-hover` + 主按钮统一

**Files:**
- Modify: `src/styles/color-tokens.css`（`--accent-hover`）
- Modify: `src/styles/settings-dialog.css`（`.ud-btn--primary`、`.settings-save-btn`）
- Modify: `src/styles/ui.css`（`.ui-btn--primary` base + hover + disabled）
- Modify: `src/styles/welcome-screen.css`（`.welcome-btn--primary`）
- Test: `tests/dialog-buttons-unify.test.mjs`（新建）

**Interfaces:**
- Consumes: 无（不依赖其它任务）。
- Produces: 主按钮统一规范（accent 实底 + accent-foreground 文字 + 同色线框 + hover 加深），Task 2 沿用。

- [ ] **Step 1: 写失败测试 `tests/dialog-buttons-unify.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const colorTokens = read('src/styles/color-tokens.css')
const settingsDialog = read('src/styles/settings-dialog.css')
const uiCss = read('src/styles/ui.css')
const welcomeCss = read('src/styles/welcome-screen.css')

// 根因：--accent-hover 必须加深（不再 20% 浅红），主按钮 hover 白字才可读
assert.match(colorTokens, /--accent-hover:\s*color-mix\(in srgb,\s*var\(--accent-primary\)\s*88%,\s*#000\)/, '--accent-hover 必须加深 accent')

// 主按钮文字/背景/线框统一走 accent token，禁硬编码白字
assert.match(settingsDialog, /\.ud-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.ud-btn--primary 文字必须走 accent-foreground')
assert.doesNotMatch(settingsDialog, /\.ud-btn--primary\s*\{[^}]*color:\s*(white|#fff)\b/, '.ud-btn--primary 不得硬编码白字')
assert.match(settingsDialog, /\.settings-save-btn\s*\{[^}]*border:\s*0\.7px solid var\(--accent-primary\)/, '.settings-save-btn 必须有统一线框')

// .ui-btn--primary 缺 base 规则（静止无底=不显示），必须补 accent 实底 + accent-foreground 字
assert.match(uiCss, /\.ui-btn--primary\s*\{[^}]*background:\s*var\(--accent-primary\)/, '.ui-btn--primary 必须补 accent 实底 base')
assert.match(uiCss, /\.ui-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.ui-btn--primary 文字必须走 accent-foreground')

assert.match(welcomeCss, /\.welcome-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.welcome-btn--primary 文字必须走 accent-foreground')

console.log('dialog buttons unify (primary) checks passed')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/dialog-buttons-unify.test.mjs`
Expected: FAIL（`--accent-hover` 仍是 a20、`white` 仍在、`.ui-btn--primary` 无 base 等）

- [ ] **Step 3: 实现**

1. `src/styles/color-tokens.css`：
   ```css
   --accent-hover:         color-mix(in srgb, var(--accent-primary) 88%, #000);
   ```
2. `src/styles/settings-dialog.css` `.ud-btn--primary`：`color: white` → `color: var(--accent-foreground)`；hover 行 `color: white` → `color: var(--accent-foreground)`（background/border-color 已是 `var(--accent-hover)`，token 修好后自动加深）。线框已由 `.ud-btn` 的 `border: 0.7px solid var(--border-subtle)` + `.ud-btn--primary` 的 `border-color: var(--accent-primary)` 提供，无需改。
3. `src/styles/settings-dialog.css` `.settings-save-btn`：`border: none` → `border: 0.7px solid var(--accent-primary)`；hover 加 `border-color: var(--accent-hover)`。
4. `src/styles/ui.css`：补 `.ui-btn--primary` base 规则（置于 `.ui-btn` 之后、`.ui-btn--primary:hover` 之前）：
   ```css
   .ui-btn--primary  { background: var(--accent-primary); border-color: var(--accent-primary); color: var(--accent-foreground); }
   ```
   改 `.ui-btn--primary:hover:not(.disabled)`：`background: color-mix(in srgb, var(--accent-primary) 88%, #000)`（原用 `--color-primary`）。
   改 `.ui-btn--primary.disabled`：`color: var(--color-on-primary)` → `color: var(--accent-foreground)`。
5. `src/styles/welcome-screen.css` `.welcome-btn--primary`：`color: var(--color-on-primary)` → `color: var(--accent-foreground)`；`border: none` → `border: 0.7px solid var(--accent-primary)`（welcome-btn 基类已是 `border: none`，primary 覆写为同色线框）。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/dialog-buttons-unify.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/styles/color-tokens.css src/styles/settings-dialog.css src/styles/ui.css src/styles/welcome-screen.css tests/dialog-buttons-unify.test.mjs
git commit -m "style(dialog): 主按钮统一走 accent token + 修 --accent-hover 根因

- --accent-hover 从 20% 透明浅红改为加深 accent，修 .ud-btn--primary/.search-btn--primary hover 白字消失
- 主按钮文字改 var(--accent-foreground)，去硬编码 white
- .settings-save-btn/.welcome-btn--primary 补统一线框
- .ui-btn--primary 补缺失的 base accent 实底规则（此前静止不显示）"
```

---

### Task 2: 次/幽灵按钮统一 + 全量验证

**Files:**
- Modify: `src/styles/ui.css`（`.ui-btn--outline`、`.ui-btn--ghost` base + hover）
- Modify: `src/styles/welcome-screen.css`（`.welcome-btn--ghost`）
- Test: `tests/dialog-buttons-unify.test.mjs`（追加断言）

**Interfaces:**
- Consumes: Task 1 的统一规范（accent-foreground / accent-primary / border-subtle）。
- Produces: 次/幽灵按钮统一规范。

- [ ] **Step 1: 追加失败断言到 `tests/dialog-buttons-unify.test.mjs`**

```js
// 次/幽灵按钮：统一线框 + 文字 + hover 走 accent，不得绕过 token
assert.match(uiCss, /\.ui-btn--outline\s*\{[^}]*border:\s*0\.7px solid var\(--border-subtle\)/, '.ui-btn--outline 必须有统一线框')
assert.match(uiCss, /\.ui-btn--outline\s*\{[^}]*color:\s*var\(--text-secondary\)/, '.ui-btn--outline 文字必须走 text-secondary')
assert.match(uiCss, /\.ui-btn--outline:hover[^{]*\{[^}]*border-color:\s*var\(--accent-primary\)/, '.ui-btn--outline hover 边框必须走 accent-primary')
assert.match(uiCss, /\.ui-btn--ghost:hover[^{]*\{[^}]*background:\s*var\(--bg-hover\)/, '.ui-btn--ghost hover 背景必须走 bg-hover')
assert.doesNotMatch(welcomeCss, /\.welcome-btn--ghost\s*\{[^}]*color:\s*(white|#fff)\b/, '.welcome-btn--ghost 不得硬编码白字')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/dialog-buttons-unify.test.mjs`
Expected: FAIL（`.ui-btn--outline`/`--ghost` 无 base、hover 用 `--color-primary`）

- [ ] **Step 3: 实现**

1. `src/styles/ui.css`：补 `.ui-btn--outline` 与 `.ui-btn--ghost` base 规则（置于 `.ui-btn` 之后）：
   ```css
   .ui-btn--outline  { border: 0.7px solid var(--border-subtle); color: var(--text-secondary); }
   .ui-btn--ghost  { border-color: transparent; color: var(--text-secondary); }
   ```
   改 `.ui-btn--outline:hover:not(.disabled)`：`border-color: var(--color-primary); color: var(--color-primary)` → `var(--accent-primary)` 两处。
   改 `.ui-btn--ghost:hover:not(.disabled)`：`background: var(--color-bg-secondary); color: var(--color-text-primary)` → `background: var(--bg-hover); color: var(--text-primary)`。
2. `src/styles/welcome-screen.css` `.welcome-btn--ghost`：已是 `var(--t-wl-btn-bd)` 线框 + `var(--t-wl-btn-fg)` 文字，确认 hover 沿用 accent 边框（如需对齐，hover 改 `border-color: var(--accent-primary)`）。

- [ ] **Step 4: 运行全量测试 + 类型检查**

Run: `npm test && npx tsc --noEmit`
Expected: 全过（含新断言；既有 `ui-interactions`/`ui-check-primary`/`design1-v2-conformance` 不受影响）

- [ ] **Step 5: 提交**

```bash
git add src/styles/ui.css src/styles/welcome-screen.css tests/dialog-buttons-unify.test.mjs
git commit -m "style(dialog): 次/幽灵按钮统一线框文字 + hover 走 accent token

- .ui-btn--outline/.ui-btn--ghost 补 base 规则（此前缺失）
- hover 从 --color-primary 改走 --accent-primary / --bg-hover + --text-primary
- .welcome-btn--ghost hover 对齐 accent 边框"
```
