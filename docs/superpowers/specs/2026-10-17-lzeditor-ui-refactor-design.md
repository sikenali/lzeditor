# lzeditor 界面重构设计（对齐 bid-platform 规范）

日期：2026-10-17
状态：已与用户确认设计，待写实施计划

## 1. 背景与目标

lzeditor 是 React 18 + Vite + Zustand + TipTap 的 Markdown 编辑器；`/home/jingle/opc` 下的 bid-maker 等产品是 Vue 3 + Vite，并定义了统一规范 `AGENT.md` 与 `DESIGN.md`。

本次目标：按 `DESIGN.md` 的设计语言与 `AGENT.md` 的开发约定，重构 lzeditor 的界面（顶部导航、中间内容区、底部 footer、所有弹框、设置界面），**功能保持不变，仅统一视觉与结构**。

关键前提：
- lzeditor 是 React，bid-maker 是 Vue。"直接继承 bid-maker 的功能代码" = **在 React 中用 React 组件重写同等功能与视觉**，而非复制 `.vue` 文件。
- `AGENT.md` 的图标/toast 条款是 Vue 语境；在 React 中的等价物是 `remixicon-react` 组件（`RiXxxLine`）与 `src/utils/toast.ts` 的 `ElMessage` 封装。

### 已确认的决策

| # | 决策 | 结论 |
|---|------|------|
| D1 | Design Token 策略 | 全量替换为 bid-maker `--color-*` 体系 |
| D2 | 设置目录树 | 顶级 4 项：主题设置 / 模型管理 / 个性设置 / 关于 |
| D3 | 个性设置子标签 | 4 个：内容样式 / 编辑设置 / 应用行为 / 快捷键设置；删除同步备份 |
| D4 | 设置导航交互 | 左侧顶级 + 右侧顶部子标签 + 内容为堆叠 section-card |
| D5 | 布局组装 | navtop → main-content（含可折叠状态栏）→ footer；状态栏可折叠 |
| D6 | 主题模型 | 完全采用 bid-maker：浅色羊皮纸/深色墨夜 + 5 强调色；移除 system 与旧 accent id |
| D7 | 弹框底层 | 新建 React UI 原子库，全部弹框迁移 |
| D8 | navtop 左侧 | 顶栏模式仅保留现有功能组，**去掉品牌区** |
| D9 | 布局切换 | 驱动现有 `navMode`（top/left），实时切换，不刷新 |
| D10 | 侧边栏展示 | 只显示图标，hover 弹出悬浮文字标签；侧边栏内部分组加视觉间隔与分组线 |
| D11 | 状态栏位置 | 可折叠状态栏紧贴 footer 之上（无缝相接） |

### 不在本次范围

- 不重构编辑器内容区（TipTap 内容）、排版主题、代码高亮主题、预览渲染、AI/导出等业务逻辑。
- 不删除 HeroUIProvider（重构区不再依赖 HeroUI，全量迁移后再删）。
- 关于页文案细节后续再改。

## 2. 设计 Token 与主题系统（D1/D6）

### 2.1 新增 token 层（唯一来源）

- 新建 `src/styles/tokens.css`：bid-maker `:root` 全套 token：
  - 颜色：`--color-primary`、`--color-primary-soft`、`--color-bg-main/secondary/card/white`、`--color-text-primary/body/secondary/muted/faint`、`--color-border/-soft/-hover`、`--color-success/-strong/-soft`、`--color-info/-soft`、`--color-warning/-soft`、`--color-error/-soft`（浅色羊皮纸默认值，见 `DESIGN.md` §5）。
  - 字体：`--font-family`、`--font-family-cn`。
  - 字号：`--text-xs..4xl`；字重 `--font-light..bold`；行高 `--leading-*`。
  - 间距：`--spacing-0..16`（4/8/12/16/20/24/32/40/48/64）。
  - 圆角：`--radius-sm/md/lg/xl/2xl/full` = 6/10/14/18/24/9999。
  - 按钮高度：`--btn-height-xs/sm/md/lg/xl` = 32/36/44/52/58；输入高度 `--input-height-*`。
  - 阴影：`--shadow-xs..xl`；过渡：`--transition-fast/base/slow`；`--z-*`。
- 新建 `src/styles/themes.ts`：`export const themeTokens = { parchment, dark }`，值为 bid-maker `themeTokens` 精确色值（浅色见 `DESIGN.md` §5 Light，深色见 §5 Dark，含 `--color-success-strong`、`*-soft`）。

### 2.2 主题应用（JS 直写，无 `[data-theme]` 覆盖块）

重写 `src/hooks/useTheme.ts` 的 `applyTheme()`：

```
applyTheme(theme: 'parchment' | 'dark', accentHex: string | null)
  root.dataset.theme = theme
  for (k, v) of themeTokens[theme]: root.style.setProperty(k, v)
  if accentHex: root.style.setProperty('--color-primary', accentHex)
```

- **删除** `src/styles/color-tokens.css` 中所有 `[data-theme="..."]` 覆盖块，只保留 `:root` 默认（或整体由 `tokens.css` 取代）。
- 强调色持久化：`lzeditor-accent`（存色值 hex）；主题持久化：`lzeditor-theme`（存 `parchment|dark`）。

### 2.3 主题模型

- `settingsStore.theme: 'parchment' | 'dark'`（替换现有 `light|dark|system`）。
- 强调色预设 `ACCENT_PRESETS` 改为 bid-maker 5 色：朱红 `#BE3B2E`（默认）、鎏金 `#D3A93F`、玉绿 `#3E8C6E`、云蓝 `#4A72A8`、黛墨 `#2F3640`；移除旧 id（red/teal/green/gold/ink）。
- `main.tsx` 启动时按持久化值同步应用，避免闪烁。

### 2.4 兼容桥（关键）

lzeditor 现有大量内容/排版/预览/面板 CSS 使用旧 token 名（`--accent-primary`、`--accent-a3..a60`、`--accent-soft`、`--accent-border`、`--accent-glow`、`--text-heading`、`--text-heading-2`、`--text-muted`、`--bg-primary`、`--bg-secondary`、`--bg-code`、`--background-card`、`--background-code`、`--border-subtle`、`--font-sans`、`--histo-*`、`--chrome-*` 等）。

为**避免逐行重写约 400KB 内容 CSS**，新增一个别名块（`src/styles/tokens.css` 内）：

```
:root {
  --text-heading: var(--color-text-primary);
  --text-heading-2: var(--color-text-secondary);
  --text-muted: var(--color-text-muted);
  --bg-primary: var(--color-bg-main);
  --bg-secondary: var(--color-bg-secondary);
  --bg-code: var(--color-bg-secondary);
  --background-card: var(--color-bg-card);
  --background-code: var(--color-bg-secondary);
  --border-subtle: var(--color-border-soft);
  --font-sans: var(--font-family);
  /* ... 其余旧名按语义映射 */
}
```

- `--accent-*` 动态 alpha 系列继续由 `applyTheme()` 用 JS 基于 `--color-primary` 计算写入（保留现有 rgba 派生逻辑，只是源色统一到 `--color-primary`）。
- 新组件与重构区**一律直接使用 `--color-*`**，不再新增旧名。

## 3. 顶部 navtop（D8）

组件：`src/components/layout/Toolbar.tsx`（保留组件名与全部逻辑，仅重排样式）。

- 按 `DESIGN.md` §2.4 TopNav：高度 72px、左右内边距 24px、背景 `var(--color-bg-white)`、底部 0.7px `var(--color-border)`。
- **顶栏模式左侧 = 仅现有功能组**（文档库 / 新建(含子菜单) / 大纲 / 查找），**不加品牌区**。
- 中间组（格式 / 图片 / 链接 / 表格 / 插入）与右侧组（AI / 模式 / 历史 / 样式 / 导出 / 设置）保持不变。
- 左/中/右三组之间加**轻微视觉分组**（间距或细分隔线）。
- 所有图标、文字标签、子菜单项、`toolbar-menu-dot` 小圆点、`applyCmd/handleXxx` handler **1:1 保留**。
- 新增 `.navtop` 类名别名（与原 `.toolbar` 并存或替换，视实施而定）。

## 4. 布局切换（D9/D10）

- 主题设置中的「布局切换」卡片**驱动 `settingsStore.navMode`**：顶栏模式 = `'top'`，侧边栏模式 = `'left'`；点击即时切换，**无整页刷新**（App 已按 `navMode` 渲染 `topLayout`/`leftLayout`）。

### 4.1 侧边栏模式（`navMode === 'left'`）

- `src/components/layout/LeftNav.tsx`：**折叠为只显示图标**（隐藏 `left-nav-label`）。
- **hover 悬浮文字标签**：鼠标悬停图标时，在其右侧弹出悬浮框：圆角 `--radius-md`、背景 `--color-bg-white`、0.7px `--color-border`、`--shadow-md`、文字 `var(--color-text-body)`/`--text-sm`、淡入 + 轻微位移动画（`--transition-fast`）。
- **内部分组视觉间隔**：`LeftNav` 现有分组（文档库·大纲·预览 / 编辑·代码·阅读 / 历史·样式 / AI）之间以 `left-nav-sep` 分组线 + 加大上下间距呈现，视觉上明确 3~4 个 group。
- 侧边栏模式下 navtop 左/中/右功能组保持不变（仅换皮）。

## 5. 中间 main-content（D5/D11）

组件：`src/App.tsx` 的 `topLayout`。

纵向顺序：

```
navtop (Toolbar)
DocumentMetaBar（文档标签栏）
编辑区（LZEditor，默认 appMode='edit'）
可折叠 StatusBar（紧贴 footer，无缝相接）
footer
```

- **StatusBar 收敛**：`src/components/layout/StatusBar.tsx`
  - 左：sync 状态（`statusbar-sync`：已保存/保存中/失败）+ `statusbar-item`（时间等）。
  - 右：`statusbar-right` 内 `statusbar-item`（字数 / 字符 / 行列）。
  - **移除中间的 大纲 / 即时预览 / 样式预览 三个 pill**（移入 footer）。
  - 水平状态栏右端新增**折叠控件**（chevron 按钮），切换状态显隐；显隐状态持久化到 localStorage（键如 `lzeditor-layout.statusbarCollapsed`）。
  - **无打开文档时不显示**（以 `activeDocId == null` 或等价条件判断）。
  - `statusbar-vertical` 变体按新结构同步调整（左右布局模式）。
- **紧贴 footer**：状态栏与 footer 之间无间距/边框重叠，视觉上作为一体式底部（上边框只在状态栏顶部或 footer 顶部保留一条，避免双线）。

## 6. 底部 footer（D5）

新建 `src/components/layout/Footer.tsx`（或 `PageFooter.tsx`），按 `DESIGN.md` §2.4 PageFooter：

- 高度 58px，左右内边距 32px，背景白→次级背景纵向渐变（`--color-bg-white` → `--color-bg-secondary`），顶部 1px `--color-border-soft`。
- 左：`logo.svg`（20px）+ `懒猫编辑器`（`--text-md` Medium）。
- 中：三个圆形图标按钮 `28×28`、图标 14px、`--color-text-secondary`，hover 时背景 `--color-primary`、图标变白、上浮 2px：
  - 大纲 → `setShowOutline(!showOutline)`
  - 即时预览 → `setShowPreview(n)` + `updateSetting('previewModeEnabled', n)`
  - 样式预览 → `setAppMode(appMode === 'style' ? 'edit' : 'style')`
- 右：`© 2026 懒猫编辑器 Powered by LightOS`（`--text-md`，`--color-text-muted`），`Powered by LightOS` 为主色链接，点击跳转 `https://lazycat.cloud/`（`target="_blank" rel="noopener noreferrer"`）。

## 7. 弹框统一（D7）

### 7.1 新建 React UI 原子库 `src/components/ui/`

镜像 bid-maker `components/ui/` 的 props 与视觉，全部基于 `--color-*`：

| 组件 | 关键 props | 依据 |
|------|-----------|------|
| `UiModal` | `open/onClose`、`icon`(ri-字符串)、`title`、`subtitle`、`footer`、`width=600`、`closeOnOverlay` | `DESIGN.md` §6.1：teleport、遮罩 rgba(0,0,0,0.4)、radius 18、shadow-xl、opacity 过渡 |
| `UiInput` | `value/onChange`、`type`、`placeholder`、`prefixIcon`、`clearable`、`size` | §6.2：高 42、0.7px 边框、bg-secondary→focus bg-white + 主色边框、radius 10 |
| `UiSelect` | `value/onChange`、`options({value,label,desc?,group?})`、`placeholder` | §6.5 |
| `UiSwitch` | `checked/onChange`、`disabled`、`size` | §6.4 |
| `UiCheck` | `checked`、`size` | §6.3 |
| `UiSelectCard` | `selected`、`title`、`desc`、`iconText`、`iconColor` | §6.5：激活卡主色边框 + ✓ |
| `UiRadioGroup` | `value/onChange`、`options`、`direction` | — |
| `UiTabs` | `value/onChange`、`tabs`、`variant='pill'` | — |
| `UiTip` | `text`、`placement` | — |
| `UiButton` | `variant='primary'\|outline\|ghost'`、`size` | §6 |

- 图标：改用 `remixicon-react` 组件；新增 `src/utils/icon.ts` 的 `resolveIcon('ri-xxx-line')` 映射（对应 AGENT.md 的 `riToCompName` 约定）。
- 现有 `src/utils/toast.ts` 保留（等价 AGENT.md §3 的 `@/utils/toast`）。

### 7.2 迁移范围（功能不变）

全部弹框/面板改用新原子库并统一视觉：

- 插入类：`ImageDialog`、`LinkDialog`、`CodeDialog`、`FormulaDialog`、`TableDropdown`、`EmojiDialog`、`ChartDialog`
- 面板类：`BeautifyDialog`、`ExportDialog`、`HistoryPanel`、`LibraryPanel`、`FilePanel`、`PreviewPanel`、`OpenKnowledgePanel`、`SearchPanel`、`ReadMode`
- `SettingsDialog`（见第 8 节，整篇重写）
- AI 相关：`AIPanel`、`LanguageSelector`、`FloatingToolbar` 等按新 token 与新控件适配

- 废弃：`UnifiedDialog`、`PanelContainer`（含 `UD*` 子组件）、`LFInput`、`LFSInput.internal`、`SelectBox`、`Checkbox`（迁移完成后删除）。
- 重构区不再使用 HeroUI（`@heroui/react` 的 `Switch`/`Input` 等改为新原子组件）。

## 8. 设置界面（D2/D3/D4）

组件：重写 `src/components/panels/SettingsDialog.tsx`，结构改为「左顶级 4 项 + 右侧顶部子标签 + 堆叠 section-card」，基于新原子库与 `--color-*`。

### 8.1 顶级导航（左侧）

1. **主题设置** `ri-palette-line`
2. **模型管理** `ri-cpu-line`
3. **个性设置** `ri-user-settings-line`
4. **关于** `ri-information-line`

### 8.2 主题设置

移植 bid-maker `ThemeSettingsView`（React 重写）：

- **外观主题**：2 卡（浅色·羊皮纸 `#F7EED4` / 深色·墨夜 `#333A45`），含预览缩略图与勾选徽标；点击调用 `applyTheme`。
- **强调色**：5 个圆形色盘（朱红/鎏金/玉绿/云蓝/黛墨），选中显示 ✓。
- **布局切换**：2 卡（顶栏模式 / 侧边栏模式），点击设置 `navMode`（实时生效，不刷新）。
- **恢复默认**：`theme=parchment`、`accent=朱红`、`navMode=top`（修正 bid-maker `resetAll` 把 layout 写成 sidebar 的 bug）。

### 8.3 模型管理

移植 bid-maker `ApiKeySettingsView`（React 重写），映射到 lzeditor `settingsStore.apiKeys`：

- 两种配置模式（`UiSelectCard`）：**模型制造商** / **自定义配置**。
- 服务商/模型预设：采用 bid-maker `providerModelsMap`（阿里云/百度/智谱/DeepSeek/Moonshot/OpenAI/Anthropic/Google 等）与分组 `UiSelect`。
- 自定义模式：API 格式（OpenAI/Anthropic）、自定义地址、模型 ID。
- API Key 输入（明文/密文切换）。
- 已保存密钥列表：显示 provider/model/掩码/端点，支持**连通性测试**、编辑、删除（`UiModal` 确认）、`UiSwitch` 启用开关。
- 保留 lzeditor 现有连通测试与 store 结构，仅替换 UI。

### 8.4 个性设置（4 子标签）

- **内容样式**：从主题设置**移入**的排版主题选择器（沿用现有 `TYPOGRAPHY_THEMES` + `applyTypographyTheme`，卡片样式对齐 section-card）。
- **编辑设置**：将现有「通用设置 / 本地化 / 编辑模式」合并为一个可滚动页，用 section-card 分组：
  - 排版（字体/字号/行高/内容宽度）
  - 段落排版（首行缩进/两端对齐）
  - 工具栏（显示所有按钮/显示标题）
  - 本地化（拼写检查/语言、Markdown 符号与补全、智能引号、CJK 空格、全角符号、行号）
  - 编辑模式（Markdown 标记常显、快照差异、打字机、专注、预览模式）
- **应用行为**：启动标签页、启动保存剪贴板、托盘图标、重开最后文档、文件管理器新窗口、关闭全部窗口即退出（现有 `renderAppSettings`）。
- **快捷键设置**：保留现有 `renderShortcutContent`（文档/编辑/常规/标题段落/代码块/系统级）展示，卡片样式统一。
- **删除**：同步备份（原 `renderSyncContent` 与相关 store 项可保留不展示或清理，实施时决定）。

### 8.5 关于

移植 bid-maker `AboutSettingsView`（React 重写）：

- 徽标圆 + 品牌名（`懒猫编辑器`）+ 标语 + 版本号 + 仓库链接 + 版权行。
- 文案后续再改（先沿用结构）。
- 删除原 lzeditor 的模板/技能/导出/独立 AI 顶级入口。

## 9. 验收标准

- `npm run build`（`tsc && vite build`）通过；无独立 lint/test 脚本。
- `npm run dev` 冒烟：
  1. navtop 左侧仅功能组，中/右不变，子菜单/小圆点正常。
  2. 布局切换可在顶栏/侧边栏间实时切换；侧边栏图标化 + hover 悬浮文字 + 分组间隔。
  3. main-content 默认编辑区；状态栏紧贴 footer 且可折叠；无文档时状态栏不显示。
  4. footer 三段正确，`Powered by LightOS` 跳转 `https://lazycat.cloud/`。
  5. 所有弹框视觉统一、功能不变。
  6. 设置 4 顶级标签与个性设置 4 子标签齐全；主题浅/深切换、强调色、布局切换、模型管理增删测试、关于页正常。

## 10. 风险与注意

- **Token 全量替换风险高**：兼容桥只覆盖已知旧 token 名；实施时需 grep 全量旧 token 使用点，确保别名完整，否则部分区域会丢失颜色。
- **`[data-theme]` 块删除**后必须确认无 CSS 依赖该属性选择器（除 `dataset.theme` 调试外）。
- **HeroUI 依赖**：重构区替换后需确认无残留 import，避免运行时样式冲突。
- **弹框数量多**：建议分批迁移并每批 `tsc` 校验。
- 不引入新依赖（`remixicon-react` 已在依赖中）。
