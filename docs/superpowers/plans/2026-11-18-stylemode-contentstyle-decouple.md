# 排版模式作内容样式唯一入口（删设置「内容样式」选项卡）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让排版模式（`StyleMainPanel`）成为 13 个排版样式的唯一入口——直接读移植自 xedit 的 `TYPOGRAPHY_THEMES`，并删除设置里的「内容样式」选项卡（`ContentStyleTab`），消除设置与排版模式对全局 `typographyTheme` 的双向耦合。

**Architecture:** 排版模式已直接 import `TYPOGRAPHY_THEMES` 并读写全局 `typographyTheme`（`updateSetting('typographyTheme', …)`）；它是解耦后的唯一读写方。改动只删设置侧的冗余入口：`SettingsDialog` 移除 `content` 子标签（NAV_GROUPS 入口 + 渲染分支 + import），删除 `ContentStyleTab.tsx` 及其专属死 CSS。阅读/预览/导出不变（继续经 `useTheme` 全局应用 `typographyTheme`）。

**Tech Stack:** React + Zustand + CSS（source-assertion conformance 测试）。

**Spec:** `docs/superpowers/specs/2026-11-18-stylemode-contentstyle-decouple-design.md`

## Global Constraints

- `SettingsDialog` 不再引用 `ContentStyleTab`，不再有 `label: '内容样式'` 的 NAV_GROUPS 入口。
- `ContentStyleTab.tsx` 文件删除（`existsSync` 为 false）。
- `settings-dialog.css` 删 ContentStyleTab 专属死样式（`.theme-grid/.theme-card/.theme-preview/.theme-name/.theme-tag/.typography-preview`），**保留** SettingsDialog 用的 `.theme-preview-card/.theme-preview-thumb/.theme-thumb-topbar/.theme-thumb-content/.theme-preview-info/.theme-preview-name/.theme-preview-desc/.theme-card-check`。
- `StyleMainPanel.tsx` 必须**继续** `updateSetting('typographyTheme', …)`（排版模式是全局唯一入口）。
- 不动 `typography-themes.ts`（13 样式视觉）、`useTheme.ts`、`SidebarPreview.tsx`、`ExportDialog.tsx`。

## Review Focus

1. **排版模式仍驱动全局**：删设置标签后，排版模式仍是 `typographyTheme` 唯一读写方；测试断言 `updateSetting('typographyTheme'` 仍在。
2. **无残留引用**：删除 `ContentStyleTab` 后，全仓不得再 import 它（tsc 会抓），且 `settings-dialog.css` 不残留 ContentStyleTab 专属类。
3. **阅读/预览/导出不受影响**：`useTheme`/`SidebarPreview`/`ExportDialog` 不动，继续用全局 `typographyTheme`。
4. **设置窗口无空态**：移除 `content` 后 profile 子标签仍非空（editor/app/shortcut 三个），渲染三元不塌。

---

### Task 1: 删除设置「内容样式」选项卡，排版模式作唯一入口

**Files:**
- Modify: `src/components/panels/SettingsDialog.tsx`（去 import/NAV_GROUPS 入口/渲染分支）
- Delete: `src/components/panels/settings/ContentStyleTab.tsx`
- Modify: `src/styles/settings-dialog.css`（删 ContentStyleTab 专属死样式）
- Modify: `tests/settings-structure.test.mjs`（去掉「内容样式」断言）
- Test: `tests/stylemode-contentstyle-decouple.test.mjs`（新建）

**Interfaces:**
- Consumes: 无。
- Produces: 无（纯 UI 删除；排版模式继续用现有全局 `typographyTheme`）。

- [ ] **Step 1: 写失败测试 `tests/stylemode-contentstyle-decouple.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const settings = read('src/components/panels/SettingsDialog.tsx')
const stylePanel = read('src/components/panels/StyleMainPanel.tsx')
const css = read('src/styles/settings-dialog.css')
const csPath = fileURLToPath(new URL('../src/components/panels/settings/ContentStyleTab.tsx', import.meta.url))

// 1. 设置窗口不再有「内容样式」选项卡
assert.doesNotMatch(settings, /ContentStyleTab/, 'SettingsDialog 不得再引用 ContentStyleTab')
assert.doesNotMatch(settings, /label: '内容样式'/, 'SettingsDialog 不得再有「内容样式」入口')
// 2. ContentStyleTab 文件已删除
assert.equal(existsSync(csPath), false, 'ContentStyleTab.tsx 必须删除')
// 3. 排版模式仍是全局 typographyTheme 唯一入口（仍写回）
assert.match(stylePanel, /updateSetting\('typographyTheme'/, '排版模式必须继续写回全局 typographyTheme（唯一入口）')
// 4. ContentStyleTab 专属死样式已清理
assert.doesNotMatch(css, /\.theme-grid\s*\{/, '.theme-grid 死样式必须删除')
assert.doesNotMatch(css, /\.theme-name\s*\{/, '.theme-name 死样式必须删除')
assert.doesNotMatch(css, /\.theme-tag\s*\{/, '.theme-tag 死样式必须删除')

console.log('stylemode contentstyle decouple checks passed')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/stylemode-contentstyle-decouple.test.mjs`
Expected: FAIL（SettingsDialog 仍引 ContentStyleTab / 仍含内容样式入口；文件仍存在；死样式仍在）

- [ ] **Step 3: 实现**

1. `SettingsDialog.tsx`：
   - 删 `import { ContentStyleTab } from './settings/ContentStyleTab'`。
   - 删 profile `subs` 里 `{ id: 'content', label: '内容样式', icon: 'ri-font-size' }`。
   - 渲染分支把 `subTab === 'content' ? <ContentStyleTab .../> :` 从三元里删掉，`subTab === 'editor'` 升为第一个分支（`{group.id === 'profile' && (subTab === 'editor' ? <EditorSettingsTab .../> : subTab === 'app' ? <BehaviorSettingsTab .../> : <ShortcutSettingsTab />)}`）。
   - 若 `subTab` 可能残留 'content'（从 store 恢复），在 profile 分支里将其归一为 'editor'，避免塌到 `<ShortcutSettingsTab/>`（实现者自行判断是否已有归一逻辑；无则加一行）。
2. 删除 `src/components/panels/settings/ContentStyleTab.tsx`。
3. `settings-dialog.css`：删 `.theme-grid`(93)/`.theme-card`(100,113,118,120)/`.theme-preview`(126)/`.theme-name`(136)/`.typography-preview`(214)/`.theme-tag`(219) 块；**保留** `.theme-card-check`(847) 与 `.theme-preview-card/.theme-preview-thumb/.theme-preview-name/.theme-preview-desc`(863+) 及 `.theme-thumb-*`。
4. `tests/settings-structure.test.mjs`：line 13 标签列表删 `'内容样式'`；line 20-27 的 `['ContentStyleTab.tsx', '内容样式']` 条目删掉。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/stylemode-contentstyle-decouple.test.mjs tests/settings-structure.test.mjs`
Expected: PASS（新测试全过 + 更新后的结构测试过）
再跑全量：`npm test`（299/0）+ `npx tsc --noEmit`。

- [ ] **Step 5: 提交**

```bash
git add -A src/components/panels/SettingsDialog.tsx src/components/panels/settings/ContentStyleTab.tsx src/styles/settings-dialog.css tests/settings-structure.test.mjs tests/stylemode-contentstyle-decouple.test.mjs
git commit -m "feat(style): 排版模式作内容样式唯一入口，删除设置「内容样式」选项卡

- 删 SettingsDialog 的 content 子标签（入口+渲染分支+import）
- 删除 ContentStyleTab.tsx 及其专属死样式
- 排版模式继续读写全局 typographyTheme（唯一入口）
- 阅读/预览/导出不变（useTheme 全局应用）"
```

---

## 备注

- `applyTypographyTheme` 仍被 `useTheme.ts:191` 调用（全局应用），`ContentStyleTab` 直呼删除无副作用。
- 删 CSS 前用 grep 二次确认每块仅被 `ContentStyleTab` 使用，避免误删 SettingsDialog 共享类。
- 全量 `npm test` + `npx tsc --noEmit` 每任务末跑一次。
