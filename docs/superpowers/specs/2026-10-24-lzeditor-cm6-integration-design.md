# LZEditor：CodeMirror 6 内核与外部项目集成改造设计

日期：2026-10-24
状态：待用户评审

## 背景与目标

LZEditor 当前以 TipTap 3（ProseMirror）为核心，HTML 为内容事实、markdown 为派生视图。本次改造按 12 项需求整体演进为：**markdown 源码为唯一事实 + CodeMirror 6 编辑器 + 右侧实时排版预览**，并从外部开源项目移植主题库、预览/大纲/flavor/导出能力，新增右侧 AI 对话 drawer。

### 需求点 → 方案映射

| # | 需求 | 方案归属 |
|---|------|---------|
| 1 | toolbar 三组图标间距 | **已取消**（用户指示：toolbar 已实现部分不变） |
| 2 | welcome-icon 去线框 | Phase 0 |
| 3 | ui-input-control 与 DESIGN.md 对齐，全控件审计 | Phase 0 |
| 4 | open-knowledge AI 对话框（点 AI 图标右侧滑出） | Phase 5 |
| 5 | ACKS / yituo-hub-studio / WeDraft 排版主题继承 | Phase 4 |
| 6 | quarkdown 集成分析 / 导出联动 | Phase 6 |
| 7 | TipTap → CodeMirror 6 | Phase 1 |
| 8 | 模式菜单 → 预览/代码/排版（左右分屏） | Phase 2 |
| 9 | backtickle 预览 + 大纲 | Phase 3 |
| 10 | meta-tabs 打开 md 才显示；默认 WelcomeScreen | Phase 0 |
| 11 | backtickle Markdown flavors + 新建菜单第 2 项改名 | Phase 0（菜单名）/ Phase 3（flavors） |
| 12 | backtickle 导出功能继承 | Phase 6 |

## 外部项目结论与许可

| 项目 | 许可证 | 处理方式 |
|------|--------|---------|
| masud90/backtickle | MIT | 直接移植（预览管线、大纲、flavors、导出、CM6 编辑增强） |
| pafa/WeDraft | MIT | 移植 7 款模板；参考其滚动同步实现 |
| shynloc/ACKS-Markdown-Editor | MIT | 移植 43 款主题 spec（19 ACKS + 24 Milestone） |
| inkeep/open-knowledge | GPL-3.0 | **不复制代码**，借鉴 UX（右侧滑出、流式对话、文档上下文），自研实现 |
| yan9651688/yituo-hub-studio | AGPL-3.0 | 用户已确认**接受 AGPL 署名移植**：保留原项目署名、在 THIRD_PARTY_NOTICES/LICENSE 注记中注明来源与 `motion/` 归蓝梦所有 |
| iamgio/quarkdown | JVM/Kotlin CLI | 不集成代码；仅做导出联动（检测本机 `quarkdown` CLI） |

## 设计决策

### D1 数据模型反转（Phase 1 的基石）

- `mdContent`（markdown 源码）成为唯一事实源；`htmlToMd` 往返链路废除。
- `editorStore`：文档以 markdown 存储（`docsMd`），HTML 仅作为导出/派生时生成。
- 工具栏按钮（粗体/斜体/标题/列表…）变为对源码的选择区包裹/取消语法（backtickle 命令逻辑移植）。
- 各对话框（表格/公式/图片/链接/代码/图表）改造为产出 markdown/扩展语片段插入源码。
- TipTap 及其 extensions 目录全部移除；CJK 自动空格、居中段落等特性在预览/导出层实现。
- 历史记录、AI 面板、SlashCommand 摘除 TipTap 依赖。

选用的 CM6 包：`@codemirror/lang-markdown`（含 GFM blend）、`@codemirror/language-data`、`@codemirror/commands`、`@codemirror/search`、`@codemirror/view/state`、`@lezer/highlight`。

### D2 三模式语义（Phase 2）

「模式」菜单三项改为：

- **预览模式**：左侧 CodeMirror 源码、右侧排版预览，左右分屏；wedraft 式滚动同步（编辑行 ↔ 预览块映射，双向定位）。
- **代码模式**：全宽源码（无右侧预览）。
- **排版模式**：现有样式界面改造成左右——左侧源码、右侧按当前内容样式主题渲染的预览，右侧保留样式面板入口；`style-panel`、`main-nav-float` 组件不动，只重排内容区。
- 阅读模式（read）不再出现在菜单中，但 `read-mode.css` 保留。

### D3 内容样式主题库（Phase 4）

统一收敛进现有 `typography-themes.ts` 参数化注册表，新增来源分组字段：

- 分组标签（内容样式面板新增二级 tab）：`全部 / 现行 / ACKS(43) / WeDraft(7) / yituo基础(18) / 高级排版(16)`。
- ACKS、WeDraft 主题 spec 直接移植。
- yituo 18 基础 + 16 高级排版：接受 AGPL 署名移植；高级排版的 L1–L6 分级矩阵与它们的静态/动态产物按需注册。

### D4 AI 右侧 drawer（Phase 5）

- 现有顶栏 AI 图标行为不变（toolbar 不改），点击后由浮动面板改为右侧滑出 drawer。
- 自研实现：drawer 容器 + 消息列表 + 流式回复 + 会话历史存 `aiStore`；自动携带当前文档（markdown 源码或选区）作为上下文；复用现有 `useAI` 与后端路由。

### D5 预览引擎 / 大纲 / flavors（Phase 3）

- 移植 backtickle 的 markdown-it 渲染管线（MIT）：flavors 自动检测 + 手动切换（CommonMark / GFM / Obsidian / Pandoc / Quarto / MDX）。
- KaTeX 数学、代码高亮（沿用现有 lowlight/highlight.js 资产）。
- 大纲：从源码解析标题树（参考 flavor 跳过代码块内 `#`），点击在 CM6 中定位；接入现有 SidebarOutline。

### D6 导出增强（Phase 6）

- 移植 backtickle：HTML 导出、打印/一键 PDF、Copy as HTML。
- Quarkdown 联动：导出菜单新增「Quarkdown HTML / PDF」入口，检测到本机安装 `quarkdown` CLI 即调用导出，未安装则提示安装命令。
- Word/EPUB/图片沿用现有导出服务，输入统一走 flavor 管线。

### D7 快修与边界（Phase 0）

- welcome-icon：移除线框容器背景，logo 直接显示。
- 控件审计：`ui-input-control` 及 ui-select/ui-switch/ui-button/ui-modal 等逐个对照 `/home/jingle/opc/DESIGN.md` §8/§10：补齐 focus 主色边框 + 外发光、暗色模式对比度。
- 文档未打开时内容区显示 `WelcomeScreen`；`meta-tabs`（DocumentMetaBar）仅在打开 md 文档时渲染。
- 「新建」下拉菜单第 2 项改名「新建文件-模板」，指向现有模板面板。

## 阶段划分与验收

| Phase | 内容 | 验收方式 |
|-------|------|---------|
| 0  | 快修项 | `npm run check` + 手动视觉核对 |
| 1  | CodeMirror 6 内核替换 | `npm run check` + 手动编辑回归；**在用户处验收后再继续** |
| 2  | 三模式改版 | 手动分屏滚动同步核对 |
| 3  | 预览引擎/大纲/flavors | 单测（flavor 渲染快照）+ 手动 |
| 4  | 主题库移植 | 主题预览缩略图核对 + 抽样渲染 |
| 5  | AI drawer | 手动对话/流式/上下文 |
| 6  | 导出增强 | 导出产物人工检查 |

执行顺序固定 0 → 1 →（用户验收）→ 2 → 3 → 4 → 5 → 6，后续 Phase 各自独立提交。

## 风险

- Phase 1 规模最大：工具栏命令、对话框、AI、历史、导入全要适配；建议 Phase 1 内部再拆任务。
- yituo AGPL 移植需在仓库 THIRD_PARTY_NOTICES 中完成后才可合入。
- 高级排版 L5/L6 动效依赖 yituo `motion/` 组件，按需内联体积可控，但要注册表级联。
