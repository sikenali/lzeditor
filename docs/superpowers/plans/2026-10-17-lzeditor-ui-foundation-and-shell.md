# lzeditor UI Foundation & Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace lzeditor's design-token/theme system with bid-maker's `--color-*` system and rebuild the top nav, layout switch, main content, collapsible status bar, and footer.

**Architecture:** Add a canonical `--color-*` token layer (`tokens.css` + `themes.ts`) applied imperatively by JS onto `document.documentElement`; keep legacy token names working through a compatibility alias block so ~400KB of existing content CSS needs no rewrite. Then restyle `Toolbar` (navtop), convert `LeftNav` to an icon-only rail with hover labels in sidebar mode, restructure `App` so the collapsible `StatusBar` sits directly above a new `Footer`.

**Tech Stack:** React 18, TypeScript (strict, `noEmit`), Vite 5, Zustand, plain `node:assert` source-assertion tests, remixicon font classes.

## Global Constraints

- Design tokens: bid-maker `--color-*` values verbatim from `/home/jingle/opc/DESIGN.md` §5 (Light/Dark) and AGENT.md §6.
- Theme model: `'parchment' | 'dark'` only. Accent presets: 朱红 `#BE3B2E` (default), 鎏金 `#D3A93F`, 玉绿 `#3E8C6E`, 云蓝 `#4A72A8`, 黛墨 `#2F3640`.
- localStorage keys: `lzeditor-theme` (theme), `lzeditor-accent` (accent hex), `lzeditor-layout` (existing: showOutline/showPreview/showLibrary + new `statusbarCollapsed`).
- No `[data-theme="..."]` CSS override blocks may remain in `src/styles/color-tokens.css`; only `:root` defaults + the alias block.
- Preserve every existing toolbar handler, submenu item, and `toolbar-menu-dot`; do not rename store actions.
- Footer copyright literal: `© 2026 懒猫编辑器 Powered by LightOS` with the `Powered by LightOS` text linking to `https://lazycat.cloud/`.
- Verification tooling: `node tests/theme-boundary.test.mjs` and `npm run build` (`tsc && vite build`). No vitest/jest exists; do not add one.
- Commit after every task with the exact message shown.

---

### Task 1: Canonical token layer + theme engine

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/themes.ts`
- Modify: `src/main.tsx` (import `./styles/tokens.css` before the others)
- Modify: `src/styles/color-tokens.css` (remove `[data-theme="..."]` blocks; keep `:root`)
- Modify: `src/hooks/useTheme.ts` (rewrite `applyTheme`)
- Test: `tests/theme-boundary.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `themeTokens: Record<'parchment'|'dark', Record<string,string>>` from `src/styles/themes.ts`; `applyTheme(theme: 'parchment'|'dark', accentHex: string | null): void` from `src/hooks/useTheme.ts`; CSS variables `--color-*`.

- [ ] **Step 1: Write the failing test** — replace `tests/theme-boundary.test.mjs` body with assertions for the new system:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const tokens = read('src/styles/tokens.css')
const themes = read('src/styles/themes.ts')
const colorTokens = read('src/styles/color-tokens.css')

for (const token of [
  '--color-primary', '--color-primary-soft', '--color-bg-main', '--color-bg-secondary',
  '--color-bg-card', '--color-bg-white', '--color-text-primary', '--color-text-muted',
  '--color-border', '--color-border-soft', '--color-border-hover', '--color-success',
  '--color-info', '--color-warning', '--color-error', '--radius-md', '--spacing-4',
  '--shadow-md', '--transition-base',
]) {
  assert.match(tokens, new RegExp(`${token}:`), `Missing token ${token}`)
}

// compatibility bridge present
for (const alias of ['--text-heading:', '--bg-code:', '--border-subtle:', '--font-sans:', '--accent-primary:']) {
  assert.match(tokens, new RegExp(alias), `Missing alias ${alias}`)
}

assert.match(themes, /parchment/, 'themes.ts must define parchment')
assert.match(themes, /dark/, 'themes.ts must define dark')
assert.doesNotMatch(colorTokens, /\[data-theme=/, 'color-tokens.css must not keep [data-theme] override blocks')

console.log('theme boundary checks passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/theme-boundary.test.mjs`
Expected: FAIL — `Missing token --color-primary` (tokens.css does not exist).

- [ ] **Step 3: Create `src/styles/tokens.css`** with the full bid-maker token set plus the alias bridge:

```css
:root {
  /* Colors — Parchment (light) */
  --color-primary: #C0392B;
  --color-primary-soft: #FBE9E7;
  --color-bg-main: #FAF7F2;
  --color-bg-secondary: #F7F3EA;
  --color-bg-card: #FCFBF8;
  --color-bg-white: #FFFFFF;
  --color-text-primary: #1F1D1A;
  --color-text-body: #3A3A3A;
  --color-text-secondary: #6E6A60;
  --color-text-muted: #8A8578;
  --color-text-faint: #A7A296;
  --color-border: #E5DFD3;
  --color-border-soft: #EDE9E0;
  --color-border-hover: #D9D2C2;
  --color-success: #4E9B7A;
  --color-success-strong: #3E8A6B;
  --color-success-soft: #E4F0EA;
  --color-info: #4A72A8;
  --color-info-soft: #E8F0F8;
  --color-warning: #F39C12;
  --color-warning-soft: #FEF5E7;
  --color-error: #E74C3C;
  --color-error-soft: #FADCDA;

  --font-family: 'Inter', 'SourceHanSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-cn: 'SourceHanSans', 'PingFang SC', 'Microsoft YaHei', sans-serif;

  --text-xs: 12px; --text-sm: 13px; --text-md: 14px; --text-lg: 15px;
  --text-xl: 16px; --text-2xl: 18px; --text-3xl: 20px; --text-4xl: 24px;
  --font-light: 300; --font-normal: 400; --font-medium: 500; --font-semibold: 600; --font-bold: 700;
  --leading-tight: 1.2; --leading-snug: 1.4; --leading-normal: 1.5; --leading-relaxed: 1.6;

  --spacing-0: 0; --spacing-1: 4px; --spacing-2: 8px; --spacing-3: 12px; --spacing-4: 16px;
  --spacing-5: 20px; --spacing-6: 24px; --spacing-8: 32px; --spacing-10: 40px;
  --spacing-12: 48px; --spacing-16: 64px;

  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 18px;
  --radius-2xl: 24px; --radius-full: 9999px;

  --btn-height-xs: 32px; --btn-height-sm: 36px; --btn-height-md: 44px; --btn-height-lg: 52px; --btn-height-xl: 58px;
  --input-height-sm: 36px; --input-height-md: 42px; --input-height-lg: 48px;
  --row-height-xs: 40px; --row-height-sm: 48px; --row-height-md: 56px; --row-height-lg: 64px;

  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.12);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.16);
  --shadow-xl: 0 12px 40px rgba(0,0,0,0.2);

  --transition-fast: 150ms ease; --transition-base: 200ms ease; --transition-slow: 300ms ease;

  --z-dropdown: 1000; --z-sticky: 1020; --z-fixed: 1030; --z-modal-backdrop: 1040;
  --z-modal: 1050; --z-popover: 1060; --z-tooltip: 1070;

  /* ── Compatibility bridge: legacy lzeditor token names → new --color-* ── */
  --text-heading: var(--color-text-primary);
  --text-heading-2: var(--color-text-secondary);
  --text-body: var(--color-text-body);
  --text-muted: var(--color-text-muted);
  --text-faint: var(--color-text-faint);
  --bg-primary: var(--color-bg-main);
  --bg-secondary: var(--color-bg-secondary);
  --bg-code: var(--color-bg-secondary);
  --background-card: var(--color-bg-card);
  --background-code: var(--color-bg-secondary);
  --foreground-heading: var(--color-text-primary);
  --foreground-heading-2: var(--color-text-secondary);
  --foreground-muted: var(--color-text-muted);
  --border-subtle: var(--color-border-soft);
  --font-sans: var(--font-family);
  --accent-primary: var(--color-primary);
  --accent: var(--color-primary);
}
```

- [ ] **Step 4: Create `src/styles/themes.ts`** with the exact bid-maker values:

```ts
export type ThemeType = 'parchment' | 'dark'

export const themeTokens: Record<ThemeType, Record<string, string>> = {
  parchment: {
    '--color-primary': '#C0392B',
    '--color-primary-soft': '#FBE9E7',
    '--color-bg-main': '#FAF7F2',
    '--color-bg-secondary': '#F7F3EA',
    '--color-bg-card': '#FCFBF8',
    '--color-bg-white': '#FFFFFF',
    '--color-text-primary': '#1F1D1A',
    '--color-text-body': '#3A3A3A',
    '--color-text-secondary': '#6E6A60',
    '--color-text-muted': '#8A8578',
    '--color-text-faint': '#A7A296',
    '--color-border': '#E5DFD3',
    '--color-border-soft': '#EDE9E0',
    '--color-border-hover': '#D9D2C2',
    '--color-success': '#4E9B7A',
    '--color-success-strong': '#3E8A6B',
    '--color-success-soft': '#E4F0EA',
    '--color-info': '#4A72A8',
    '--color-info-soft': '#E8F0F8',
    '--color-warning': '#F39C12',
    '--color-warning-soft': '#FEF5E7',
    '--color-error': '#E74C3C',
    '--color-error-soft': '#FADCDA',
  },
  dark: {
    '--color-primary': '#E05050',
    '--color-primary-soft': '#3A2323',
    '--color-bg-main': '#17171A',
    '--color-bg-secondary': '#1C1C1F',
    '--color-bg-card': '#232324',
    '--color-bg-white': '#232324',
    '--color-text-primary': '#F2F3F5',
    '--color-text-body': '#DDE0E6',
    '--color-text-secondary': '#C9CDD4',
    '--color-text-muted': '#A7AEB9',
    '--color-text-faint': '#86909C',
    '--color-border': '#2A2B2E',
    '--color-border-soft': '#2A2B2E',
    '--color-border-hover': '#3A3B3F',
    '--color-success': '#5CB98C',
    '--color-success-strong': '#7BC8A4',
    '--color-success-soft': '#1D3329',
    '--color-info': '#82AEDD',
    '--color-info-soft': '#1B2A3A',
    '--color-warning': '#F2B23E',
    '--color-warning-soft': '#38300F',
    '--color-error': '#E86A5A',
    '--color-error-soft': '#3A2326',
  },
}

export const ACCENT_PRESETS = [
  { id: 'vermilion', name: '朱红', color: '#BE3B2E' },
  { id: 'gold',      name: '鎏金', color: '#D3A93F' },
  { id: 'jade',      name: '玉绿', color: '#3E8C6E' },
  { id: 'cloud',     name: '云蓝', color: '#4A72A8' },
  { id: 'ink',       name: '黛墨', color: '#2F3640' },
]
```

- [ ] **Step 5: Remove `[data-theme]` blocks from `src/styles/color-tokens.css`**

Delete every block whose selector starts with `[data-theme=`. Keep the `:root` block and any `:root[data-accent=...]` blocks (those may stay). Use grep to find them: `grep -n '\[data-theme=' src/styles/color-tokens.css`.

- [ ] **Step 6: Rewrite `applyTheme` in `src/hooks/useTheme.ts`** — replace the body of `applyTheme` and the accent-hex map:

```ts
import { themeTokens, type ThemeType } from '../styles/themes'

/** Get accent color hex for a given preset id or raw hex. */
function resolveAccentHex(presetId: string): string {
  const presets: Record<string, string> = {
    vermilion: '#BE3B2E', gold: '#D3A93F', jade: '#3E8C6E', cloud: '#4A72A8', ink: '#2F3640',
    red: '#BE3B2E', teal: '#4A72A8', green: '#3E8C6E',
  }
  if (/^#?[0-9a-fA-F]{6}$/.test(presetId)) return presetId.startsWith('#') ? presetId : '#' + presetId
  return presets[presetId] ?? '#BE3B2E'
}

/** Apply bid-maker theme tokens imperatively. No [data-theme] CSS blocks exist. */
export function applyTheme(theme: 'parchment' | 'dark', accent: string): void {
  const root = document.documentElement
  const type: ThemeType = theme === 'dark' ? 'dark' : 'parchment'
  root.dataset.theme = type
  const tokens = themeTokens[type]
  for (const [key, value] of Object.entries(tokens)) root.style.setProperty(key, value)
  root.style.setProperty('--color-primary', resolveAccentHex(accent))
}
```

Keep the dynamic `--accent-a3..a60`/`--accent-soft`/`--accent-border`/`--accent-glow` derivations by sourcing the hex from `resolveAccentHex(accent)` instead of the old map.

- [ ] **Step 7: Add the import in `src/main.tsx`** — first style import becomes `import './styles/tokens.css'` (before `./styles/globals.css`).

- [ ] **Step 8: Run test + typecheck**

Run: `node tests/theme-boundary.test.mjs`
Expected: PASS — `theme boundary checks passed`.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/styles/tokens.css src/styles/themes.ts src/styles/color-tokens.css src/hooks/useTheme.ts src/main.tsx tests/theme-boundary.test.mjs
git commit -m "refactor(theme): adopt bid-maker --color-* token system with compat bridge"
```

---

### Task 2: Migrate settings store to the new theme model

**Files:**
- Modify: `src/store/settingsStore.ts`
- Modify: `src/store/aiStore.ts` (only if it references removed theme ids — check first)
- Test: `tests/theme-boundary.test.mjs` (extend)

**Interfaces:**
- Consumes: `ACCENT_PRESETS`, `ThemeType` from `src/styles/themes.ts` (Task 1).
- Produces: `SettingsState.theme: 'parchment'|'dark'`, `SettingsState.accentColor: string` (preset id), `DEFAULT_SETTINGS`.

- [ ] **Step 1: Extend the test** — append to `tests/theme-boundary.test.mjs` before the final log:

```js
const settingsStore = read('src/store/settingsStore.ts')
assert.match(settingsStore, /theme: 'parchment'/, 'default theme must be parchment')
assert.doesNotMatch(settingsStore, /ACCEPT_PRESETS|id: 'red'/, 'legacy accent ids must be gone')
assert.match(settingsStore, /vermilion/, 'new accent presets must be used')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/theme-boundary.test.mjs`
Expected: FAIL — `default theme must be parchment`.

- [ ] **Step 3: Update `src/store/settingsStore.ts`**

- Remove the local `ACCENT_PRESETS` definition; instead import `{ ACCENT_PRESETS } from '../styles/themes'` and re-export it: `export { ACCENT_PRESETS } from '../styles/themes'`.
- In `DEFAULT_SETTINGS`: change `theme: 'light'` → `theme: 'parchment'`; change `accentColor: 'ink'` → `accentColor: 'vermilion'`.
- Update the type of `theme` in `shared/types.ts` (`SettingsState`) to `'parchment' | 'dark'`; update `getAccentColor` to look up `ACCENT_PRESETS` (now 5 entries) and fall back to `'#BE3B2E'`.
- Change `saveSettingsToStorage` to also write `localStorage.setItem('lzeditor-theme', settings.theme)` and `localStorage.setItem('lzeditor-accent', getAccentColor(settings.accentColor))`; `loadSettingsFromStorage` reads those keys first and overrides.

- [ ] **Step 4: Run test + typecheck**

Run: `node tests/theme-boundary.test.mjs` → PASS
Run: `npx tsc --noEmit` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.ts src/shared/types.ts src/styles/themes.ts
git commit -m "refactor(settings): parchment/dark theme model with 5 bid-maker accents"
```

---

### Task 3: navtop restyle (Toolbar)

**Files:**
- Modify: `src/components/layout/Toolbar.tsx`
- Modify: `src/styles/layout.css` (`.toolbar` block)
- Test: `tests/theme-boundary.test.mjs`

**Interfaces:**
- Consumes: `--color-*` tokens (Task 1).
- Produces: unchanged component API `<Toolbar />`; new class `navtop` alongside `toolbar`.

- [ ] **Step 1: Extend the test** — append:

```js
const layout1 = read('src/styles/layout.css')
assert.match(layout1, /\.navtop\s*\{[\s\S]*height:\s*72px/, 'navtop must be 72px tall')
assert.match(read('src/components/layout/Toolbar.tsx'), /navtop/, 'Toolbar must render navtop class')
```

- [ ] **Step 2: Run to verify it fails** — `node tests/theme-boundary.test.mjs` → FAIL `navtop must be 72px tall`.

- [ ] **Step 3: Restyle** — In `Toolbar.tsx`, change the root `<div className={\`toolbar...\`}>` to `` `navtop toolbar${!showToolbarLabels ? ' toolbar-icon-only' : ''}` ``. Do **not** remove the `toolbar` class (existing layout.css selectors depend on it). In `src/styles/layout.css`, add a `.navtop` rule overriding `.toolbar` chrome:

```css
.navtop {
  height: 72px;
  padding: 0 24px;
  background: var(--color-bg-white);
  border-bottom: 0.7px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 16px;
}
.navtop .toolbar-group {
  gap: 6px;
}
.navtop .toolbar-group--middle {
  margin: 0 auto;
}
```

Remove any brand/logo markup if present in the left group's start (none currently — verify with grep for `logo` in Toolbar.tsx; there is none).

- [ ] **Step 4: Run test + build** — `node tests/theme-boundary.test.mjs` → PASS; `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Toolbar.tsx src/styles/layout.css tests/theme-boundary.test.mjs
git commit -m "style(navtop): restyle toolbar to DESIGN.md TopNav spec"
```

---

### Task 4: Sidebar-mode icon rail with hover labels

**Files:**
- Modify: `src/components/layout/LeftNav.tsx`
- Modify: `src/styles/layout.css` (`.left-nav*` blocks)

**Interfaces:**
- Consumes: existing store actions (`setShowOutline`, `setShowPreview`, `setAppMode`, …).
- Produces: unchanged `<LeftNav />` API.

- [ ] **Step 1: Extend the test** — append:

```js
const leftNav = read('src/components/layout/LeftNav.tsx')
assert.match(leftNav, /left-nav-hover-label/, 'LeftNav must render hover label element')
assert.match(layout1, /\.left-nav-hover-label\s*\{[\s\S]*box-shadow:\s*var\(--shadow-md\)/, 'hover label must use shadow-md')
assert.match(layout1, /\.left-nav-sep\s*\{[\s\S]*margin/, 'nav groups must have visual spacing')
```

- [ ] **Step 2: Run to verify it fails** — `node tests/theme-boundary.test.mjs` → FAIL.

- [ ] **Step 3: Implement** — In `LeftNav.tsx`, each non-divider button renders an icon plus a hover label `<span className="left-nav-hover-label">{item.label}</span>` (drop the always-visible `.left-nav-label`). Keep `title={item.label}` for a11y. In `layout.css`, make `.left-nav` icon-only and style the hover label as a floating popover:

```css
.left-nav { width: 56px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0; }
.left-nav-btn { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); }
.left-nav-hover-label {
  position: absolute; left: calc(100% + 8px); top: 50%; transform: translateY(-50%) translateX(-4px);
  background: var(--color-bg-white); color: var(--color-text-body); font-size: var(--text-sm);
  padding: 6px 10px; border-radius: var(--radius-md); border: 0.7px solid var(--color-border);
  box-shadow: var(--shadow-md); white-space: nowrap; opacity: 0; pointer-events: none;
  transition: opacity var(--transition-fast), transform var(--transition-fast); z-index: var(--z-popover);
}
.left-nav-btn:hover .left-nav-hover-label { opacity: 1; transform: translateY(-50%) translateX(0); }
.left-nav-sep { width: 24px; height: 1px; background: var(--color-border-soft); margin: 8px 0; }
```

- [ ] **Step 4: Run test + build** — PASS + `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/LeftNav.tsx src/styles/layout.css tests/theme-boundary.test.mjs
git commit -m "style(sidebar): icon-only rail with floating hover labels and group spacing"
```

---

### Task 5: Collapsible StatusBar adjacent to footer

**Files:**
- Modify: `src/components/layout/StatusBar.tsx`
- Modify: `src/store/editorStore.ts` (persist `statusbarCollapsed` in `lzeditor-layout`)
- Modify: `src/styles/layout.css` (`.statusbar*`)

**Interfaces:**
- Consumes: `useEditorStore` (`wordCount`, `charCount`, `cursorPosition`, `syncStatus`, `lastEditTime`, `activeDocId`), `useSettingsStore`.
- Produces: `<StatusBar className? />`; store fields `statusbarCollapsed: boolean`, `setStatusbarCollapsed(b: boolean)`; helper `hasOpenDoc` = `activeDocId != null`.

- [ ] **Step 1: Extend the test** — append:

```js
const statusBar = read('src/components/layout/StatusBar.tsx')
assert.match(statusBar, /statusbar-collapse/, 'StatusBar must render a collapse control')
assert.doesNotMatch(statusBar, /statusbar-center/, 'center outline/preview/style pills must move to footer')
const editorStore = read('src/store/editorStore.ts')
assert.match(editorStore, /statusbarCollapsed/, 'store must persist statusbarCollapsed')
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement**
- `editorStore.ts`: add `statusbarCollapsed: boolean` to state + `setStatusbarCollapsed` that writes `{ ...loadLayoutState(), statusbarCollapsed }`; extend `loadLayoutState()` to return it (default `false`).
- `StatusBar.tsx`: remove the `statusbar-center` block entirely; keep left (sync + time) and right (`statusbar-right` items). Add at the far right:

```tsx
<button className="statusbar-collapse" data-title={collapsed ? '展开状态栏' : '收起状态栏'}
  onClick={() => setStatusbarCollapsed(!collapsed)}>
  <span className={`remix ${collapsed ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></span>
</button>
```

- Collapsed renders only a thin 24px bar containing the collapse button. When `activeDocId == null` the component returns `null`.
- `layout.css`: remove any bottom margin so the statusbar's top border governs the seam; footer must have `border-top: none` when adjacent (handled in Task 6).

- [ ] **Step 4: Run test + build** — PASS + `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/StatusBar.tsx src/store/editorStore.ts src/styles/layout.css tests/theme-boundary.test.mjs
git commit -m "refactor(statusbar): collapsible, doc-aware, footer-adjacent"
```

---

### Task 6: Footer component + App shell wiring

**Files:**
- Create: `src/components/layout/Footer.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/layout.css` (`.app-footer*`)

**Interfaces:**
- Consumes: `useEditorStore` (`showOutline`, `showPreview`, `appMode`, setters), `useSettingsStore.updateSetting`, `<StatusBar />`.
- Produces: `<Footer />`.

- [ ] **Step 1: Extend the test** — append:

```js
const footer = read('src/components/layout/Footer.tsx')
assert.match(footer, /懒猫编辑器/, 'footer must show brand name')
assert.match(footer, /https:\/\/lazycat\.cloud\//, 'footer must link to lazycat.cloud')
assert.match(footer, /Powered by LightOS/, 'footer must credit LightOS')
const app = read('src/App.tsx')
assert.match(app, /<Footer/, 'App must render Footer')
assert.match(app, /<StatusBar/, 'App must render StatusBar')
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Create `Footer.tsx`**

```tsx
import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'

export const Footer: React.FC = () => {
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const appMode = useEditorStore(s => s.appMode)
  const setShowOutline = useEditorStore(s => s.setShowOutline)
  const setShowPreview = useEditorStore(s => s.setShowPreview)
  const setAppMode = useEditorStore(s => s.setAppMode)
  const updateSetting = useSettingsStore(s => s.updateSetting)

  return (
    <footer className="app-footer">
      <div className="app-footer-left">
        <img className="app-footer-logo" src="/logo.svg" alt="懒猫编辑器" />
        <span className="app-footer-brand">懒猫编辑器</span>
      </div>
      <div className="app-footer-center">
        <button className="app-footer-btn" data-title="大纲" onClick={() => setShowOutline(!showOutline)}>
          <span className="remix ri-list-unordered"></span>
        </button>
        <button className="app-footer-btn" data-title="即时预览"
          onClick={() => { const n = !showPreview; setShowPreview(n); updateSetting('previewModeEnabled', n) }}>
          <span className="remix ri-eye-line"></span>
        </button>
        <button className="app-footer-btn" data-title="样式预览"
          onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')}>
          <span className="remix ri-palette-fill"></span>
        </button>
      </div>
      <div className="app-footer-right">
        <span>© 2026 懒猫编辑器 Powered by </span>
        <a href="https://lazycat.cloud/" target="_blank" rel="noopener noreferrer" className="app-footer-link">LightOS</a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Wire `App.tsx`** — in `topLayout`, replace the trailing `<StatusBar />` with:

```tsx
<StatusBar />
<Footer />
```

and ensure the wrapper is a flex column so StatusBar sits directly above Footer with no gap.

- [ ] **Step 5: Add footer CSS** to `layout.css`:

```css
.app-footer {
  height: 58px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(to bottom, var(--color-bg-white), var(--color-bg-secondary));
  border-top: 1px solid var(--color-border-soft); flex-shrink: 0;
}
.app-footer-left { display: flex; align-items: center; gap: 8px; color: var(--color-text-body); font-size: var(--text-md); font-weight: 500; }
.app-footer-logo { width: 20px; height: 20px; }
.app-footer-center { display: flex; align-items: center; gap: 8px; }
.app-footer-btn {
  width: 28px; height: 28px; border-radius: var(--radius-full); border: none; cursor: pointer;
  background: transparent; color: var(--color-text-secondary); display: flex; align-items: center; justify-content: center;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}
.app-footer-btn:hover { background: var(--color-primary); color: #fff; transform: translateY(-2px); }
.app-footer-right { font-size: var(--text-md); color: var(--color-text-muted); }
.app-footer-link { color: var(--color-primary); text-decoration: none; }
.app-footer-link:hover { text-decoration: underline; }
```

- [ ] **Step 6: Run test + build** — PASS + `npx tsc --noEmit` clean + `npm run build` succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/Footer.tsx src/App.tsx src/styles/layout.css tests/theme-boundary.test.mjs
git commit -m "feat(footer): brand + outline/preview/style + LightOS credit; wire App shell"
```

---

## Self-Review

- **Spec coverage:** §2 tokens/theme → Task 1–2; §3 navtop → Task 3; §4 layout switch/sidebar → Task 4 (switch wiring itself lands in Plan 2's 主题设置 task, which sets `navMode`); §5 main/statusbar → Task 5; §6 footer → Task 6. §7–8 are Plan 2.
- **Placeholder scan:** none.
- **Type consistency:** `applyTheme('parchment'|'dark', hex)` (Task 1) matches callers in `main.tsx` and `useTheme`; `ACCENT_PRESETS` exported from `themes.ts` (Task 1) re-exported by `settingsStore` (Task 2); `setStatusbarCollapsed` defined and used in Task 5; `<Footer/>` produced in Task 6.
