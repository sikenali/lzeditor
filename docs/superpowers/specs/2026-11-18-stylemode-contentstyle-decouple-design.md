# 排版模式 13 样式解耦（排版模式作内容样式唯一入口）设计

## 意图与为什么

排版模式（`StyleMainPanel`）的 13 个样式是从开源项目 **xedit** 的 `THEME_PRESETS` 移植来的（`src/styles/typography-themes.ts` 行 1 注释：「参考 xedit 的 THEME_PRESETS」；`code-themes.ts` 同理）。但这 13 个样式目前并非排版模式私有：它们与设置→「内容样式」（`ContentStyleTab`）共用同一个全局 `typographyTheme` store 值，**双向耦合**——

- 排版模式读 `typographyTheme`（行 19/28/130）渲染，选样式卡/下拉时 `updateSetting('typographyTheme', t.id)` 回写（行 214/248）。
- 设置「内容样式」点卡时 `applyTypographyTheme(t.id); u('typographyTheme', t.id)`（行 14），反向影响排版模式。
- 同一值还驱动阅读模式、预览栏、导出（`useTheme.ts:191`、`SidebarPreview.tsx:39`、`ExportDialog.tsx:53`）。

用户希望排版模式不再从设置「内容样式」继承，而是**直接读取移植过来的 13 个样式，成为内容样式的唯一入口**。

## 决策（用户确认）

1. **排版模式作唯一入口**：13 个样式只在排版模式里选。
2. **删除设置「内容样式」选项卡**：`SettingsDialog` 移除 `content` NAV_GROUPS 入口与 `ContentStyleTab` 渲染分支；`ContentStyleTab.tsx` 删除。
3. **仍驱动全局**：排版模式继续读写全局 `typographyTheme`（现在它是唯一读写方），阅读/预览/导出继续跟随，语义不变，只是入口从设置搬到排版模式。

## 目标

- 设置窗口不再有「内容样式」标签。
- 排版模式成为 13 个样式的唯一入口，直接读 `TYPOGRAPHY_THEMES`（它已直接 import）。
- 阅读/预览/导出继续跟随全局 `typographyTheme`（由排版模式驱动）。

## 非目标 / 反目标

- 不改 13 个样式的视觉（`typography-themes.ts` 不动）。
- 不改阅读/预览/导出的样式应用逻辑（`useTheme`/`SidebarPreview`/`ExportDialog` 不动）。
- 不新增独立 store 字段（排版模式继续用全局 `typographyTheme`；无「排版模式独立于全局」的两套值）。

## Approaches（用户已选定）

| 方案 | 权衡 | 结论 |
|---|---|---|
| 完全独立（排版模式私有值 + 设置继续存在） | 需新增 store 字段，阅读/预览/导出与排版模式两套值易混乱 | 弃 |
| **排版模式作唯一入口（删设置标签）** | 无新字段，语义最简；排版模式仍驱动全局 | **采用** |
| 单向（排版模式只读设置） | 仍「继承」设置，与要求不符 | 弃 |

## 改动面

- `SettingsDialog.tsx`：删 line 6 `ContentStyleTab` import、line 25 `{ id:'content', label:'内容样式', icon:'ri-font-size' }` NAV_GROUPS 入口、line 99-100 `subTab === 'content' ? <ContentStyleTab .../>` 分支。
- `ContentStyleTab.tsx`：删除文件。
- `settings-dialog.css`：删 ContentStyleTab 专属死样式（`.theme-grid/.theme-card/.theme-preview/.theme-name/.theme-tag/.typography-preview`——已确认 SettingsDialog 用的是 `theme-preview-card/theme-preview-thumb/theme-thumb-topbar/theme-thumb-content/theme-preview-info/theme-preview-name/theme-preview-desc/theme-card-check` 等**不同**类，不共享）。
- `tests/settings-structure.test.mjs`：line 13 标签列表去掉 `'内容样式'`；line 21 的 `['ContentStyleTab.tsx', '内容样式']` 断言按删除后语义调整/移除。
- `typography-themes.ts` / `StyleMainPanel.tsx` / `useTheme.ts` / `SidebarPreview.tsx` / `ExportDialog.tsx`：**不动**。

## 留给实现者

- 确认 `applyTypographyTheme` 仍被 `useTheme.ts:191` 调用（全局应用），`ContentStyleTab` 的直呼删除无副作用。
- 删 CSS 前用 grep 二次确认每块仅被 `ContentStyleTab` 使用，避免误删 SettingsDialog 共享类。
- 跑全量 `npm test` + `npx tsc --noEmit`。
