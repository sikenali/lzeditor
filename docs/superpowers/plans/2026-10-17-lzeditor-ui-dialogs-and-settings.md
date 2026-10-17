# lzeditor UI Dialogs & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React UI atom library aligned with `DESIGN.md` and migrate every dialog and the settings center onto it, with the 4-tab settings surface (主题设置 / 模型管理 / 个性设置 / 关于).

**Architecture:** Add `src/components/ui/` atoms (UiModal, UiInput, UiSelect, UiSwitch, UiCheck, UiSelectCard, UiRadioGroup, UiTabs, UiTip, UiButton) consuming `--color-*`, plus `src/utils/icon.ts` (`resolveIcon`) rendered via `remixicon-react`. Migrate all dialogs to these atoms, then rewrite `SettingsDialog` into left top-nav + right sub-tabs + stacked section-cards, porting bid-maker's Theme/ApiKey/About views.

**Tech Stack:** React 18, TypeScript strict, Zustand, `remixicon-react`, plain `node:assert` source-assertion tests.

## Global Constraints

- Depends on Plan 1 (`2026-10-17-lzeditor-ui-foundation-and-shell.md`): `--color-*` tokens, `themes.ts`, parchment/dark theme, navtop, sidebar, statusbar, footer must already be landed.
- All new atoms consume `--color-*`; do not introduce legacy token names in new files.
- Icons: components from `remixicon-react` (`RiXxxLine`) or `resolveIcon('ri-xxx')`; never `<i class="ri-*">` in new code.
- Toast: reuse `src/utils/toast.ts` (`ElMessage`); never import element-plus (not installed).
- Settings top nav order: 主题设置 / 模型管理 / 个性设置 / 关于. Profile sub-tabs: 内容样式 / 编辑设置 / 应用行为 / 快捷键设置.
- Theme reset default: `parchment` + accent `vermilion` + `navMode='top'`.
- Nav-mode values: `'top'` (顶栏模式) / `'left'` (侧边栏模式). Layout switch sets `navMode` live (no reload).
- Verification: `node tests/*.test.mjs` and `npm run build`. Do not add a test framework.

---

### Task 7: UI atom library + icon helper

**Files:**
- Create: `src/utils/icon.ts`
- Create: `src/components/ui/UiModal.tsx`
- Create: `src/components/ui/UiInput.tsx`
- Create: `src/components/ui/UiSelect.tsx`
- Create: `src/components/ui/UiSwitch.tsx`
- Create: `src/components/ui/UiCheck.tsx`
- Create: `src/components/ui/UiSelectCard.tsx`
- Create: `src/components/ui/UiRadioGroup.tsx`
- Create: `src/components/ui/UiTabs.tsx`
- Create: `src/components/ui/UiTip.tsx`
- Create: `src/components/ui/UiButton.tsx`
- Create: `src/components/ui/index.ts`
- Create: `src/styles/ui.css` (import in `main.tsx`)
- Test: `tests/ui-atoms.test.mjs`

**Interfaces:**
- Produces:
  - `resolveIcon(name: string): React.ComponentType<{ size?: number }> | null`
  - `UiModal({ open, onClose, icon?, title?, subtitle?, width?, children, footer?, closeOnOverlay? })`
  - `UiInput({ value, onChange, type?, placeholder?, prefixIcon?, clearable?, size? })`
  - `UiSelect({ value, onChange, options: UiSelectOption[], placeholder?, size? })`; `UiSelectOption = { value: string; label: string; desc?: string; disabled?: boolean; group?: string }`
  - `UiSwitch({ checked, onChange, disabled?, size? })`
  - `UiCheck({ checked, size? })`
  - `UiSelectCard({ selected, title, desc?, iconText?, iconColor?, disabled?, onClick })`
  - `UiRadioGroup({ value, onChange, options: UiRadioOption[], direction? })`; `UiRadioOption = { value: string; label: string; desc?: string; disabled?: boolean }`
  - `UiTabs({ value, onChange, tabs: UiTabItem[] })`; `UiTabItem = { key: string; label: string; icon?: string }`
  - `UiTip({ text, placement?, children })`
  - `UiButton({ variant?: 'primary'|'outline'|'ghost', size?, disabled?, loading?, onClick, children })`

- [ ] **Step 1: Write the failing test** — `tests/ui-atoms.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const modal = read('src/components/ui/UiModal.tsx')
assert.match(modal, /createPortal\(.*document\.body/, 'UiModal must teleport to body')
assert.match(modal, /border-radius|borderRadius/, 'UiModal must set radius')
const index = read('src/components/ui/index.ts')
for (const n of ['UiModal','UiInput','UiSelect','UiSwitch','UiCheck','UiSelectCard','UiRadioGroup','UiTabs','UiTip','UiButton']) {
  assert.match(index, new RegExp(n), `index must export ${n}`)
}
const icon = read('src/utils/icon.ts')
assert.match(icon, /ri-/, 'resolveIcon must accept ri- names')
console.log('ui atoms checks passed')
```

- [ ] **Step 2: Run to verify it fails** — `node tests/ui-atoms.test.mjs` → FAIL (files missing).

- [ ] **Step 3: Create `src/utils/icon.ts`**

```ts
import React from 'react'
import * as Ri from 'remixicon-react'

const cache = new Map<string, React.ComponentType<any> | null>()

/** 'ri-add-line' → component 'RiAddLine' from remixicon-react, or null. */
export function resolveIcon(name: string | undefined): React.ComponentType<any> | null {
  if (!name) return null
  if (cache.has(name)) return cache.get(name)!
  if (!name.startsWith('ri-')) { cache.set(name, null); return null }
  const key = 'Ri' + name.slice(3).split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  const comp = (Ri as Record<string, any>)[key] ?? null
  cache.set(name, comp)
  return comp
}
```

- [ ] **Step 4: Create the atoms.** Implement each per `DESIGN.md` §6. Key one — `UiModal`:

```tsx
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { resolveIcon } from '../../utils/icon'

export interface UiModalProps {
  open: boolean
  onClose: () => void
  icon?: string
  title?: string
  subtitle?: string
  width?: number | string
  closeOnOverlay?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
}

export const UiModal: React.FC<UiModalProps> = ({ open, onClose, icon, title, subtitle, width = 600, closeOnOverlay = true, children, footer }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  const Icon = resolveIcon(icon)
  return createPortal(
    <div className="ui-modal-overlay" onClick={() => closeOnOverlay && onClose()}>
      <div className="ui-modal" style={{ width }} onClick={e => e.stopPropagation()}>
        {(title || icon) && (
          <div className="ui-modal-header">
            {Icon && <span className="ui-modal-icon"><Icon size={20} /></span>}
            <div className="ui-modal-titles">
              {title && <div className="ui-modal-title">{title}</div>}
              {subtitle && <div className="ui-modal-subtitle">{subtitle}</div>}
            </div>
            <button className="ui-modal-close" onClick={onClose} aria-label="关闭"><Ri close inline /></button>
          </div>
        )}
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
```

(Replace the close button with `<RiCloseLine size={18} />` imported from `remixicon-react`.) Implement `UiInput`, `UiSelect`, `UiSwitch`, `UiCheck`, `UiSelectCard`, `UiRadioGroup`, `UiTabs`, `UiTip`, `UiButton` as controlled function components with the props in **Interfaces**, all with class names `ui-input` / `ui-select` / `ui-switch` / `ui-check` / `ui-select-card` / `ui-radio-group` / `ui-tabs` / `ui-tip` / `ui-btn`. `UiSelectCard` shows a `✓` (RiCheckLine) when `selected`.

- [ ] **Step 5: Create `src/styles/ui.css`** implementing `DESIGN.md` §6 values: overlay `rgba(0,0,0,0.4)`, modal radius 18 / `--shadow-xl` / max-height `calc(100vh - 40px)`; input height 42 / 0.7px border / bg `--color-bg-secondary` → focus bg `--color-bg-white` + `--color-primary` border / radius 10; switch primary when on; select-card active border `--color-primary` + `--color-primary-soft` bg. Add `import './styles/ui.css'` after `tokens.css` in `main.tsx`.

- [ ] **Step 6: Create `src/components/ui/index.ts`** re-exporting all atoms and their option types.

- [ ] **Step 7: Run test + typecheck** — `node tests/ui-atoms.test.mjs` → PASS; `npx tsc --noEmit` clean.

- [ ] **Step 8: Commit**

```bash
git add src/utils/icon.ts src/components/ui src/styles/ui.css src/main.tsx tests/ui-atoms.test.mjs
git commit -m "feat(ui): React atom library aligned with DESIGN.md"
```

---

### Task 8: Migrate insert dialogs to the atom library

**Files:**
- Modify: `src/components/panels/{ImageDialog,LinkDialog,CodeDialog,FormulaDialog,TableDropdown,EmojiDialog,ChartDialog,BeautifyDialog}.tsx`
- Test: `tests/ui-atoms.test.mjs` (extend)

**Migration recipe (apply to each file):**
1. Replace the existing `UnifiedDialog`/`PanelContainer`/`UDSettingRow` imports with `import { UiModal, UiInput, UiSelect, UiButton } from '../ui'` (add atoms as needed).
2. Keep the component's existing props/handlers and business logic unchanged; only swap the wrapper. Map:
   - `<UnifiedDialog ... onClose={onClose} icon title subtitle onSubmit submitText>` → `<UiModal open onClose={onClose} icon={icon} title={title} subtitle={subtitle} footer={<><UiButton variant="ghost" onClick={onClose}>取消</UiButton>{submitText && <UiButton onClick={onSubmit}>{submitText}</UiButton>}</>}>`.
   - `<PanelContainer ...>` → `<UiModal open ...>` with the same children; pass the former `footer` prop as UiModal's `footer`.
3. Replace raw `<input className="lfs-input">`/`LFInput`/`SelectBox` with `UiInput`/`UiSelect`.
4. Replace `<Switch>` (HeroUI) with `UiSwitch`; `<Checkbox>` with `UiCheck`.
5. Delete now-unused imports so `tsc` stays clean.

- [ ] **Step 1: Extend the test** — append:

```js
const dialogs = ['ImageDialog','LinkDialog','CodeDialog','FormulaDialog','TableDropdown','EmojiDialog','ChartDialog','BeautifyDialog']
for (const d of dialogs) {
  const src = read(`src/components/panels/${d}.tsx`)
  assert.doesNotMatch(src, /UnifiedDialog|PanelContainer|@heroui\/react/, `${d} must not use legacy dialog/HeroUI`)
  assert.match(src, /from '\.\.\/ui'/, `${d} must import from the ui barrel`)
}
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Apply the recipe** to all 8 files.

- [ ] **Step 4: Run test + typecheck** — PASS; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels tests/ui-atoms.test.mjs
git commit -m "refactor(dialogs): migrate insert dialogs to ui atoms"
```

---

### Task 9: Migrate panel dialogs to the atom library

**Files:**
- Modify: `src/components/panels/{ExportDialog,HistoryPanel,LibraryPanel,FilePanel,PreviewPanel,OpenKnowledgePanel,SearchPanel,ReadMode}.tsx`
- Modify: `src/components/ai/{LanguageSelector,AIPanel}.tsx`, `src/components/editor/{FloatingToolbar,SlashCommand}.tsx` (only where they use legacy dialog shells / HeroUI)
- Test: `tests/ui-atoms.test.mjs` (extend)

**Migration recipe:** same as Task 8. Additionally, for panels that were side drawers (LibraryPanel, PreviewPanel) keep their layout/parent sizing but move chrome to `--color-*` classes; do not change store wiring.

- [ ] **Step 1: Extend the test** — append the same loop for `['ExportDialog','HistoryPanel','LibraryPanel','FilePanel','PreviewPanel','OpenKnowledgePanel','SearchPanel','ReadMode']`.

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Apply the recipe** to the listed files.

- [ ] **Step 4: Run test + typecheck** — PASS; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels src/components/ai src/components/editor tests/ui-atoms.test.mjs
git commit -m "refactor(dialogs): migrate panel dialogs to ui atoms"
```

---

### Task 10: Settings shell + 主题设置 tab

**Files:**
- Rewrite: `src/components/panels/SettingsDialog.tsx`
- Create: `src/components/panels/settings/ThemeSettingsTab.tsx`
- Create: `src/components/panels/settings/SectionCard.tsx`
- Create: `src/styles/settings-dialog.css` (replace contents)
- Test: `tests/settings-structure.test.mjs`

**Interfaces:**
- Consumes: `UiModal`, `UiSelectCard`, `UiCheck`, `UiButton`; `ACCENT_PRESETS` + `themeTokens` from `src/styles/themes.ts`; `useSettingsStore` (`theme`, `accentColor`, `navMode`, `updateSetting`); `applyTheme` from `src/hooks/useTheme.ts`.
- Produces: `NAV_GROUPS` config `{ id: 'theme'|'model'|'profile'|'about'; label; icon; subs: {id;label;icon}[] }`; `<SettingsDialog onClose />`.

- [ ] **Step 1: Write the failing test** — `tests/settings-structure.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const s = read('src/components/panels/SettingsDialog.tsx')
for (const label of ['主题设置','模型管理','个性设置','关于']) assert.match(s, new RegExp(label), `missing top nav ${label}`)
for (const label of ['内容样式','编辑设置','应用行为','快捷键设置']) assert.match(s, new RegExp(label), `missing profile sub-tab ${label}`)
assert.doesNotMatch(s, /同步备份/, 'sync backup must be removed')
console.log('settings structure checks passed')
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement the shell.** `SettingsDialog` renders `<UiModal open onClose icon="ri-settings-3-line" title="设置中心" width="1320px">` with a two-column body: left `NAV_GROUPS` list (240px, active = `--color-primary-soft` bg + `--color-primary` text) and right area = `UiTabs` sub-tab strip (when the group has `subs`) + stacked content. Define:

```ts
const NAV_GROUPS = [
  { id: 'theme',   label: '主题设置', icon: 'ri-palette-line',     subs: [] },
  { id: 'model',   label: '模型管理', icon: 'ri-cpu-line',         subs: [] },
  { id: 'profile', label: '个性设置', icon: 'ri-user-settings-line', subs: [
    { id: 'content',  label: '内容样式',  icon: 'ri-font-size' },
    { id: 'editor',   label: '编辑设置',  icon: 'ri-edit-2-line' },
    { id: 'behavior', label: '应用行为',  icon: 'ri-apps-line' },
    { id: 'shortcut', label: '快捷键设置', icon: 'ri-keyboard-fill' },
  ]},
  { id: 'about',   label: '关于',     icon: 'ri-information-line', subs: [] },
] as const
```

- [ ] **Step 4: Implement `SectionCard.tsx`** (`{ title, desc?, children }` → `.section-card` white card, radius `--radius-lg`, 0.7px border) and `ThemeSettingsTab.tsx` (port bid-maker ThemeSettingsView):
  - 外观主题: two `UiSelectCard`s for parchment/dark using preview swatches; onClick `applyTheme(type, accentColor); updateSetting('theme', type)`.
  - 强调色: 5 circles from `ACCENT_PRESETS`; onClick `updateSetting('accentColor', id)` + `applyTheme(theme, id)`.
  - 布局切换: two `UiSelectCard`s 顶栏模式/侧边栏模式 setting `updateSetting('navMode', id)` live.
  - 恢复默认 button: `updateSetting('theme','parchment')`, `updateSetting('accentColor','vermilion')`, `updateSetting('navMode','top')` then `applyTheme('parchment','vermilion')` + `ElMessage.success('已恢复默认')`.

- [ ] **Step 5: Replace `src/styles/settings-dialog.css`** with styles for the 1320px panel, 240px nav, sub-tab strip, and `.section-card`, all using `--color-*`.

- [ ] **Step 6: Run test + typecheck** — PASS; `npx tsc --noEmit` clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/panels/SettingsDialog.tsx src/components/panels/settings src/styles/settings-dialog.css tests/settings-structure.test.mjs
git commit -m "feat(settings): 4-group shell + theme tab (port bid-maker ThemeSettingsView)"
```

---

### Task 11: 模型管理 tab

**Files:**
- Create: `src/components/panels/settings/ModelSettingsTab.tsx`
- Test: `tests/settings-structure.test.mjs` (extend)

**Interfaces:**
- Consumes: `UiSelect`, `UiInput`, `UiSwitch`, `UiModal`, `UiSelectCard`, `UiButton`; `useSettingsStore` (`apiKeys`, `addApiKey`, `removeApiKey`, `toggleApiKey`, `updateSetting`); `ElMessage` from `src/utils/toast`.
- Produces: `PROVIDER_MODELS: Record<string,string[]>`, `PROVIDER_OPTIONS` (grouped 国内/国外), `FORMAT_OPTIONS`.

- [ ] **Step 1: Extend the test** — append:

```js
const model = read('src/components/panels/settings/ModelSettingsTab.tsx')
assert.match(model, /模型制造商/, 'provider mode label')
assert.match(model, /自定义配置/, 'custom mode label')
assert.match(model, /apiKeys/, 'must use apiKeys store')
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement**, porting bid-maker `ApiKeySettingsView`:
  - `PROVIDER_MODELS` using bid-maker's map (阿里云/百度/智谱/DeepSeek/Moonshot/零一万物/OpenAI/Anthropic/Google/Mistral/Groq).
  - `UiSelectCard` toggles 模型制造商 / 自定义配置.
  - Provider mode: `UiSelect` 服务商 + `UiSelect` 模型; Custom mode: `UiSelect` API格式 + `UiInput` 自定义地址 + `UiInput` 模型ID; plus shared API Key `UiInput` with eye toggle.
  - Add button → `addApiKey({ id, provider, model, modelName, key, enabled: true, endpoint?, format })`.
  - Saved list: each row shows provider/model + masked key; test button (fetch `${endpoint||openai}/models` with auth header, set success/failed icons), edit (`startEdit`), delete via `UiModal` confirm → `removeApiKey`, `UiSwitch` enabled → `toggleApiKey`.

- [ ] **Step 4: Run test + typecheck** — PASS; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/settings/ModelSettingsTab.tsx tests/settings-structure.test.mjs
git commit -m "feat(settings): model management tab (port bid-maker ApiKeySettingsView)"
```

---

### Task 12: 个性设置 sub-tabs (4)

**Files:**
- Create: `src/components/panels/settings/ContentStyleTab.tsx`
- Create: `src/components/panels/settings/EditorSettingsTab.tsx`
- Create: `src/components/panels/settings/BehaviorSettingsTab.tsx`
- Create: `src/components/panels/settings/ShortcutSettingsTab.tsx`
- Modify: `src/components/panels/SettingsDialog.tsx` (wire profile group → these tabs)
- Test: `tests/settings-structure.test.mjs` (extend)

**Interfaces:**
- Consumes: `SectionCard`, `UiSwitch`, `UiSelect`, `UiButton`, atoms; `TYPOGRAPHY_THEMES` + `applyTypographyTheme`; the field lists currently in `SettingsDialog.tsx` (`FONT_OPTIONS`, `FONT_SIZE_OPTIONS`, `LINE_HEIGHT_OPTIONS`, `CONTENT_WIDTH_OPTIONS`, `SPELL_CHECK_LANGS`).
- Produces: four tab components.

- [ ] **Step 1: Extend the test** — append:

```js
for (const [f, marker] of [
  ['ContentStyleTab.tsx','内容样式'],
  ['EditorSettingsTab.tsx','排版'],
  ['BehaviorSettingsTab.tsx','启动行为'],
  ['ShortcutSettingsTab.tsx','文档操作'],
]) {
  assert.match(read(`src/components/panels/settings/${f}`), new RegExp(marker), `${f} marker ${marker}`)
}
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement**
  - `ContentStyleTab`: move the typography-theme picker (currently `renderThemeContent('typography')`) here, rendered inside a `SectionCard` titled 内容样式 using `UiSelectCard`s (or the existing theme-card grid restyled to `--color-*`). Keep `applyTypographyTheme`.
  - `EditorSettingsTab`: one scrollable column of `SectionCard`s merging 排版 (font/size/line-height/content-width via `UiSelect` + segmented buttons), 段落排版 (`UiSwitch`), 工具栏 (`UiSwitch`), 本地化 (spell check + `UiSwitch` list), 编辑模式 (`UiSwitch` list incl. 预览模式 which also calls `useEditorStore.setShowPreview`).
  - `BehaviorSettingsTab`: `SectionCard` 启动行为 with the six `UiSwitch` rows from the old `renderAppSettings`.
  - `ShortcutSettingsTab`: port `renderShortcutContent` sections (文档操作/编辑操作/常规操作/标题与段落/代码块/系统级) using `UiTabs` internally or a single scroll of `SectionCard`s with `<kbd>` rows.

- [ ] **Step 4: Wire profile group** in `SettingsDialog` so `subTab` selects the matching tab component.

- [ ] **Step 5: Run test + typecheck** — PASS; `npx tsc --noEmit` clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/settings src/components/panels/SettingsDialog.tsx tests/settings-structure.test.mjs
git commit -m "feat(settings): profile sub-tabs (content/editor/behavior/shortcut)"
```

---

### Task 13: 关于 tab, cleanup, final build

**Files:**
- Create: `src/components/panels/settings/AboutSettingsTab.tsx`
- Delete: `src/components/ui/UnifiedDialog.tsx`, `src/components/ui/PanelContainer.tsx`, `src/components/ui/LFInput.tsx`, `src/components/ui/LFSInput.internal.tsx`, `src/components/ui/SelectBox.tsx`, `src/components/ui/Checkbox.tsx`
- Modify: `src/components/panels/SettingsDialog.tsx` (remove old render functions; use About tab)
- Modify: `src/main.tsx` (remove `HeroUIProvider` if no `@heroui/react` imports remain — verify with grep first)
- Test: `tests/settings-structure.test.mjs` (extend)

**Interfaces:**
- Produces: `AboutSettingsTab` with brand `懒猫编辑器`, slogan, version, repo link, `© 2026 懒猫编辑器 Powered by LightOS`.

- [ ] **Step 1: Extend the test** — append:

```js
const about = read('src/components/panels/settings/AboutSettingsTab.tsx')
assert.match(about, /懒猫编辑器/, 'about must show brand')
assert.match(about, /LightOS/, 'about must credit LightOS')
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `AboutSettingsTab`** porting bid-maker `AboutSettingsView` layout (badge circle, name, slogan `AI Markdown 编辑器`, version, GitHub link, copyright). Text may be refined later.

- [ ] **Step 4: Cleanup** — delete the 6 deprecated UI files, remove their imports, remove dead render functions from `SettingsDialog.tsx`. Run `grep -rn "@heroui/react" src` — if empty, remove `HeroUIProvider` from `main.tsx`.

- [ ] **Step 5: Run full verification**

Run: `node tests/theme-boundary.test.mjs && node tests/insert-navigation-ui.test.mjs && node tests/insert-style-boundary.test.mjs && node tests/ui-atoms.test.mjs && node tests/settings-structure.test.mjs`
Expected: each prints its `… passed` line (fix `insert-style-boundary` / `insert-navigation-ui` assertions if they reference deleted files/classes).
Run: `npm run build`
Expected: `tsc` no errors, Vite build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(settings): about tab; remove legacy dialog shells and HeroUI dependency"
```

---

## Self-Review

- **Spec coverage:** §7 atoms → Task 7; §7 dialogs → Tasks 8–9; §8 settings (theme/model/profile/about) → Tasks 10–13; D9 layout switch → Task 10 (sets `navMode`); D3 profile 4 sub-tabs → Task 12; sync removal → Task 10 test + Task 13 cleanup.
- **Placeholder scan:** deps on Task 7 atom prop names are spelled out; dialog migration uses one explicit recipe applied per named file (not "similar to").
- **Type consistency:** `UiSelectOption`/`UiRadioOption`/`UiTabItem` defined in Task 7 and consumed in Tasks 10–12; `NAV_GROUPS` ids `theme|model|profile|about` consistent with settings tests; `applyTheme('parchment'|'dark', hex)` matches Plan 1.
