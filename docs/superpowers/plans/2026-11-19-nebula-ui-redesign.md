# Nebula UI 重设计（电光青）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 lzeditor 整站 UI 从「羊皮纸 + 朱红」全面切换到「Nebula 电光青」风格（lzc2vsdx / DESIGN-1 v2），浅/深双主题都换，保留 JS 内联主题机制与布局结构。

**Architecture:** 绝大部分视觉已 token 化（`--color-*` / `--accent-*`），硬编码暖色仅 `tokens.css :root` 8 处。故以**token 换血**为主：改 `themes.ts` 的 `themeTokens.parchment/dark` 值与 `ACCENT_PRESETS`，同步 `tokens.css :root` 回退值与 `settingsStore`/`useTheme` 默认强调色，补 `--tech-cyan`/`--glow-*`/`--font-display`/收紧动效 token，最后整站核对与清暖色残留。布局结构（Toolbar/LeftNav/statusbar）与编辑器内核不动。

**Tech Stack:** TypeScript + Vite + React + Zustand；CSS 变量 token 系统；node:test 边界/一致性测试（`tests/*.test.mjs`）。

**Spec:** `docs/superpowers/specs/2026-11-19-nebula-ui-redesign-design.md`（本计划从该设计文档论证，执行者两份同读）

## Global Constraints

- 主题唯一真源是 `src/styles/themes.ts` 的 `themeTokens`（`parchment`/`dark`），由 `hooks/useTheme.ts` 的 `applyTheme()` 内联写 `<html>`；`tokens.css :root` 只有回退默认。**禁止**在 CSS 里按 `[data-theme]` 覆写 token（AGENT.md §7）。
- 内部主题键名保留 `parchment`/`dark`（不重命名为 `light`）——`parchment` 是内部类型名，运行时已通过 `data-theme="light"` 暴露；重命名仅机械改动无视觉收益，不做。
- 强调色模型保留 JS 内联（`applyTheme` 写 `--color-primary` + `--accent-*`）；**不**引入 lzc2vsdx 的 `[data-accent]` CSS 块。
- 不新增依赖（Space Grotesk 已自托管于 `src/assets/fonts/acks/space-grotesk/` 且有 `@font-face`）。
- 主强调色 `--color-on-primary` 改为 `#0A1628`（深墨字压在亮青上，Nebula 特征）；任何用主色做填充的背景上，文字必须是 `--color-on-primary`。

## Review Focus

1. **深色强调色过暗**：`ensureDarkAccent` 必须继续保色相提亮自定义 hex；预设色在深色下用 `dark` 变体（青 `#00F5C8`）。→ Task 1 断言 `--color-primary` 深色 = `#00F5C8`，且 `dark-accent-floor` 保留通过。
2. **青作浅底文字对比不足**（cyan #00D4AA on #F4F7FA 仅 ~1.5:1）：Nebula 用「青填充 + 深字 on-primary」而非青文字。→ Task 1 把「主色对底色 ≥4.5:1」断言改为「on-primary 对主色 ≥4.5:1」。
3. **暖色残留**：`--t-hui-bg #FDF9F0` 等浅色派生暖值在浅色下会露暖色。→ Task 3 grep 断言无暖色 hex 残留。
4. **旧 accent 迁移**：localStorage 存旧 preset id（`vermilion`）→ 新色板找不到须回退默认青；存旧 hex → 直接生效。→ Task 1 断言 `resolveAccent('vermilion')` 回退 `#00D4AA`、`resolveAccent('#C0392B')` 返回该 hex。
5. **on-primary 反转破坏按钮文字**：`--accent-foreground: var(--color-on-primary)` 自动跟随，但任何硬编码 `color:#fff` 于主色填充上会变白字白底。→ Task 3 核查主色填充表面文字均用 `--color-on-primary`/`--accent-foreground`。

---

### Task 1: Nebula 颜色 token 换血 + 强调色系统

**Files:**
- Modify: `src/styles/themes.ts`（`themeTokens.parchment`/`dark` 值、`ACCENT_PRESETS` 类型与数据）
- Modify: `src/styles/tokens.css`（`:root` 回退值 → Nebula）
- Modify: `src/store/settingsStore.ts`（默认 `accentColor:'cyan'`、`getAccentColor` 回退 `#00D4AA`）
- Modify: `src/hooks/useTheme.ts`（`resolveAccentId`/`resolveAccent` 默认青、`applyTheme` 深色取预设 `dark` 变体）
- Test: `tests/theme-boundary.test.mjs`、`tests/design1-v2-conformance.test.mjs`、`tests/ui-interactions.test.mjs`（断言 → Nebula 值）

**Interfaces:**
- Consumes: 现有 `themeTokens`/`ACCENT_PRESETS`/`applyTheme` 签名。
- Produces: `ACCENT_PRESETS` 每条含 `{ id, name, color, dark }`（`dark` 为深色变体）；`themeTokens.parchment/dark` 为 Nebula 值；`settingsStore` 默认 `accentColor:'cyan'`。后续任务依赖这些值。

- [ ] **Step 1: 把三个测试文件断言改为 Nebula 值（先红）**

`tests/theme-boundary.test.mjs:32`：`assert.match(settingsStore, /vermilion/, ...)` → `assert.match(settingsStore, /accentColor: 'cyan'/, '默认强调色必须电光青')`

`tests/design1-v2-conformance.test.mjs:132-134`：
```js
assert.match(tokens, /--bg-rgb:\s*244,\s*247,\s*250/, '浅色 --bg-rgb 必须 = #F4F7FA（Nebula 冷科技基底）')
assert.match(block('parchment'), /'--bg-rgb':\s*'244,\s*247,\s*250'/, 'parchment 主题必须含 --bg-rgb=#F4F7FA')
assert.match(block('dark'), /'--bg-rgb':\s*'15,\s*22,\s*35'/, 'dark 主题必须含 --bg-rgb=#0F1623')
```

`tests/ui-interactions.test.mjs:739-768` 四个颜色断言改 Nebula：
```js
test('§10.2 暗色主色必须提亮到 ≥ #E05050，亮色才是电光青填充', () => {
  assert.equal(themeHex('parchment', '--color-primary'), '#00D4AA')
  assert.ok(atLeast(themeHex('dark', '--color-primary'), '#E05050'), `暗色主色实测 ${themeHex('dark', '--color-primary')}，低于 #E05050`)
})
test('§10.2 暗色文本层级：muted ≥ #64748B、faint ≥ #475569（Nebula 深空值）', () => {
  assert.equal(themeHex('dark', '--color-text-muted'), '#64748B', '暗色 muted 必须 Nebula 值')
  assert.equal(themeHex('dark', '--color-text-faint'), '#475569', '暗色 faint 必须 Nebula 值')
})
// 边框与底色 ≥15% 亮度差：保持（Nebula #1E2A3A vs #0A0F18 ≈1.30:1 通过）
test('§10.2 Nebula 填充模型：on-primary 对主色对比度 ≥ 4.5:1（青填充深字）', () => {
  for (const t of ['parchment', 'dark']) {
    const c = contrast(themeHex(t, '--color-on-primary'), themeHex(t, '--color-primary'))
    assert.ok(c >= 4.5, `${t} on-primary 对主色只有 ${c.toFixed(2)}:1`)
  }
})
test('§10.2 暗色下边框与分割底色都改用 token，没有写死的值', () => {
  assert.equal(themeHex('dark', '--color-border'), '#1E2A3A')
  assert.equal(themeHex('dark', '--color-border-soft'), '#162030', '暗色两级边框不同值（Nebula 深空）')
  for (const t of ['parchment', 'dark']) assert.equal(themeBlock(t).match(/'--color-divider'/), null)
})
```

- [ ] **Step 2: 运行这三个测试，确认先红**

Run: `node --import tsx --test tests/theme-boundary.test.mjs tests/design1-v2-conformance.test.mjs tests/ui-interactions.test.mjs`
Expected: FAIL（旧值断言命中旧代码而失败，如 `'#C0392B'` ≠ `'#00D4AA'`）

- [ ] **Step 3: 改 `src/styles/themes.ts` `themeTokens.parchment` 为 Nebula 浅色值**

替换 parchment 对象内各 `--color-*`/`--bg-rgb` 值（逐字对照设计文档 §3.2）：
```
--color-primary #00D4AA  --color-primary-soft #E8FFF8  --color-primary-deep #0A6B5A  --color-on-primary #0A1628
--color-bg-main #F4F7FA  --bg-rgb '244, 247, 250'  --color-bg-secondary #EEF2F7  --color-bg-card #FFFFFF  --color-bg-white #FFFFFF
--color-text-primary #0D1B2A  --color-text-body #1A2A3A  --color-text-secondary #4A5568  --color-text-muted #718096  --color-text-faint #A0AEC0
--color-border #D4DEEB  --color-border-soft #E8EDF4  --color-border-hover #B8C5D6
--color-success #00A878  --color-success-strong #008A62  --color-success-soft #E6FFF4
--color-info #4A9EFF  --color-info-soft #EBF4FF  --color-warning #E8960C  --color-warning-soft #FFF8E6  --color-error #FF4D6D  --color-error-soft #FFF0F3
```

- [ ] **Step 4: 改 `src/styles/themes.ts` `themeTokens.dark` 为 Nebula 深空值**

替换 dark 对象（对照设计文档 §3.3）：
```
--color-primary #00F5C8  --color-primary-soft #0A2A25  --color-primary-deep #00B89A  --color-on-primary #0A1628
--color-bg-main #0A0F18  --bg-rgb '15, 22, 35'  --color-bg-secondary #0F1623  --color-bg-card #151D2C  --color-bg-white #151D2C
--color-text-primary #E8EEF5  --color-text-body #C8D3E0  --color-text-secondary #94A3B8  --color-text-muted #64748B  --color-text-faint #475569
--color-border #1E2A3A  --color-border-soft #162030  --color-border-hover #2A3A50
--color-success #00D4AA  --color-success-strong #00D4AA  --color-success-soft #0A2A22
--color-info #6BB3FF  --color-info-soft #0C1A2E  --color-warning #FFB347  --color-warning-soft #1E1508  --color-error #FF6B85  --color-error-soft #1E0C12
```

- [ ] **Step 5: 改 `src/styles/themes.ts` `ACCENT_PRESETS` 为 Nebula 五色 + `dark` 变体**

```ts
export const ACCENT_PRESETS: { id: string; name: string; color: string; dark: string }[] = [
  { id: 'cyan',  name: '电光青', color: '#00D4AA', dark: '#00F5C8' },
  { id: 'gold',  name: '赛博金', color: '#FFB347', dark: '#FFCC66' },
  { id: 'green', name: '星云绿', color: '#00A878', dark: '#00D4AA' },
  { id: 'blue',  name: '琉璃蓝', color: '#4A9EFF', dark: '#6BB3FF' },
  { id: 'coral', name: '霓虹珊瑚', color: '#FF4D6D', dark: '#FF6B85' },
]
```

- [ ] **Step 6: 改 `src/styles/tokens.css` `:root` 回退值 → Nebula（与 themes.ts 一致）**

`:root` 内 8 处暖色 hex 换 Nebula 浅色值（`--color-primary #00D4AA`、`--color-primary-soft #E8FFF8`、`--color-bg-main #F4F7FA`、`--bg-rgb 244, 247, 250`、`--color-bg-secondary #EEF2F7`、`--color-bg-card #FFFFFF`、`--color-border #D4DEEB`、`--color-border-soft #E8EDF4`、`--color-border-hover #B8C5D6`），并同步 `--color-text-*`/`--color-on-primary` 等。注意 `--color-primary-deep` 现为 `#3A5C96` → `#0A6B5A`。

- [ ] **Step 7: 改 `src/store/settingsStore.ts` 默认强调色 + 回退**

`accentColor: 'vermilion'` → `'cyan'`；`getAccentColor` 回退 `'#C0392B'` → `'#00D4AA'`。

- [ ] **Step 8: 改 `src/hooks/useTheme.ts` 强调色解析（深色取预设 dark 变体）**

- `resolveAccentId` 无参默认 `'vermilion'` → `'cyan'`（两处 `?? 'vermilion'`）。
- `resolveAccent` 回退 `ACCENT_PRESETS[0].color`（自动变青，无需改）；但需让深色取 `dark` 变体。
- `applyTheme`：`resolveAccentId(accent)` 后，若 `type==='dark'` 且命中预设 → `hex = preset.dark`；否则 `hex = resolveAccent(accent)`；随后 `if (type==='dark') hex = ensureDarkAccent(hex)`（保自定义 hex 安全）。`resolveAccentId` 需返回 id 供查预设。
- 保留 `DARK_ACCENT_BOOST`/`ensureDarkAccent`/HSL 工具（`dark-accent-floor` 依赖）。

- [ ] **Step 9: 运行三个测试，确认转绿**

Run: `node --import tsx --test tests/theme-boundary.test.mjs tests/design1-v2-conformance.test.mjs tests/ui-interactions.test.mjs tests/dark-accent-floor.test.mjs`
Expected: PASS（若 `ui-interactions` 其它断言因 on-primary 反转失败，定位并修正对应实现/断言）

- [ ] **Step 10: 全量测试 + typecheck**

Run: `npm run typecheck && npm test`
Expected: typecheck 0 错误；全量通过（若 `build-artifacts-removed` 因历史产物失败，先清理再跑）

- [ ] **Step 11: Commit**

```bash
git add src/styles/themes.ts src/styles/tokens.css src/store/settingsStore.ts src/hooks/useTheme.ts tests/theme-boundary.test.mjs tests/design1-v2-conformance.test.mjs tests/ui-interactions.test.mjs
git commit -m "feat(ui): 全面切换 Nebula 电光青 token（浅/深 + 强调色五色，默认青）"
```

---

### Task 2: 新增 Nebula token 体系（tech-cyan / glow / font-display / 动效）

**Files:**
- Modify: `src/styles/tokens.css`（`:root` 新增 `--tech-cyan`、`--tech-cyan-rgb`、`--glow-xs/sm/md/lg`、`--btn-shadow`、`--font-display`；收紧 `--t-fast/base/slow`、加 `--t-snap`、`--ease-spring`）
- Modify: `src/styles/color-tokens.css`（`--glow-*`/`--tech-cyan` 兼容别名）
- Test: `tests/nebula-tokens.test.mjs`（新增）

**Interfaces:**
- Consumes: Task 1 的 Nebula 颜色值。
- Produces: `--tech-cyan`/`--tech-cyan-rgb`、`--glow-xs/sm/md/lg`、`--btn-shadow`、`--font-display`、`--t-snap`/`--ease-spring` token。Task 3 用它们在表面着色。

- [ ] **Step 1: 写失败测试 `tests/nebula-tokens.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const tokens = read('src/styles/tokens.css')
// 新增 Nebula token 必须存在
for (const t of ['--tech-cyan:', '--tech-cyan-rgb:', '--glow-xs:', '--glow-sm:', '--glow-md:', '--glow-lg:', '--btn-shadow:', '--font-display:', '--t-snap:', '--ease-spring:']) {
  assert.match(tokens, new RegExp(t), `Missing token ${t}`)
}
// 电光青 token 值
assert.match(tokens, /--tech-cyan:\s*#00D4AA/, 'tech-cyan 必须 #00D4AA')
assert.match(tokens, /--tech-cyan-rgb:\s*0,\s*212,\s*170/, 'tech-cyan-rgb 必须 0,212,170')
assert.match(tokens, /--font-display:\s*'Space Grotesk'/, 'font-display 必须 Space Grotesk')
// 动效收紧：snap80/fast120/base180/slow280
assert.match(tokens, /--t-snap:\s*80ms/, 't-snap 必须 80ms')
assert.match(tokens, /--t-fast:\s*120ms/, 't-fast 必须 120ms')
assert.match(tokens, /--t-base:\s*180ms/, 't-base 必须 180ms')
assert.match(tokens, /--t-slow:\s*280ms/, 't-slow 必须 280ms')
console.log('nebula tokens ok')
```

- [ ] **Step 2: 运行确认先红**

Run: `node --import tsx --test tests/nebula-tokens.test.mjs`
Expected: FAIL（`--tech-cyan` 等未定义）

- [ ] **Step 3: 在 `src/styles/tokens.css` `:root` 新增 token**

```css
/* Nebula 强调色与 glow */
--tech-cyan: #00D4AA;
--tech-cyan-rgb: 0, 212, 170;
--glow-xs: 0 2px 8px rgba(var(--tech-cyan-rgb), 0.08);
--glow-sm: 0 4px 20px rgba(var(--tech-cyan-rgb), 0.12);
--glow-md: 0 8px 32px rgba(var(--tech-cyan-rgb), 0.18);
--glow-lg: 0 12px 48px rgba(var(--tech-cyan-rgb), 0.25);
--btn-shadow: rgba(0, 212, 170, 0.28);
/* 显示字体 */
--font-display: 'Space Grotesk', 'Inter', sans-serif;
```
收紧动效：`--t-fast: 150ms`→`120ms`、`--t-base: 200ms`→`180ms`、`--t-slow: 300ms`→`280ms`；新增 `--t-snap: 80ms`、`--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`。

- [ ] **Step 4: 在 `src/styles/color-tokens.css` 补 glow/tech-cyan 兼容别名**

在既有 `--color-glow` 附近加：`--glow-*` 与 `--tech-cyan` 直接 `var()` 引用（`--glow-sm: var(--glow-sm)` 会自引用，改为在 tokens.css 定义、color-tokens.css 仅透传或省略——实际只需 tokens.css 定义一次，color-tokens.css 不加重复定义，避免覆盖）。

- [ ] **Step 5: 运行测试转绿**

Run: `node --import tsx --test tests/nebula-tokens.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css tests/nebula-tokens.test.mjs
git commit -m "feat(ui): 新增 Nebula token 体系（tech-cyan/glow/font-display/动效收紧）"
```

---

### Task 3: 整站应用 Nebula 表面 + 暖色残留清除

**Files:**
- Modify: `src/styles/layout.css`（`--font-display` 应用品牌/标题；`--glow-sm/md` 应用激活态/CTA；冷调 `--t-*` 核对）
- Modify: `src/styles/settings-dialog.css`、`src/styles/welcome-screen.css`、`src/styles/ai-chat.css`、`src/styles/panels.css`、`src/styles/ui.css`（同）
- Test: `tests/nebula-surface.test.mjs`（新增）

**Interfaces:**
- Consumes: Task 2 的 `--font-display`/`--glow-*`/`--tech-cyan`。
- Produces: 整站表面用 Nebula 视觉；无暖色 hex 残留。

- [ ] **Step 1: 写失败测试 `tests/nebula-surface.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
// 1. 整站 CSS 不得残留羊皮纸暖色/朱红 hex（tokens.css :root 除外，它已被 Task 1 换成 Nebula 回退值）
const cssFiles = readdirSync(new URL('../src/styles/', import.meta.url)).filter(f => f.endsWith('.css'))
const warm = /#(FAF7F2|F7F3EA|FCFBF8|FDF9F0|C0392B|BE3B2E|FBE9E7|E5DFD3|EDE9E0|D9D2C2|E05050)/i
for (const f of cssFiles) {
  const bad = read(`src/styles/${f}`).split('\n').filter(l => warm.test(l))
  assert.equal(bad.length, 0, `${f} 残留暖色 hex：\n${bad.join('\n')}`)
}
// 2. 品牌/标题必须用 --font-display
const layout = read('src/styles/layout.css')
assert.match(layout, /\.rail-logo[^{]*\{[^}]*var\(--font-display\)/, '左导航品牌 logo 必须用 --font-display')
assert.match(layout, /\.sidebar-header-title[^{]*\{[^}]*var\(--font-display\)/, '侧栏标题必须用 --font-display')
// 3. 关键 CTA 用 glow
assert.match(read('src/styles/ai-chat.css'), /\.ai-chat-send[^{]*\{[^}]*var\(--glow-(sm|md)\)/, 'AI 发送按钮必须 glow')
assert.match(read('src/styles/welcome-screen.css'), /\.welcome-btn--primary[^{]*\{[^}]*var\(--glow-(sm|md)\)/, '欢迎页 CTA 必须 glow')
// 4. 主色填充表面文字必须 on-primary / accent-foreground（禁止 #fff 白字压青底）
const panels = read('src/styles/panels.css')
assert.doesNotMatch(panels, /background[^;]*var\(--color-primary\)[^}]*color:\s*#fff/, '主色填充不得白字')
console.log('nebula surface ok')
```

- [ ] **Step 2: 运行确认先红**

Run: `node --import tsx --test tests/nebula-surface.test.mjs`
Expected: FAIL（`--font-display` 未应用、暖色残留、glow 未应用）

- [ ] **Step 3: 应用 `--font-display` 到品牌/标题**

`layout.css`：`.rail-logo`、`.app-footer-brand`、`.sidebar-header-title`、`.library-section-title`、`.library-empty-title` 加 `font-family: var(--font-display)`；`settings-dialog.css` 标题、`welcome-screen.css` 品牌同理（用实际存在类名）。

- [ ] **Step 4: 应用 `--glow-*` 到关键 CTA/激活态**

`ai-chat.css` `.ai-chat-send` `box-shadow: var(--glow-sm)`（hover `--glow-md`）；`welcome-screen.css` `.welcome-btn--primary` `var(--glow-sm)`；`settings-dialog.css` `.settings-save-btn` `var(--glow-sm)`；`panels.css` 激活卡边框用 `color-mix(in srgb, var(--color-primary)…)` + `var(--glow-xs)`。

- [ ] **Step 5: 清暖色残留（`--t-*` 冷调）**

`themes.ts` parchment 的 `--t-hui-bg: '#FDF9F0'` → `'#FFFFFF'`；核对 `--t-bg-18 rgba(244,244,244,1)`、`--t-bg-24 #fff`、`--t-bg-27 rgba(253,253,253,1)`、`--t-bg-28 rgba(255,255,255,1)`、`--t-bg-31 rgba(255,255,255,0.45)` 等近白值——均为中性，无需改（仅 `--t-hui-bg` 带暖色，改白）。确认 `--t-wl-*` 为中性（不改）。

- [ ] **Step 6: 运行测试转绿**

Run: `node --import tsx --test tests/nebula-surface.test.mjs`
Expected: PASS（若仍有暖色 hex，定位并改 token 引用）

- [ ] **Step 7: 全量测试 + typecheck**

Run: `npm run typecheck && npm test`
Expected: typecheck 0；全量通过

- [ ] **Step 8: Commit**

```bash
git add src/styles/ tests/nebula-surface.test.mjs
git commit -m "feat(ui): 整站应用 Nebula 表面（font-display/glow）+ 清除暖色残留"
```

---

### Task 4: 全量验证 + 打包安装

**Files:**
- 无源码改动；仅验证与发布。

**Interfaces:**
- Consumes: Task 1-3 全部。

- [ ] **Step 1: typecheck + 全量测试**

Run: `npm run typecheck && npm test`
Expected: typecheck 0 错误；全量通过（345 项基线 + 新增 nebula 两测试；`build-artifacts-removed` 若因打包产物失败，属预期，发布前清理）

- [ ] **Step 2: 浏览器 e2e 核对浅/深主题**

Run: `npm run test:e2e`（若存在该脚本；否则手测 dev server）
Expected: 通过；浅/深两主题下整站无暖色/朱红残留观感，强调色青，on-primary 深字，glow 可见。

- [ ] **Step 3: 版本提升 + 打包**

Run: `LPK_VERSION=1.1.1 bash lzc/package.sh`（下一 patch/小版本；与 dev 当前版本 1.1.0 递增）
Expected: 产出 `lzc/cloud.lazycat.app.lzeditor-<ver>.lpk`，`Build complete`。

- [ ] **Step 4: 安装 + 盒上核对**

Run: `cd lzc && lzc-cli lpk install cloud.lazycat.app.lzeditor-<ver>.lpk`
Expected: 安装成功；访问 `https://lzeditor.jinglebaby.heiyu.space` 核对 Nebula 视觉。

- [ ] **Step 5: 同步版本文件并提交**

`lzc/package.yml`/`package.json`/`src/shared/version.ts` → `<ver>`；`git commit -m "chore(version): 升 <ver>（Nebula 电光青 UI 重设计）"`。

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §3.1/3.2/3.3（颜色）→ Task 1；§3.4（glow/font/motion）→ Task 2；§3.5（焦点环/玻璃态）与 §4 整站面 → Task 3；§6/§7 验证与 DoD → Task 4。无遗漏。
- **类型一致**：`ACCENT_PRESETS` 增 `dark` 字段在 Task 1 定义，`applyTheme` 消费同名 `preset.dark`；`--glow-*`/`--font-display` Task 2 定义，Task 3 消费。一致。
- **Review Focus** 5 条各挂对应测试：①dark-accent-floor（既有）+Task 1；②Task 1 on-primary 断言；③Task 3 warm grep；④Task 1 resolveAccent 迁移；⑤Task 3 主色填充文字。已覆盖。
- **比例**：计划 ~4 任务，长度与 spec 相当，无逐值转写（token 表在 spec §3，计划引用不重复全表）。
