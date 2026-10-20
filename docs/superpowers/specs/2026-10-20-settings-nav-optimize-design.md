# 设置弹窗左侧导航优化设计

日期：2026-10-20

## 背景

前一轮把设置弹窗对齐 bid-typesetting 后遗留一个视觉问题：

- 导航栏 784px 高，4 个一级行各 52px，只占 220px + padding ≈ 240px，栏底留白约 547px（约 70%）。
- 「个性设置」的 4 个子项放在内容区顶部做横向子标签条，形成两个一级导航面（左栏选组、顶栏选子页），切换路径割裂。

## 方案

把带子项的组的子项内联进左栏导航，删掉内容区顶部的子标签条。

导航从 4 行变 8 行：4 × 52px + 4 × 40px + gap ≈ 388px，栏底留白从约 70% 降到约 50%，与 bid-typesetting 的 5 项约 61% 接近但更饱满。一级导航收敛到一个面，选组与选子页在同一列内完成。

用户此前 D2 决定「保留 4 组 + 个性设置下 4 子标签结构」，本轮是用户明确要求的优化，推翻了「子项放内容区顶部」这一实现位置，但 4 组 / 4 子项的信息结构不变。

## 改动范围

仅两个文件，不动状态层与数据落盘。

`src/components/panels/SettingsDialog.tsx`

- 每个 NAV_GROUPS 项包一层 `.settings-nav-branch` div，内含原 `.settings-nav-row` 按钮，有子项时追加 `.settings-nav-sublist`。
- 子项按钮用 `.settings-nav-sub`，复用 `.settings-nav-txt` 文字样式。
- 删除 `rightTop`（原 `.settings-subtabs` 子标签条）及其在 `.settings-panel-content` 里的挂载点。
- 点击一级行时若有子项则 `setSubTab(item.subs[0].id)`，点击子项时只 `setSubTab(tab.id)`。`activeGroup` 与 `subTab` 两个状态维持原语义，`setActiveGroup` 切换时子项复位的既有 effect 不变。

`src/styles/settings-dialog.css`

- 删 `.settings-subtabs` / `.settings-subtab` 全部规则。
- 新增：
  - `.settings-nav-branch`：纵向 flex，gap 2px，`flex-shrink: 0`。
  - `.settings-nav-sublist`：`margin-left: 30px; padding-left: 10px; border-left: 1px solid var(--color-border-soft)`。30px 使引导线落在一级行图标中心（图标 x=20、宽 22、中心 31），视觉从属父项。
  - `.settings-nav-sub`：40px 高、10px 圆角、gap 10px、padding 0 12px；hover 用 `--color-bg-secondary`，active 用 `--color-primary-soft`，active 文字与图标用 `--color-primary` 加粗。
  - `.settings-nav-sub .remix`：18px 宽、17px 字号，较一级图标（20px）略小以体现层级。
  - `.settings-nav-sub .settings-nav-txt`：14px，较一级（15px）略小。

CSS 只使用现有 `--color-*` token，未新增 `[data-theme]` 选择器，符合仓库 AGENT.md §7。

## 不动的部分

- bid 视觉基准：外壳尺寸 92vw / 上限 1400 / 92vh、nav 栏 240 宽 52 行高 12 圆角 14 间距 16 padding、内容 gap 20、裸标题、`.page-header-card` 在 modal 内隐藏。
- D8 两处偏离：密钥行可点击选中、密钥显示打码（bid 直接渲染 `k.api_key` 原文，有泄屏风险）。
- 模型设置页的「恢复默认」「清空表单」入口随页头卡隐藏仍缺，保留可逆回退方式：删掉 `.settings-panel-content .page-header-card { display:none }` 一行即可恢复。
- 数据层 `settingsStore.ts`、`useAI.ts`、导出、快捷键逻辑全部不动。
- `.settings-subtab-btn`（settings-dialog.css:796-835 的旧类）未触碰；本轮删除的是不带 `-btn` 后缀的 `.settings-subtab`。
- 顶部工具栏与左侧 rail 不属于本轮范围。

## 验证

`npx tsc --noEmit` 通过。

Playwright `snav-audit.mjs` 浅色 + 深色双主题共 42 项，全部通过，无 pageerror / console error：

- 内容区 `.settings-subtabs` 数量为 0
- 4 分支 / 4 一级行 / 4 子行
- 一级行统一 52 高、宽等于栏内宽（实测 206，栏宽 240 减 padding 32 减边框 1.4）
- 子行统一 40 高、宽一致（实测 165）
- 引导线对齐一级行图标中心，误差 ±2px 内（line=148，icoCenter=149）
- 引导线为 1px solid
- 4 个子行全部落在「个性设置」分支节点内
- 子项图标位于一级图标中心右侧（subIco=171 > parentIcoCenter=149）
- 导航占用率 54%（used=388, free=364），高于 50% 目标
- 4 个子项各自渲染不同内容
- 子项 active 跟随点击切换
- 父行与子项同时高亮（个性设置 + 子项）
- 高亮底色等于 `--color-primary-soft` 实测值，浅色 rgb(251,233,231)、深色 rgb(58,35,35)
- 高亮文字色为强调色，父行与子项一致 rgb(190,59,46)
- 切到其他组再切回个性设置，子项复位到首个「内容样式」
- 双主题下 `--color-*` token 级联均生效，无主题残留
