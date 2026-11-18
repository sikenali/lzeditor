# ACKS 43 款排版主题移植 — 设计文档

> 日期：2026-11-18
> 范围：排版界面（StyleMainPanel）用 ACKS 渲染器完整继承 43 款主题；预览/阅读/导出沿用 LZEditor 管线、共享 ACKS 配色 token；字体全量打包（含中文）。
> 来源：https://github.com/shynloc/ACKS-Markdown-Editor

## 1. 意图与背景（为什么做）

LZEditor 现在只有 13 款手写的排版主题（`src/styles/typography-themes.ts`），每款是 `{ id, name, color, tag, css }`，`css` 是手调模板串，靠 `[data-typography-theme="X"] .preview-doc/.read-article-body/.export-preview-body` 作用域。用户希望**继承 ACKS 的 43 款主题**（19 ACKS + 24 Milestone），在排版界面直接展示（每页 10 个 + 左右箭头翻页），点选即生效。

**为什么不能只搬 CSS：** ACKS 的主题不是纯 CSS，而是一个完整渲染器。主题视觉很大一部分靠 JS 往 DOM 上挂 `data-hm / data-ci / data-layout / data-d / data-code` 等属性和装饰元素（`.md-orn`、`.md-seal`、`.md-dotbar`、引号蜡封/胶带/泼墨、分隔线 SVG 等），再配 CSS 变量 token 驱动的 `article.css` / `milestone-generated.css`。只搬 CSS + 调色板会丢掉全部装饰和特殊版式，无法"完整继承"。

## 2. 目标 / 非目标 / 反目标

**目标：**
- 排版界面完整呈现 43 款 ACKS 主题，点选即生效，效果与 ACKS 原版一致（含装饰、版式、竖排/海报）。
- 43 款替换现有 13 款。
- 默认主题 = `graphite`（瑞士阶构，黑灰、接近现在 classic 的黑白观感，视觉跳变最小）；旧存档 id 不在 43 款里则回退默认。
- 卡片按 `style-cards / style-card / style-card-thumb / style-card-preview[data-typography-theme] / style-card-name` 结构渲染，默认每页 10 个，左右箭头翻页。
- 预览 / 阅读 / 导出沿用 LZEditor 管线，但主题配色/字号/字体反映所选 ACKS 主题（共享 token，非完全一致）。
- 字体全量自托管（含 Noto Serif SC、Ma Shan Zheng 中文）。

**非目标：**
- 不移植 ACKS 的编辑器 UI、导入、存储、导出、文章柜。
- 不改 LZEditor 编辑器 / CodeMirror 分栏预览的 DOM 与滚动同步 / 大纲 / mermaid（沿用 LZEditor 管线）。
- 不追求预览 / 阅读 / 导出与排版界面逐像素一致（它们只共享 token）。

**反目标（失败标准）：**
- 排版界面滚动同步 / 大纲跳转 / 目录联动被 ACKS 渲染破坏。
- ACKS CSS 泄漏到非排版界面，影响编辑器 / 阅读 / 导出外观。
- 选择主题后预览 / 阅读 / 导出不随主题变化（token 未打通）。
- 离线环境字体缺失导致主题观感崩坏。

## 3. 约束

- **离线 Electron + 盒子零系统字体**：`/usr/share/fonts` 为空，Google Fonts CDN 在大陆不可达。所有字体必须自托管（见 §5.6）。ACKS 原版也不打包字体、依赖系统字体回退，所以**要忠实呈现必须自己打包**。
- TypeScript 严格（`noUnusedLocals` / `noUnusedParameters` 已开）；无 UI 库、纯手写 CSS。
- CSP：`script-src 'self'`（bundled JS 合规）；`img-src` 未锁死（装饰用内联 SVG data-URI 不受影响）。
- LZEditor 的 `mdToHtml`（`src/utils/mdToHtml.ts`）输出标准 Markdown HTML（blockquote/table/hr/pre/img/h1-6 存在），可作 ACKS `.md-doc` 的 DOM 来源。

## 4. 方案（已选定：C）

| 方案 | 说明 | 取舍 | 结论 |
| --- | --- | --- | --- |
| A | ACKS 渲染器用于排版 + 预览 + 阅读 + 导出全部视图 | 处处一致、最忠实；但改动最大，滚动同步/大纲/mermaid 全部要对位 ACKS DOM，移植面广 | 排除（用户未选） |
| **C** | **ACKS 渲染器只用于排版界面；预览/阅读/导出沿用 LZEditor 管线、共享 ACKS 配色 token** | 改动可控，滚动同步/大纲/mermaid 不受影响；预览/阅读/导出与排版界面有可见差异 | **选定** |
| B | 只搬 ACKS CSS + token，不搬 DOM 装饰 | 最轻；但丢装饰与 data-属性版式，无法完整继承 | 排除（无法满足"完整继承"） |

**字体策略：** 用户选定**全量打包含中文**——打包全部 11 款展示字体（西文 9 款 + 中文 Noto Serif SC、Ma Shan Zheng），中文标题也忠实。

**默认主题与迁移：** 用户选定默认 = `graphite`；旧存档 id（`classic`/`wechat-green`/`night`/…）不在 43 款 ACKS id 内则回退到默认。做法：`settingsStore.ts` 默认 `typographyTheme` 从 `'classic'` 改为 `'graphite'`；`getTypographyTheme`/`acksThemeToLzCss`/`applyTypographyTheme` 对未知 id 一律解析成 `graphite`（不逐 id 映射，点卡片后保存的是 ACKS id）。

## 5. 如何构建（各部件）

### 5.1 移植 ACKS 主题引擎到 `src/vendor/acks/`

从 ACKS 仓库复制以下**原始**文件（注意：`src/` 下部分是构建模板，真实数据由 `build.py` 注入，见 §5.2）：

| 文件 | 作用 |
| --- | --- |
| `theme-core.js` | MD 引擎：`buildTheme` / `THEMES` / `mixTheme` / `decoSVG` / `svgDataUri` / `bgTexture` / `luminance` / `mix` 等，写 `globalThis.MD` |
| `theme-revision.js` | 主题版本化（revision） |
| `theme-catalog.js` + 注入 profiles/signatures | 组装 43 款（19 ACKS + 24 Milestone）到 `MD.THEMES`，并填 `MD.SIGNATURES`、`MD.CATALOG_VERSION` |
| `theme-render.js` | DOM 装饰层：`paintTokens` / `applyDesignAttrs` / `applyDecorations` / `applyLayout` |
| `article.css` | `.md-doc[data-*]` 结构样式（标题标记、列表、代码、表格、引用、分隔线、装饰元素） |
| `milestone-base.css` / `milestone-generated.css` | Milestone `.ms-doc[data-milestone]` 结构样式 |
| `theme-revision.css` / `theme-catalog.css` | 版本化 + 目录样式 |

**加载与暴露：**
- `theme-core.js` → `theme-revision.js` → `theme-catalog.js`（生成 43 款）按序 import（IIFE 副作用，先建 `globalThis.MD`，后续用裸 `MD` 可解析）。
- **`theme-render.js` 不是 IIFE**（纯顶层函数声明，ACKS 用 `/*__THEME_RENDER__*/` 内联进 app.js）。vendor 时把它包成 IIFE 并把 `paintTokens`/`applyDesignAttrs`/`applyDecorations`/`applyLayout` 暴露到 `globalThis.ACKS_RENDER`（或从模块 export），供门面调用。
- `THEME_ASSETS` 是裸全局：ACKS `build.py` 把 3 张纹理 PNG（glass-ribbon/ink-gesture/paper-edge，共 ~2.3MB）base64 注入 `app.js` 的 `const THEME_ASSETS = {...}`，`applyDecorations`（v2）用 `<img data-theme-asset="…">` 但**不设 src**。vendor 时本地定义 `const THEME_ASSETS = { 'glass-ribbon': <dataURI>, 'ink-gesture': <dataURI>, 'paper-edge': <dataURI> }`（base64 内联或 Vite import URL），并补一个 `[data-theme-asset]` → src 解析步骤（见 §5.3）。
- 封装类型门面 `src/styles/acks-themes.ts`，导出：
  - `getAcksTheme(id): AcksTheme | undefined`
  - `ACKS_THEME_IDS: string[]`（43 个，含顺序）
  - `renderAcksArticle(host: HTMLElement, mdHtml: string, themeId: string): void` —— 见 §5.3
  - `acksThemeToLzCss(themeId: string, hostSelector: string): string` —— 见 §5.4
  - `acksThemeToLzTokens(themeId: string): ExportThemeTokens` —— 结构化 token，供 `exportService` 用（见 §5.4）

**TS 兼容：** vendored `.js` 用 `// @ts-nocheck` 头或排除出 `tsconfig` include；`.d.ts` 声明 `globalThis.MD` 最小子集：`THEMES`、`THEME_META`、`SIGNATURES`、`RECIPES`、`LEGACY_THEMES`、`buildTheme`、`mixTheme`、`stabilizeTheme`、`decoSVG`、`svgDataUri`、`bgTexture`、`luminance`、`mix`、`shade`、`tint`、`contrast`、`compact4`、`compactBorder`、`hexToRgb`、`rgbToHex`、`readingColor`。

### 5.2 数据来源（build.py 注入的复刻）

`theme-catalog.js` 源码里 `const profiles = []` 与 `const signatures = {}` 是占位符。`build.py` 用正则替换成真实数据：

```python
# build.py（ACKS 仓库）对应逻辑
catalog = re.sub(r'const profiles\s*=\s*\[\]; // MILESTONE_PROFILES',
                 lambda _: 'const profiles=' + read('src/milestone-profiles.json') + ';',
                 read('src/theme-catalog.js'))
signatures = json.loads(read('src/theme-signatures.json'))
catalog = re.sub(r'const signatures\s*=\s*\{\}; // THEME_SIGNATURES',
                 lambda _: 'const signatures=' + json.dumps(signatures, ensure_ascii=False) + ';',
                 catalog)
```

实现：vendor 时把 `src/milestone-profiles.json`（24 款 token）与 `src/theme-signatures.json`（签名元数据）也复制进来，在 vendor 的 `theme-catalog.js` 里**手动填入**这两份数据（或写一个小脚本生成最终的 `theme-catalog.generated.js`），保证 `MD.THEMES` 有全部 43 款、`MD.SIGNATURES` 有签名名（`applyDecorations` 依赖 `MD.SIGNATURES[t.signature]`）。

### 5.3 排版界面渲染（StyleMainPanel → ACKS 渲染器）

当前 `StyleMainPanel.tsx` 用 `dangerouslySetInnerHTML` 把 `mdToHtml(effectiveMd)` 塞进 `.read-article-body`。改为 ref 管理的 ACKS 渲染，**宿主用新容器 `.style-read-article`**（不再用 `.read-article-body`，避免与 LZ 的 token CSS 叠层，见 §5.4）：

```ts
// 伪代码：renderAcksArticle(host, mdHtml, themeId)
const t = getAcksTheme(themeId)   // 未知 id 已回退 graphite
const doc = document.createElement('section')
doc.className = t.milestoneKey ? 'ms-doc' : 'md-doc'
if (t.milestoneKey) doc.dataset.milestone = t.milestoneKey + '-' + (t.milestoneVariant || 'light')
doc.dataset.revision = String(t.themeVersion || 1)
doc.dataset.profile = t.editorialProfile || 'legacy'
doc.innerHTML = mdHtml                    // LZEditor mdToHtml 输出
// 补 ACKS 语义类（对应 ACKS fillArticle 的 class 追加 + article.css 用到的类）
doc.querySelectorAll('p').forEach(n => n.classList.add('md-p'))
doc.querySelectorAll('blockquote').forEach(n => n.classList.add('md-bq'))
doc.querySelectorAll('table').forEach(n => n.classList.add('md-table'))
doc.querySelectorAll('hr').forEach(n => n.classList.add('md-hr'))
doc.querySelectorAll('img').forEach(n => n.classList.add('md-img'))
doc.querySelectorAll('code').forEach(n => n.classList.add('md-ci'))
doc.querySelectorAll('pre').forEach(n => n.classList.add('md-pre'))
doc.querySelectorAll('li input[type=checkbox]').forEach(...) // md-task
applyDesignAttrs(doc, t)                  // data-hm/data-ci/data-layout/data-d/data-code...
applyDecorations(doc, t)                  // 装饰 SVG 元素 + <img data-theme-asset>
applyLayout(doc, t)                       // 版式（如竖排）
resolveThemeAssets(doc)                   // [data-theme-asset] -> 本地 THEME_ASSETS URL（§5.1）
paintTokens(doc, t)                       // CSS 变量 token（--bg/--text/--accent/...）
host.replaceChildren(doc)
// 注入 ACKS 主题 CSS（article.css + milestone-base + milestone-generated + theme-revision + theme-catalog）
// 到独立 style 节点 id="lz-acks-theme-css"，仅当排版界面挂载时存在
```

要点：
- **DOM 来源用 LZEditor 的 `mdToHtml`**，不搬 ACKS 的 `markdownHTML`/`cleanHTML`（LZEditor 管线已含方言检测 + KaTeX + 高亮 + DOMPurify）。
- ACKS CSS 全局作用域是 `.md-doc` / `.ms-doc[data-milestone]`，而这两个类**只出现在排版界面的 `.style-read-article` 里**，所以全局注入不会污染编辑器/阅读/导出。
- **`.style-read-article` 被排除在 `acksThemeToLzCss` 之外**（后者只打 `.preview-doc`/`.read-article-body`/`.export-preview-body`/`.lz-editor-content`），保证排版界面 = 纯 ACKS 原版，不受 LZ token CSS 干扰。
- 排版界面的 `fontSize`（阅读字号）不再直接控制字号，改由 ACKS `bodySize`/`lineHeight` token 决定（`paintTokens` 已写入）；`readFontSize` 状态可保留但不再作用于排版界面。
- 大纲跳转 / 章节导航：ACKS 渲染的标题是否带 id 取决于 LZEditor `mdToHtml` 是否生成锚点 id。若 LZEditor 的 heading id 保留，章节导航/`activeTocId` 继续可用（`useScrollSpy`/`getOutlineJumper` 的容器 ref 需从 `.read-article-body` 改指 `.style-read-article`）；否则需在 `applyLayout` 后补 id（计划内验证）。
- mermaid：`mdToHtml` 已渲染 mermaid 占位/图，ACKS 包裹不破坏；若需 ACKS 装饰重扫，计划内验证。

### 5.4 预览 / 阅读 / 导出共享 token（acksThemeToLzCss + acksThemeToLzTokens）

保留 `TypographyTheme` 接口与 `getTypographyTheme`/`applyTypographyTheme`/`[data-typography-theme]` 机制（`SidebarPreview`、`ExportDialog`、`ContentStyleTab`、`useTheme` 依赖），但把 **13 款手写主题替换为 43 款由 ACKS token 生成的通用 CSS**。**作用域只打 `.preview-doc` / `.read-article-body` / `.export-preview-body` / `.lz-editor-content`，不打排版界面的 `.style-read-article`**（后者是纯 ACKS 原版）：

```ts
// acksThemeToLzCss(themeId, hostSelector) -> string
// 从 ACKS theme 的 bg/text/heading/accent/quoteBg/quoteText/quoteBorder/
// codeBg/codeText/codeBlockBg/codeBlockText/thBg/thText/zebra/h1-h4/
// bodySize/lineHeight/letterSpacing/fontFamily/headingFamily 生成：
// hostSelector { color:text; font-family:fontFamily; ... }
// hostSelector h1 { color:heading; font-size:h1; font-family:headingFamily }
// hostSelector blockquote { border-color:accent; color:quoteText; background:quoteBg }
// hostSelector code { background:codeBg; color:codeText }
// hostSelector pre { background:codeBlockBg; color:codeBlockText }
// hostSelector th { background:thBg; color:thText }
// hostSelector table tbody tr:nth-child(even) { background:zebra }
// ... 生成到 4 个宿主选择器
```

- 这是**通用映射**，不手写 43 份；颜色/字号/字体忠实，装饰不在此层（预览/阅读/导出无 ACKS 装饰，符合方案 C 的"共享 token、非完全一致"）。
- `getTypographyTheme(id)` 返回 `{ id, name, color: accent, tag, css: acksThemeToLzCss(id, hosts) }`；**未知 id 回退 graphite**。
- `applyTypographyTheme(id)` 仍注入 `css`（现在来自通用映射）。

**导出（`exportService`）需结构化 token，不能只靠 CSS 字符串：** `exportService` 现在用硬编码 `TYPOGRAPHY_THEME_VARS`（键为旧 13 id，未知 id 回退 `classic`）。换 43 款 ACKS id 后必须打通，否则导出/PDF 全部回退默认（反目标）。新增：

```ts
// acksThemeToLzTokens(themeId) -> { overlay, primary, text, muted, heading, code, border, amber }
// 由 ACKS token 派生：primary=accent, text=text, heading=heading, code=codeText,
// border=mix(bg,text,0.19), muted=quoteText, overlay=mix(bg,accent,0.12), amber=accent
```

并把 `exportService` 的 `getCSSVars`/`TYPOGRAPHY_THEME_VARS` 改成走 `acksThemeToLzTokens`（键为 ACKS id，未知回退 graphite）。导出的 `buildStyledHTML`/`exportPDF` 不需要 `.export-preview-body` 包装，直接消费结构化 token。

### 5.5 43 款卡片 + 分页

`StyleMainPanel.tsx` 的 `style-cards` 区改为分页：

```tsx
const PAGE_SIZE = 10
const [page, setPage] = useState(0)
const totalPages = Math.ceil(ACKS_THEME_IDS.length / PAGE_SIZE)   // 43 → 5
const pageItems = ACKS_THEME_IDS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
// 左右箭头按钮：disabled = page===0 / page===totalPages-1；onClick 切换 page
// 页码指示：<span>{page+1}/{totalPages}</span>
// 卡片：pageItems.map(id => ...) 同现有 style-card 结构，data-typography-theme={id}
```

- 卡片点击：`setActiveStyle(id)` + `updateSetting('typographyTheme', id)` + `renderAcksArticle(host, mdHtml, id)`（排版界面）+ `applyTypographyTheme(id)`（预览/阅读/导出）。
- 卡片 `name`/`color`：`name` = ACKS theme `name`（或 `nameZh`）；`color` = `t.accent`。
- **卡片用用户提供的 mini-mock 结构**（`style-card-thumb` + `style-card-preview[data-typography-theme]` + 名称/二级标题装饰/正文·代码/引用），颜色从每个 ACKS 主题的真实 token 取（`bg`/`accent`/`text`/`codeBg`/`codeText`），使 43 张卡片可区分、能暗示各主题观感。**不做 43 份真实 ACKS mini 渲染**（那是额外的大 DOM 成本，且用户明确提供了 mock 结构；真实效果由点选后在正文区呈现）。

### 5.6 字体全量打包

新增 `src/assets/fonts/` 子目录 + `@font-face`（追加到 `src/styles/fonts.css`），自托管以下 11 款（Google Fonts 静态 woff2 或 variable）：

- 西文：`Lora`、`Playfair Display`、`EB Garamond`、`Cormorant Garamond`、`Space Grotesk`、`DM Sans`、`Archivo`、`Anton`、`Source Serif 4`
- 中文：`Noto Serif SC`（variable，wght 100-900）、`Ma Shan Zheng`（单 weight）

下载源在开发机一次性拉取并提交进仓库（离线/大陆 CDN 不可达，不能运行时外链）。字体文件名 / unicode-range 策略沿用现有 `fonts.css` 惯例（Inter/JetBrains Mono 按 unicode-range 分子集，Noto Sans SC 用 variable 单文件）。

## 6. 留给实现者 / 风险

- **构建占位符**：vendor 时必须复刻 `build.py` 的 profiles/signatures 注入，否则 `MD.THEMES` 不完整、`MD.SIGNATURES` 为空导致 `applyDecorations` 抛错。实现时先用 node 跑一遍确认 43 款齐全。
- **DOM 兼容**：计划第一步先验证 `mdToHtml` 输出含 blockquote/table/hr/pre/img/h1-6 且无冲突包装类；必要时在 `renderAcksArticle` 里做归一。
- **纹理 PNG / `THEME_ASSETS`**：`bgMode:'texture'` 与 v2 装饰的主题（`y3k`/`collage`/`zen`/`receipt`/`song-ink`/`guochao`/`dreamglow`）依赖 `THEME_ASSETS` 里的 3 张 PNG（glass-ribbon/ink-gesture/paper-edge，~2.3MB）。用户已选全量打包，vendor 时把 3 张 PNG base64 内联进本地 `THEME_ASSETS`（或 Vite asset URL），并写 `resolveThemeAssets`（`[data-theme-asset]` → src）。若暂不打包，这些主题回退纯色/无装饰（记录为已知限制）。
- **导出打通**：`exportService` 的 `TYPOGRAPHY_THEME_VARS`/`getCSSVars` 必须改用 `acksThemeToLzTokens`，否则导出/PDF 回退默认（反目标）。
- **默认主题**：`settingsStore.ts` 默认 `typographyTheme` 改为 `'graphite'`；所有 `|| 'classic'` 用法改 `|| DEFAULT_TYPOGRAPHY_THEME`；未知 id 统一回退 graphite。
- **TS 严格**：vendored JS 需 `@ts-nocheck` 或排除；`globalThis.MD`/`globalThis.ACKS_RENDER`/`THEME_ASSETS` 类型最小子集。
- **CSS 体积**：ACKS CSS ~130KB 全局注入；仅排版界面 `.style-read-article` 内存在 `.md-doc`/`.ms-doc`，无泄漏风险，但确认不误伤其它 `.md-*` 前缀选择器（LZEditor 无同名类，低风险）。
- **大纲/章节/滚动**：排版界面改用 ACKS DOM 后，`parseMdOutline`/`getOutlineJumper`/`activeTocId` 与标题 id 的对应需回归验证（LZEditor `mdToHtml` 的 heading id 是否保留；`useScrollSpy` 容器 ref 改指 `.style-read-article`）。
