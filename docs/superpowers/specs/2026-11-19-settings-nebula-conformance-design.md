# 设计文档 — 设置界面严格对齐 DESIGN-1.md §5/§6（Nebula 版）

> 状态：**待批准**（批准前不写产品代码）
> 日期：2026-11-19
> 范围：**设置弹窗**（SettingsDialog + ThemeSettingsView）—— 用户「严格按照设计规范，特别是设置界面」。
> 参考：`/home/jingle/opc/DESIGN-1.md` §5 设置页面 / §6 ThemeSettingsView；应用已整体切换 Nebula（电光青，`2026-11-19-nebula-ui-redesign`）。

## 1. 需求与决策

用户请求：设置界面「还是有点不一样」，需**严格按设计规范**。
brainstorming 澄清：**全按规范 §5/§6 尺寸 + 颜色**（主题预览卡用 Nebula 色以匹配实机；颜色取已批准的 Nebula，结构/尺寸严格按 §5/§6）。

**不做**：不改设置功能逻辑（即时生效/无保存按钮/恢复默认/布局切换行为均保留）；不改其它标签页功能；不引入新依赖。

## 2. 变更清单（A–F，全部在 2 个文件）

### `src/components/panels/SettingsDialog.tsx`
- **A. THEME_OPTIONS 换 Nebula 色 + 名**（预览卡与实机一致）：
  - 浅色（key `parchment`）：`name: '浅色主题 · 冷科技'`，`skin '#F4F7FA'`（bg-main）、`topbar '#FFFFFF'`、`content '#D4DEEB'`（border）、`previewBg '#F4F7FA'`。
  - 深色（key `dark`）：`name: '深色主题 · 深空'`，`skin '#0A0F18'`、`topbar '#151D2C'`、`content '#1E2A3A'`、`previewBg '#0A0F18'`。
- **B. 弹窗尺寸**：`PANEL_MAX_WIDTH 960→1280`（§5.1），`PANEL_HEIGHT 'min(680px, 86vh)'→'92vh'`（§5.1）。`PANEL_WIDTH '92vw'` 不变。

### `src/styles/settings-dialog.css`
- **C. 导航条目高**：`.settings-nav-row` `height 38px→44px`（§5.3）。
- **D. 强调色名选中字重**：`.accent-name.current` `font-weight 500→700`（§6.3 选中 Bold）。
- **E. ✓ 图标颜色保持深色**：`.accent-check-icon` 已用 `--color-on-primary`（深墨字，Nebula 对比模型）。**不改回白**——§6.3 文字「白色 ✓」是旧羊皮纸色板时代的值，白字压亮青仅 ~1.5:1（评审已列缺陷并修复）；Nebula 亮色盘必须深字。保留现状。
- **F. 移除 `.theme-settings-view` 紧凑覆写**（恢复 §6.2/6.3 基准尺寸）：缩略图 112→128px、色盘 60→80px、`accent-group` 间距 28→40px、`theme-group`/`layout-group` 间距 16→24px、卡片内边距 14→24px、`accent-item` 间距 10→16px、`accent-check-icon` 22→30px、`accent-plus-icon` 20→26px。整块删除（含 section-title 小圆点装饰——非规范要求，随紧凑覆写一并移除，回退 §5.4 基线）。

## 3. 已知取舍
- §6.2/§6.3 规范文字里的羊皮纸/墨夜/朱红色值已过时（规范未随 Nebula 更新）；按已批准方向取 Nebula 值，结构/尺寸严格按规范。
- 弹窗 92vh 比现状 min(680px,86vh) 更高——严格按 §5.1 规范（用户已确认「全按规范」）。
- 其它设置标签页（模型/编辑/排版/符号/行为/快捷键/关于）已 token 化（Nebula），本次不动。

## 4. 验证
1. `npm run typecheck` 0 错；`npm test` 全量通过（既有 `nebula-surface`/`theme-boundary` 等不含 THEME_OPTIONS 内联色断言，需新增或补——见计划）。
2. 浏览器手测设置弹窗：浅/深两主题下预览卡显示 Nebula 色、弹窗 1280/92vh、导航 44px、色盘 80px、选中字重 700、✓ 深色。
3. 打包 1.3.1 安装盒上核对（可选，视合并进度）。
