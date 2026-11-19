# 设置界面严格对齐 DESIGN-1 §5/§6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让设置弹窗（SettingsDialog + ThemeSettingsView）严格对齐 DESIGN-1.md §5/§6 的尺寸与颜色，用 Nebula 值替换残留的旧羊皮纸/墨夜预览色。

**Architecture:** 改 2 个文件——`SettingsDialog.tsx`（THEME_OPTIONS 预览卡换 Nebula 色+名、弹窗尺寸 1280/92vh）与 `settings-dialog.css`（导航条目 44px、选中字重 700、移除 `.theme-settings-view` 紧凑覆写恢复 §6 基准尺寸）；✓ 图标保持深色 `--color-on-primary`（Nebula 对比模型，不回退白）。布局结构与功能逻辑不动。

**Tech Stack:** TypeScript + Vite + React；CSS 变量 token；node:test 静态一致性测试（`tests/*.test.mjs`）。

**Spec:** `docs/superpowers/specs/2026-11-19-settings-nebula-conformance-design.md`（执行者两份同读）

## Global Constraints

- 颜色取已批准 Nebula（§6.2/6.3 规范文字里的羊皮纸/墨夜/朱红已过时）；结构/尺寸严格按 DESIGN-1 §5/§6。
- 不改设置功能逻辑（即时生效 / 无保存按钮 / 恢复默认 / 布局切换行为保留）。
- 主题预览卡内联色是 TSX 里的 hex（`nebula-surface.test.mjs` 只扫 CSS，抓不到）——本次新增测试专门钉住。
- ✓ 图标保持深色（`--color-on-primary`），禁止回退 `#fff`（白字压亮青 ~1.5:1，评审已列缺陷）。

## Review Focus

1. **主题预览卡残留旧羊皮纸/墨夜色**：`SettingsDialog.tsx` THEME_OPTIONS 内联 hex（CSS grep 抓不到）。→ Task 1 断言 `#F7EED4`/`#333A45`/`#FAF7F2`/`#17171A` 不出现 + `previewBg #F4F7FA`/`#0A0F18` 出现。
2. **弹窗尺寸不符 §5.1**：maxWidth 960/高 min(680px,86vh)。→ Task 1 断言 `PANEL_MAX_WIDTH = 1280`、`PANEL_HEIGHT = '92vh'`。
3. **紧凑覆写把尺寸压低于 §6**：`.theme-settings-view` 缩略图 112px/色盘 60px。→ Task 1 断言无 `.theme-settings-view .accent-circle {width:60px}`。
4. **选中态表达不足**：导航 38px（§5.3 44px）、强调色名 500（§6.3 Bold）。→ Task 1 断言 `.settings-nav-row` height 44px、`.accent-name.current` font-weight 700。
5. **✓ 图标对比回归**：白字压青底。→ Task 1 断言 `.accent-check-icon` color `var(--color-on-primary)` 且非 `#fff`。

---

### Task 1: 设置界面严格对齐 DESIGN-1 §5/§6

**Files:**
- Modify: `src/components/panels/SettingsDialog.tsx`（THEME_OPTIONS、PANEL_MAX_WIDTH、PANEL_HEIGHT）
- Modify: `src/styles/settings-dialog.css`（`.settings-nav-row`、`.accent-name.current`、移除 `.theme-settings-view` 紧凑覆写块）
- Test: `tests/settings-conformance.test.mjs`（新增）

**Interfaces:**
- Consumes: 既有 `ACCENT_PRESETS`（Nebula 五色）、`--color-on-primary` token。
- Produces: 无后续任务依赖（单任务）。

- [ ] **Step 1: 写失败测试 `tests/settings-conformance.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const dialog = read('src/components/panels/SettingsDialog.tsx')
const css = read('src/styles/settings-dialog.css')

// §6.2 主题预览卡必须 Nebula 色 + 名（禁残留旧羊皮纸/墨夜）
assert.doesNotMatch(dialog, /#F7EED4|#333A45|#17171A|#FAF7F2|#E1DCD1|#404955|#8E939A/, '主题预览卡不得残留旧羊皮纸/墨夜色')
assert.match(dialog, /previewBg:\s*'#F4F7FA'/, '浅色预览卡必须 Nebula 冷科技 #F4F7FA')
assert.match(dialog, /previewBg:\s*'#0A0F18'/, '深色预览卡必须 Nebula 深空 #0A0F18')
assert.match(dialog, /name:\s*'浅色主题 · 冷科技'/, '浅色主题名必须冷科技')
assert.match(dialog, /name:\s*'深色主题 · 深空'/, '深色主题名必须深空')

// §5.1 弹窗尺寸
assert.match(dialog, /PANEL_MAX_WIDTH = 1280/, '弹窗最大宽必须 1280（§5.1）')
assert.match(dialog, /PANEL_HEIGHT = '92vh'/, '弹窗高必须 92vh（§5.1）')

// §5.3 导航条目高 44px
assert.match(css, /\.settings-nav-row\s*\{[\s\S]{0,220}height:\s*44px;/, '导航条目必须 44px（§5.3）')

// §6.3 选中名称 Bold
assert.match(css, /\.accent-name\.current\s*\{[^}]*font-weight:\s*700/, '选中强调色名必须 Bold（§6.3）')

// §6.3 ✓ 图标深色（Nebula 对比模型，禁白字）
assert.match(css, /\.accent-check-icon[^{]*\{[^}]*color:\s*var\(--color-on-primary\)/, '✓ 必须深色 on-primary')
assert.doesNotMatch(css, /\.accent-check-icon[^{]*\{[^}]*color:\s*#fff/, '✓ 不得白字')

// §6.2/6.3 紧凑覆写已移除（缩略图回到 128px、色盘回到 80px）
assert.doesNotMatch(css, /\.theme-settings-view \.accent-circle\s*\{[^}]*width:\s*60px/, '紧凑覆写不得把色盘缩到 60px')
assert.doesNotMatch(css, /\.theme-settings-view \.theme-preview-thumb\s*\{[^}]*height:\s*112px/, '紧凑覆写不得把缩略图缩到 112px')
assert.doesNotMatch(css, /\.theme-settings-view \.accent-group\s*\{[^}]*gap:\s*28px/, '紧凑覆写不得把色盘间距缩到 28px')

console.log('settings conformance ok')
```

- [ ] **Step 2: 运行确认先红**

Run: `node --import tsx --test tests/settings-conformance.test.mjs`
Expected: FAIL（旧色/960/38px/500/60px 仍存在）

- [ ] **Step 3: 改 `SettingsDialog.tsx` THEME_OPTIONS 换 Nebula 色 + 名**

```js
const THEME_OPTIONS = [
  { id: 'parchment', name: '浅色主题 · 冷科技', desc: '当前默认，长时间阅读不易疲劳',
    skin: '#F4F7FA', topbar: '#FFFFFF', content: '#D4DEEB', previewBg: '#F4F7FA' },
  { id: 'dark', name: '深色主题 · 深空', desc: '夜间或暗光环境编辑作业更护眼',
    skin: '#0A0F18', topbar: '#151D2C', content: '#1E2A3A', previewBg: '#0A0F18' },
] as const
```

- [ ] **Step 4: 改 `SettingsDialog.tsx` 弹窗尺寸（§5.1）**

`const PANEL_HEIGHT = 'min(680px, 86vh)'` → `const PANEL_HEIGHT = '92vh'`；`const PANEL_MAX_WIDTH = 960` → `const PANEL_MAX_WIDTH = 1280`。（`PANEL_WIDTH = '92vw'` 不变。）

- [ ] **Step 5: 改 `settings-dialog.css` 导航条目高 + 选中字重**

`.settings-nav-row` 内 `height: 38px` → `height: 44px`；`.accent-name.current` 内 `font-weight: 500` → `font-weight: 700`。

- [ ] **Step 6: 改 `settings-dialog.css` 移除 `.theme-settings-view` 紧凑覆写块**

删除 `.theme-settings-view` 开头的整块覆写（`.theme-settings-view .settings-section-title`、`.theme-settings-view .theme-group, .layout-group`、`.theme-settings-view .accent-group`、`.theme-settings-view .theme-preview-card, .layout-card`、`.theme-settings-view .theme-preview-thumb`、`.theme-settings-view .layout-preview`、`.theme-settings-view .theme-preview-desc, .layout-desc`、`.theme-settings-view .accent-item`、`.theme-settings-view .accent-circle`、`.theme-settings-view .accent-check-icon`、`.theme-settings-view .accent-plus-icon`，以及前面的 `.theme-settings-view .settings-section-title > span:first-child::before` 装饰块）。回退到 §5.4/§6 基准（`.settings-section` 24px 28px 内边距、缩略图 128px、色盘 80px、色盘间距 40px、组间距 24px、卡片内边距 24px、✓ 30px、＋ 26px）。保留 `.settings-section`/`.settings-section-title` 基线规则与 §6.1 页头卡。

- [ ] **Step 7: 运行测试转绿**

Run: `node --import tsx --test tests/settings-conformance.test.mjs`
Expected: PASS

- [ ] **Step 8: typecheck + 全量测试**

Run: `npm run typecheck && npm test`
Expected: typecheck 0 错；全量通过（若 `code-mode-boundary` 等并发既有失败仍红，属既有非本改动引入，记录后放行）

- [ ] **Step 9: Commit**

```bash
git add src/components/panels/SettingsDialog.tsx src/styles/settings-dialog.css tests/settings-conformance.test.mjs docs/superpowers/specs/2026-11-19-settings-nebula-conformance-design.md
git commit -m "feat(ui): 设置界面严格对齐 DESIGN-1 §5/§6（预览卡 Nebula 色 + 弹窗 1280/92vh + 导航 44px + 选中 Bold）"
```

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §2 A-F → Task 1 各步骤；§3 取舍（Nebula 色/92vh/✓ 深色）→ Task 1 步骤 3/4/5 + Global Constraints。无遗漏。
- **步骤扫描**：每步一个可检查动作（写测试/跑红/改 TSX/改 CSS/跑绿/提交），无「TBD」、无逐字转写冗余。
- **类型一致**：THEME_OPTIONS 结构不变（仅值）；`as const` 保留；PANEL 常量名不变。单任务无跨任务接口。
- **Review Focus** 5 条各挂 Task 1 断言（旧色/960·680/60px 112px 28px/44px·700/✓ 深色）。已覆盖。
- **比例**：计划短（单任务 ~9 步），与短 spec 相当。
