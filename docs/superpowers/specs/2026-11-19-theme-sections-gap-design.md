# 主题设置 3 个 Section 间距 — 设计（简短）

日期：2026-11-19 · 分支：`dev`（v1.5.0 之后）· 规模：small change

## Intent

设置中心「主题设置」视图里 3 个区块（外观主题 / 强调色 / 导航布局）目前紧贴无间距，需要拉开。

## Why

`.settings-content` 是 `flex; gap:20px`（`settings-dialog.css:681-684`），各 tab 的 `.settings-section` 作为**直接子项**享受 20px 区块间距。唯独 `ThemeSettingsView` 多包了一层 `<div className="theme-settings-view">`（`SettingsDialog.tsx:185`），它成为 `.settings-content` 的唯一 flex 子项——`gap:20px` 不再作用于内部 section，而内部 section 的 `margin-bottom` 又被 `settings-dialog.css:688`（`.settings-content .settings-section { margin-bottom:0 }`）清零，导致 3 个 section 紧贴。其他 tab 无此问题。

## Non-goals / anti-goals

- 不改变其他 tab 的间距（它们已正确）。
- 不改变区块卡片的圆角/边框/内边距/阴影。
- 不引入新依赖。

## Approaches

1. **`.theme-settings-view` 设 `display:flex; flex-direction:column; gap:20px`**（推荐）：与 `.settings-content` 的 `gap:20px` 全站一致，header 卡片与首个 section、以及 3 个 section 之间均有 20px；只影响主题视图。
2. 给 `.theme-settings-view .settings-section` 加 `margin-bottom:20px`：可行，但需覆盖 L688 的同 specificity 规则（依赖 source order），且 header 与首个 section 之间仍无间距，需另补——不如方案 1 干净。
3. 去掉 `.theme-settings-view` 包裹层：改动组件结构，风险大于收益。

**用户选择：方案 1，20px（与全站一致）。**

## How

`src/styles/settings-dialog.css` 追加：

```css
/* 主题视图：.theme-settings-view 是 .settings-content 唯一 flex 子项，
   gap:20px 需在此层重建，否则 3 个 .settings-section 紧贴（L688 已清 margin） */
.theme-settings-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
```

## 测试

无单元测试变更（纯视觉间距，无逻辑）；运行 `npm test`（359/359）确认无回归，`npm run typecheck` 0 错。
