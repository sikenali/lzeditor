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

## 遗留

- `package-lock.json` 里还留着 `better-sqlite3` 的条目，需要跑一次
  `npm install` 才会被裁剪；这是有意的，避免为了删死依赖而制造大 diff。
- 文档树里目前没有重命名 / 删除文档的入口（`renameDoc` 只声明未使用）。
- 代码模式（直接编辑 markdown）里 `htmlToMarkdown` 的列表往返仍会把
  `- **加粗**` 折成两行，属于反向转换器的观感问题，未处理；
  富文本路径不受影响，因为 README 已改为以 HTML 为正文来源。
