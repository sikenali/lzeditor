# 弹框按钮统一设计（方案 A：CSS 层统一 + 修根因）

## 意图与为什么

各弹框的按钮（主/次/幽灵/选项 chip）目前有 4 套并行样式，文字/背景/线框不一致，且部分不随强调色变化，个别在 hover 时看不清/消失。本次在 CSS 层统一全部弹框按钮的**文字/背景/线框**，使其都走 accent token（随强调色变化），并修掉看不清/不显示的问题。

## 根因

1. **`--accent-hover: var(--accent-a20)`**（20% 透明浅红，本应做浅底）被当作实心主按钮的 hover 背景使用：
   - `.ud-btn--primary:hover`（settings-dialog.css:502-503）
   - `.search-btn--primary:hover`（panels.css:964, 983）
   白字压浅红 → **hover 时看不清/消失**。
2. `.ud-btn--primary` 硬编码 `color: white`；`.ui-btn--primary` / `.welcome-btn--primary` 用 `--color-primary` / `--color-on-primary`（**绕过 accent token**，不随强调色）。
3. 线框不统一：`.ud-btn`/`.ui-btn`/`.search-btn` 有 `0.7px var(--border-subtle)`；`.settings-save-btn`/`.welcome-btn--primary` 是 `border: none`。

## 目标

- 主按钮：`--accent-primary` 实底 + `--accent-foreground` 文字 + `0.7px` 同色线框；hover 用**加深 accent**（不再浅红）。
- 次/幽灵按钮：统一 `0.7px var(--border-subtle)` 线框 + `--text-secondary` 文字；hover 边框变 accent、文字变 primary。
- 全部走 accent token（去掉硬编码 `white`、去掉绕过 token）。

## 非目标 / 反目标

- 不改组件 classNames，不收敛到 UiButton 体系（方案 B 弃用）。
- 不改各按钮的尺寸/圆角（工具栏/弹框/欢迎页上下文不同，保留各自尺寸）。
- 不引入新组件。

## 方案 A（选定）

1. **`color-tokens.css` 修根因**：`--accent-hover` 改为 `color-mix(in srgb, var(--accent-primary) 88%, #000)`（加深，与 `.ui-btn--primary:hover` 现用写法一致）。一处修好 `.ud-btn--primary` 与 `.search-btn--primary` 的 hover 消失。
2. **`settings-dialog.css`**：
   - `.ud-btn--primary`：`color: var(--accent-foreground)`（替硬编码 `white`）；`border: 0.7px solid var(--accent-primary)`；hover `background/border-color: var(--accent-hover)`（现为深色）+ `color: var(--accent-foreground)`。
   - `.settings-save-btn`：`border: 0.7px solid var(--accent-primary)`（统一线框）；`color: var(--accent-foreground)`；hover 保留阴影 + 边框同色。
   - `.ud-btn`（次/幽灵）：已用 `--border-subtle` 线框 + `--text-secondary` 文字 + hover accent 边框，已达标（确认不动）。
3. **`ui.css`**：`.ui-btn--primary` / `--outline` / `--ghost` **目前没有 base 规则**（只有 hover/disabled）——主按钮静止时无 accent 底、无文字色，等于「不显示」。需**补 base 规则**：`.ui-btn--primary` = `var(--accent-primary)` 底 + `var(--accent-foreground)` 字 + `0.7px` 同色线框；`.ui-btn--outline` = `0.7px var(--border-subtle)` 线框 + `--text-secondary` 字；`.ui-btn--ghost` = 透明底 + `--text-secondary` 字。hover 改用 accent token（`.ui-btn--outline:hover` 边框/文字 `var(--accent-primary)`；`.ui-btn--ghost:hover` `var(--bg-hover)` + `var(--text-primary)`；`.ui-btn--primary:hover` 加深 `color-mix` 但走 `var(--accent-primary)`）。`.ui-btn--primary.disabled` 用 `var(--accent-foreground)`。
4. **`welcome-screen.css`**：`.welcome-btn--primary` 用 `--accent-foreground`（替 `--color-on-primary`）+ `0.7px` 线框；`.welcome-btn--ghost` 文字/hover 对齐 accent 边框。

## 范围说明

- 主范围是**弹框按钮**（SettingsDialog / ExportDialog / CodeDialog / ImageDialog / ChartDialog / LinkDialog / FormulaDialog / EmojiDialog / TableDropdown / LibraryPanel / ModelSettingsTab）。
- `--accent-hover` 的 token 修复会**连带**修好全局搜索条 `.search-btn--primary`（同一根因，非弹框但同 bug）。
- `.welcome-btn` 属欢迎页非弹框，但为彻底消除「绕过 accent token」的不一致，一并对齐（可跳过，不影响弹框验收）。

## 留给实现者

- 逐条核对 hover/正常态对比度（浅色 + 深色主题都可读，白字不再压浅红）。
- 保留各上下文尺寸/圆角；加线框造成 ±1.4px 尺寸变化可接受。
- 若源码断言测试断言了硬编码 `white` / `--color-on-primary`，同步更新。
- 跑全量 `npm test` + `npx tsc --noEmit`。
