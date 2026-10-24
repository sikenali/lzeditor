# 2026-10-18 lzeditor 待办修复

## 验证方式

不再只做 `tsc --noEmit`。用 Playwright 无头 Chromium 真正启动前端、加载页面、
模拟真实用户操作，六组探针全绿，全程无 `pageerror` / `console.error`：

```
20/20 runtime checks passed      console / page errors: (none)
reset-probe     17 项全 PASS     errors: (none)
readme-persist  6 项全 PASS      errors: (none)
anchor-probe    5 项全 PASS      errors: (none)
crosslink-probe 4 项全 PASS      errors: (none)
library-probe   6 项全 PASS      errors: (none)
fences-probe    内置文档 20/20 标题完整，errors: (none)
```

另外 `npx tsc --noEmit`（根与 `server/`）零报错，`npm run build` 正常产出。
harness 脚本在 `/tmp/opencode/harness/`（`runtime.mjs` 全量回归、
`anchor-probe.mjs` 锚点跳转专项、`reset-probe.mjs` 内置文档还原、
`readme-persist.mjs` README 持久化、`key-probe*.mjs` 按键事件探测）。
启动方式：`npm run dev:web` + `chromium-1243`。

## 覆盖的运行时场景

编辑器渲染 · 标题锚点 id 存在且全文唯一 · 代码块以 `<pre>` 节点插入 ·
图表插入 data-url 图片节点 · `allowMarkdownSymbols` 选中按 `*` 加粗 ·
Ctrl+Alt+2 → h2 · 编辑器内新建标题自带锚点 id · Ctrl+Enter 硬换行 ·
`spellCheckLang` 落到 `<div>` 的 `lang` 属性 · 快捷格式按钮开关 ·
行号开关 · 非法正则给中文提示 · AI 面板无 key 时不崩且可关闭 ·
自定义强调色走原生 `input[type=color]`（不再弹 `prompt()`）且即时生效 ·
DOCX 导出诚实标注 · 1500px 视口下工具栏完整排下、末位按钮可达。

## 本次修掉的真实 bug

| 文件 | 问题 |
| --- | --- |
| `src/utils/mdToHtml.ts` | **列表正则跨行吞内容（最严重）**：`/^[\s\S]*?[-*+]\s+(.+)$/gm` 里的 `[\s\S]` 能跨行，正则从行首一路吃到全文第一个 `- `/`* `/`+ `/`1.`，把前面所有 `<h1>`/`<h2>`/正文当「前导内容」整体吃掉。所有带列表的文档（A03、B07…README）标题全丢、结构错乱。已改成 `^[ \t]*` 只允许行内缩进 |
| `src/utils/mdToHtml.ts` | 标题锚点 id 生成错误：中文标题会被压成 `''` 导致同名标题全部重复；已改为单次扫描 + 全局去重（`-2`/`-3` 后缀） |
| `src/components/editor/extensions/StyledInsertAttributes.ts` | **锚点 id 被 ProseMirror 丢掉**：`heading` 节点没有声明 `id` attr，`editor.getHTML()` 序列化时 id 消失，页内跳转与内链全部失效。已补 `addGlobalAttributes` |
| `src/components/editor/extensions/HeadingAnchors.ts`（新增） | 编辑器里用快捷键/菜单新建的标题没有 id，内链指不到。新增 PM 插件在每个事务后统一校正 `heading.id` 并去重 |
| `src/App.tsx` | `Ctrl+Enter` 调用 `hardBreak()`，TipTap v3 里命令已改名 `setHardBreak`，每次按都抛 `is not a function`；已改 |
| `src/App.tsx` | `Ctrl+Alt+1..6` 重复绑定：App 自己绑一次、Heading 扩展自带 `Mod-Alt-N` 又绑一次，两次 toggle 互相抵消，净效果是「按了没反应」。已删掉 App 侧重重复绑定 |
| `src/App.tsx` | **编辑器内同文档锚点点了不跳转**：Chrome 在 `contenteditable` 内不执行 fragment 导航。已加 `#anchor` 分支，`preventDefault` + `scrollIntoView` + 更新 hash + 高亮大纲 |
| `src/components/panels/LibraryPanel.tsx` | **20 篇内置使用手册全部不可达**：`flatDocs` 里 `!d.system` 把标了 `system` 的 A01–B10 整包过滤掉，用户除了「关于」页第一篇文章外一篇都打不开（手册各篇之间也没有互相跳转的链接）。已移除过滤 |
| `src/components/panels/LibraryTree.tsx` | 文档节点用 `id.startsWith('doc-')` 判断，手册 id 是 `a01-特色功能` 这类，会被当成**文件夹**渲染成点不开的空条目。已给节点加显式 `isDoc` 标记 |
| `src/components/panels/LibraryPanel.tsx` | 手册分组默认折叠，等于还是藏起来。已改成初始展开 |
| `src/styles/globals.css` | 锚点跳转没有给 72px 吸顶工具栏留位，标题会被压住。已给编辑区/阅读区标题加 `scroll-margin-top: 90px` |
| `src/components/editor/LZEditor.tsx` | `onUpdate` 对 readme 也做 `htmlToMarkdown` 往返，把 `**加粗**` 错拆成标题、丢原始 HTML，与 `onCreate` 的注释意图相悖。现已改为：往返结果只当派生视图用，不进 `docsMd`（见下方同文件的后续条目） |
| `src/styles/layout.css` | 20 个固定宽度工具栏按钮在 ≤1690px 视口整排溢出，「导出/设置」被推出可视区且不可点。已按断点收窄（66/56/48px） |
| `README.md` / `src/content/readme.md` | 文案与实现不符：后端早就不再用 `better-sqlite3`/`bcrypt`，实为 JSON 文件 + SHA-256 加盐。已改正徽章、架构段与架构图 |
| `package.json` / `server/package.json` / `server/src/types.d.ts` | **死依赖**：`better-sqlite3` 与 `@types/better-sqlite3` 源码里已经没有任何引用（服务端改 JSON 文件存储），但依赖还在。原生编译依赖最容易被 LPK 的 `allowScripts` 卡住导致装不上。已连同 `allowScripts` 条目和模块声明一起删掉 |
| `src/utils/cleanContent.ts` | **把整篇文档删空的 `stripReadFrogNodes`（第二严重）**：写 TreeWalker 时用 `acceptNode` 返回 `FILTER_REJECT` 表示「要删」、返回 `FILTER_ACCEPT` 表示「保留」，然后在 `nextNode()` 遍历结果里收集**所有返回值的节点**去删 —— 判定与删除逻辑完全接反。结果任何一次 `onUpdate` 存盘都把文档内容清空，`lzeditor-doc-*` 里 `md` 与 `html` 都是空串，用户的编辑全丢、历史版本恢复等于回到空白。改成按 `data-read-frog-` 属性显式筛选节点 |
| `src/components/editor/LZEditor.tsx` | **每次挂载都删掉 README 的本地覆盖**：`useEffect(() => localStorage.removeItem('lzeditor-doc-readme'), [])` 挂着「始终从 readme.md 读干净内容」的注释，实际效果是用户改完 README、一刷新就回到出厂文案，编辑白敲。已删除该 effect，要恢复出厂走文档树的重置按钮 |
| `src/components/editor/LZEditor.tsx` | **onUpdate 对 readme 不写 localStorage**：`docId !== 'readme'` 把 README 的保存跳过了，等于「只有 README 这一篇编辑不会存」。已放开，与内置使用手册一致 |
| `src/components/editor/LZEditor.tsx` | `onCreate` / `onUpdate` / `handleCodeModeChange` 里对 readme 一律写「原始的 README_CONTENT」再进 `docsMd`，覆盖用户刚改的内容。README 的 markdown 现在是**派生视图**，不进 `docsMd`，避免被当成正文来源反复回写 |
| `src/utils/docSource.ts` | `getDocHtml('readme')` 固定返回 `''`，README 的渲染永远走 markdown 往返。现在改为：有本地覆盖就用存的 HTML（`readme` 与 `welcome` 除外），README 改了什么就显示什么，往返不再破坏正文 |
| `src/utils/docSource.ts` | `isBuiltinDoc` 只认 A01–B10，README 不在其中，所以没有「还原出厂」入口。已把 `readme` 纳入；`getDocMd` 在无本地覆盖时可从 HTML 派生 markdown 兜底 |
| `src/components/panels/LibraryTree.tsx` | **当前打开的文档完全没高亮**：`isActive` 写成 `node.id === docs.find(d => d.id === node.id)?.id`，等式右边恒等于左边，21 篇文档全部长着一样的「已打开」样式，用户在树里看不出自己正在看哪篇。改为比较 `activeDocId` |
| `src/components/panels/LibraryTree.tsx` | 重置按钮的条件写成 `node.system \|\| node.id === 'readme'` 时，顺手把说明用了 `//` 行注释写在 JSX 里 —— `//` 在 JSX 中是纯文本，结果每个文档条目都多出一段 `// node.system 覆盖使用手册…` 的字样。已改成 `{/* */}` |

## 新增的运行时探针

除全量回归外还补了五个专项探针（同样在 `/tmp/opencode/harness/`）：

- `anchor-probe.mjs` — README 17 个标题 id 唯一，同文档锚点点击真能把标题滚到可视区（scroll 0 → 9720，落到 y=209 即工具栏下方）
- `library-probe.mjs` — 手册 A01–B10 全部列在树里、分组默认展开、搜索能找到、点开有真实内容和标题 id
- `crosslink-probe.mjs` — 跨文档链接切文档、跨文档 + 锚点定位章节、手册内的同文档锚点跳转
- `reset-probe.mjs` — 内置文档可编辑且刷新后仍在；重置按钮一键还原出厂内容、清掉本地覆盖、刷新后不再回弹；21 篇内置文档都有重置按钮、用户自建文档没有；README.md 同样可编辑可还原；树里不泄漏注释文本、只高亮当前打开的一篇
- `readme-persist.mjs` — README 的编辑落盘、切走再切回仍在、刷新后仍在、阅读模式能看到改动，且往返后居中段落 / 代码块 / 标题结构没被弄坏
- `fences-probe.mjs` — 三反引号 / 四反引号 / 波浪线围栏、嵌套围栏不提前闭合、未闭合围栏不吞掉后面内容、未闭合时标题仍能正常出锚点；并逐篇核对 20 篇内置文档源码里的标题数与渲染结果一致

服务端改动后额外验证：`PORT=3102 npx tsx src/index.ts` 正常起服务，
`GET /api/settings/check` → `{"exists":false}`，
`GET /api/settings/providers` → `{"providers":[]}`。

## 排查过程中的两个坑（记录给下次）

1. `addInitScript` 里的 `localStorage.clear()` 在每次 `reload()` 前都会重跑，
   会把注入的 settings 又清掉 —— 必须用持久化的哨兵 key 只清一次。
2. ProseMirror 的 `appendTransaction` 只收 3 个参数（`trs, oldState, newState`），
   文档里的 5 参数签名是错的；而且它**只接受单个 Transaction**，
   返回数组会在 `tr.setMeta is not a function` 上崩。
3. `page.evaluate` 里 `await import('/src/store/editorStore.ts')` 拿到的是
   **全新的 store 实例**，`getState().editor` 恒为 `null`，看着像「应用没注入编辑器」。
   在页内取编辑器要走 DOM：`document.querySelector('.ProseMirror').editor`。
4. 键盘输入前先等编辑器内容长度连续 3 次采样不变（约 750ms）。
   初始化阶段还有 `setContent` 在跑，抢跑会把字符打进半截的文档里被覆盖，
   然后误判成「编辑没保存下来」。
5. 文档库面板选中文档后会收起并播完关闭动画才把节点移出 DOM，
   「面板是否开着」必须用 `waitForSelector` 重试，不能数一次就下结论；
   树底部的重置按钮常落在视口外，Playwright 点不动，改成对 DOM 元素直接 `.click()`。

## 第 4 轮：上线前全量校验（2026-10-18）

探针脚本 `pre2.mjs`，30 项全绿；同时回归了已有六组探针：

```
pre2           30/30              errors: (none)
runtime        20/20              errors: (none)
fences-probe   内置手册 20/20      errors: (none)
anchor-probe    5/5               errors: (none)
readme-persist  6/6               errors: (none)   aligned=10
crosslink-probe 4/4               errors: (none)
npm run build  ✓ built in 40.75s
tsc --noEmit   0 error（root + server 各自 tsconfig）
```

### 安全性：补上缺失的消毒层

`src/utils/mdToHtml.ts` 与 `src/utils/mdWithMath.ts` 都会把 markdown 里的原始 HTML
原样带出，而预览 / 阅读 / 导出 / 历史快照共 9 处是 `dangerouslySetInnerHTML` 直插，
之前没有任何一层过滤。存一份 `<img src=x onerror=...>` 或 `<script>` 进文档，
每次打开预览就会执行。

新增 `src/utils/sanitizeHtml.ts`（DOMPurify 3.4.15），只在两个咽喉口各做一次：

- `mdToHtml()` 入口
- `renderMdWithMath()` 里 **remark 之后、katex 之前**

属性白名单只做加法。默认配置已放行 `align` / `checked` / `disabled` / `data:` 图片，
图表导出的 base64 图片不会被误删。实测保留项：`<p align="center">`、表格、
代码块、`<input type="checkbox" checked disabled>`（已完成任务）、标题锚点 `id`。

历史快照、表格单元格编辑这两处不经过上述咽喉口，单独消毒。

### 修好的真 bug

1. **`renderMdWithMath` 的行内公式从来没生效过。**
   占位符用的是 `__INLINE_0__`，连续下划线被 remark-gfm 当成加粗语法，
   占位符被渲染成 `<strong>INLINE_0</strong>`，后面 `split('__INLINE_0__')`
   永远匹配不到，公式就永远替换不回去。改用 Unicode 私有区字符
   `\uE000` 包裹，既不可能出现在用户文本里，也不带任何 markdown 语义。

2. **居中段落在编辑器往返后丢失。**
   `mdToHtml` 保留了 `align`，但 ProseMirror 的 paragraph 节点没有 `align`
   属性，解析时直接丢掉，保存后居中就再也回不来。
   在 `StyledInsertAttributes` 里给 `paragraph` 声明 `align` 全局属性。
   实测 readme 往返后 `aligned=10` 全部保留。

3. **`npm run build` 本来就是失败的。**
   root `tsconfig.json` 的 `include` 含 `server/src`，而
   `server/src/routes/chat.ts:91` 的 `resp as AsyncIterable<any>` 是 TS2352：
   Anthropic SDK 的 `create()` 按 `stream` 重载，传 `as any` 时被解析成
   非流式的 `Message` 返回类型。显式把 `resp` 标注成 `any`。

### 性能

- `SidebarOutline`：把 `refresh()` 从 `selectionUpdate` 上摘掉。之前每挪一次
  光标就整篇重算一遍大纲；现在内容变更才 `collectOutline`，光标移动只算
  「当前在哪个标题里」。`outlineItemsForSpy` 的 `items.find()` O(n²) 换成
  `level|text` 的 Map 查找。
- `LZEditor`：删掉没人用的 `renderedHtml`（每次击键白跑一次 remark + katex）；
  行号块改用 `useMemo([showLineNumbers, lineCount])`，
  200 个 span 的 JSX 构建不再跟着每次击键重跑。
- `SidebarPreview`：删掉那个 `MutationObserver`。它监听 ProseMirror 的 DOM 变更，
  每次击键在 rAF 里把同一份 HTML 又写一遍 `innerHTML`；
  上一行那个 effect 已经在 `previewHtml` 变化时做过同样的事。

### 冗余清理

- **`dist/` 从版本库移除**（1979 个文件、21 MB 构建产物，本就在 .gitignore 里，
  之前是强制加进去的）。`.gitignore` 同时补了 `electron/*.js`、`electron/*.d.ts`，
  并清掉重复条目。
- **Electron 构建产物出库**：`main.js` / `main.d.ts` / `preload.js` / `preload.d.ts`。
  `electron/window.d.ts` 直接删——没有对应的 `window.ts` 源码，也没有任何引用。
- **死依赖**（共 15 个）已从两个 package.json 移除，且全项目零引用：
  前端 `mermaid`、`@hpcc-js/wasm`、`viz.js`、`@markdown-viewer/draw-uml`、
  `@markdown-viewer/drawio2svg`、`plantuml-encoder`、`framer-motion`、
  `react-markdown`、`@tiptap/extension-list`、`@tiptap/extension-bubble-menu`、
  `@tiptap/extension-floating-menu`、`file-saver`、`remixicon-react`；
  服务端 `bcryptjs`、`@types/bcryptjs`。
  注意 `mermaid` 在 `b06-图表.md` 里只作为代码块语言标签出现，
  项目里没有任何按语言标签渲染图表的代码路径。
- **死文件**：`Math.tsx`、`shared/languages.ts`、`types/page-flip.d.ts`、
  `styles/neon-theme.css`、`styles/ai-components.css`、`scripts/scan{,2,3}.mjs`。
- **死 store setter**：`setDocPath`、`setPanelOpen`、`setCodeModeCursor`、
  `clearVersions`、`renameDoc` —— 各只剩「类型声明 + 实现」两处，无任何调用方。
- `src/vite-env.d.ts` 只删死模块声明（`react-katex`、`plantuml-encoder`、`viz.js`、
  `file-saver`）。**这个文件本身必须保留**：它带 `/// <reference types="vite/client" />`，
  还声明了 `jszip`（`epubGenerator.ts` 在用），删了整个文件会让构建直接失败。
- 补上遗漏的依赖：`tailwindcss`、`wait-on` 加入 devDependencies
  （`globals.css` 里 `@import 'tailwindcss'` 之前只是 phantom 依赖），
  删掉无用的 `tailwind.config.ts`。

### 遗留

- `package-lock.json` 里还留着 `better-sqlite3` 的条目，需要跑一次
  `npm install` 才会被裁剪；这是有意的，避免为了删死依赖而制造大 diff。
- 死依赖同理：package.json 已清干净，但 node_modules 和 lockfile 未裁剪。
- 代码模式（直接编辑 markdown）里 `htmlToMarkdown` 的列表往返仍会把
  `- **加粗**` 折成两行，属于反向转换器的观感问题，未处理；
  富文本路径不受影响，因为 README 已改为以 HTML 为正文来源。
- `codeModeCursor` 恒为 0：`App.tsx` 读它来定位代码模式的插入光标，
  但从来没有任何代码写它（`setCodeModeCursor` 无调用方，本轮已删）。
  所以代码模式插入总是落到位置 0。这是既有问题，删 setter 没有改变行为。
- 服务端 `/api/settings` 与 `/api/chat` 前端从未调用过，路由仍在。
