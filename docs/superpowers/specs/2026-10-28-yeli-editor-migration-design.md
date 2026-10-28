# 设计：移除 CodeMirror 6，继承 yeli 区块编辑器

日期：2026-10-28
状态：已确认（用户批准全部 5 节）
方案：A —— Vendor yeli 编辑器核心 + 自建 React 外壳 + Facade 边界

## 背景与目标

LZEditor 当前编辑器为 CodeMirror 6（`src/components/editor/codemirror/` 约 3900 行扩展 + CM6 外壳）。目标：

- **去掉 CodeMirror 6**，删除其代码与全部依赖。
- **编辑体验整体替换**为 yeli（https://github.com/whitesmell/yeli，MIT）的区块所见即所得（source-mapped WYSIWYG block projection）编辑器。
- 周边功能对接：AI 流式写作、导出、搜索/历史/目录、mermaid/KaTeX/echarts 渲染、设置、Electron 层等全部保留。

用户已确认的决策：
- 目标：换掉编辑体验（非仅去依赖）。
- 必须保留：输入辅助全家桶（智能粘贴/自动配对/打字机/专注模式）、区块内特效渲染（mermaid/KaTeX/echarts/代码高亮）、AI 接入点重接。斜杠菜单可后置。
- 数据格式：保持 lzeditor 现状（.md + 本地存储/文件系统），只换编辑器层。
- 迁移策略：硬切换（不保留 CM6 后备）。
- 集成方案：方案 A（vendor + 自建外壳 + facade）。
- React 版本：A1，升级 lzeditor 到 React 19，vendor `edit-canvas.tsx` 原样。

## 第 1 节：Vendor 范围与 React 版本

### Vendor 范围（`src/vendor/yeli/`，MIT 保留署名）

| 层 | 内容 | 是否 vendor |
|---|---|---|
| 纯逻辑数据层 | `src/editor/*`（block-projection、source-ranges、markdown-lines、command-registry、commands、footnotes、outline、search-index、table-commands、presentation）+ `src/document/`（store、transactions、model、schema、frontmatter、freshness、title） | 是 |
| 渲染边界 | `src/render/*`（markdown-it + DOMPurify 净化的只读渲染） | 是 |
| 编辑体验 | `src/ui/edit-canvas.tsx`（97KB React 外壳，区块 WYSIWYG 交互） | 是（React 19 原样） |
| 外壳依赖 | i18n / brand / styles.css / 其他 dialog | 否（用 lzeditor 的 UI） |

### React 版本：A1 —— 升级 lzeditor 到 React 19

- `react`、`react-dom` → 19.x；`@types/react`、`@types/react-dom` → 19.x。
- vendor `edit-canvas.tsx` 原样，编辑体验最贴近上游，日后好同步。
- 代价：React 18→19 升级波及整个 app；需验证 `echarts-for-react`、`emoji-picker-react`、`react-katex`、`@vitejs/plugin-react` 兼容性，不兼容则升级版本或替换实现。
- React 19 升级作为**独立前置步骤**单独验证（`npm run dev` 全量 + 控件回归全绿）再进入编辑器替换。

## 第 2 节：Facade 边界与数据流

yeli 编辑器的源文保真机制（revisioned store + source-range 索引 + hash 校验 + revision-bound 投影）要求一切改动都走类型化、range-aware 的事务，不能绕过直接改字符串。

```
lzeditor 周边（App/AI/导出/特效渲染/editorStore）
        │  markdown 字符串（进出）
        ▼
YeliEditorFacade  ◄── 唯一对外 API
   ├─ setText(md)              // 载入文档
   ├─ getText(): md            // 保真后的当前 markdown
   ├─ onChange(cb)             // 编辑事务提交 → 回吐 md + 元信息
   ├─ insertText / replaceRange / insertBlock / insertCodeBlock / insertFormula
   ├─ getSelection / setSelection / focus / scrollToBlock
   ├─ undo / redo
   └─ execCommand(name, args)  // 透传 yeli command-registry
        │
        ▼
yeli 数据层（store + transactions + command-registry + block-projection）  ←─ vendor
        ▼
edit-canvas.tsx（区块 WYSIWYG 渲染）  ←─ vendor，React 19
```

数据流要点：
1. **编辑**：edit-canvas 每次事务走 yeli revisioned store → facade `onChange` 只回吐保真后的 markdown 字符串 → lzeditor editorStore 照旧更新，历史/自动保存/导出/AI 复用现有逻辑，不改周边数据流。
2. **外部写入**（AI 流式、插入公式/代码块、导入文档）：一律通过 facade 的 typed 操作（`insertText`/`insertCodeBlock` 等）进入 yeli 事务管线，**绝不直接 setText 覆盖**；流式插入尤其要逐段走事务，否则 projection 失效。
3. **载入**：仅首次打开文档用 `setText`（整串载入建 store），之后只走事务。
4. **周边不感知 yeli 内部模型**：editorStore 仍纯 markdown + 元数据；yeli 的 document model 封在 vendor 层内，不泄漏类型。

## 第 3 节：必须保留功能的适配

### 3.1 输入辅助全家桶（智能粘贴 / 自动配对 / 打字机跟随 / 专注模式）

- 自动配对：拦截 keyboard 事件层挂 facade，`(`/`[`/`"` 等键走 `insertText` 事务。
- 智能粘贴（图片/URL/表格 → 结构化）：挂 paste 事件，检测 clipboard 内容类型后转成 yeli 事务（插图片块、插链接、插表格）。
- 打字机跟随 / 专注模式：纯视角特性，监听 facade selection 变化做滚动定位 + CSS class 切换，不触碰数据层。

### 3.2 区块内特效渲染（代码高亮 / KaTeX / mermaid / echarts）

yeli 自身把 mermaid/KaTeX/echarts gate 掉（不内置）。在 vendor 渲染边界上做渲染器扩展：

- 自定义 markdown-it 规则识别 ` ```mermaid `、`$$...$$`、` ```echarts ` 代码块，渲染成惰性容器。
- 由 lzeditor 自己的渲染钩子（已有 highlight.js/KaTeX/mermaid/echarts 代码）挂入。
- 渲染仍走 DOMPurify 净化。
- **编辑器画布内保持惰性**：编辑时这些块按 yeli raw block 呈现，不实时跑 mermaid 重算（避免 typing 抖动），聚焦/离开时再渲染。
- ReadMode 导出路径自足，不受影响。

### 3.3 AI 接入点重接

App.tsx 现有十几处 `getCM6Editor()` 直操 view，全部改为调用 facade 的 typed 操作。

- **流式插入**：一次请求拆成多个 `insertText` 事务（每 chunk 一个，revision 递增），revision-bound 投影保证不 stale；插入点用 `insertText(anchor)` 定位，不用 CM6 selection。

## 第 4 节：CM6 移除与依赖变更

### 删除代码

- `src/components/editor/codemirror/` 整目录（14 文件，约 3900 行）。
- `src/components/editor/CM6Editor.tsx`、`src/components/editor/LZEditor.tsx`（CM6 外壳）。
- `getCM6Editor()` 及 App.tsx / editorActions / Toolbar / SearchPanel / HistoryPanel / SidebarOutline / scrollSync / useAI / docImport 中所有 CM6 引用点。
- 所有 `@codemirror/*`、`@lezer/*` import。

### package.json 变更

移除：`@codemirror/autocomplete`、`@codemirror/commands`、`@codemirror/lang-markdown`、`@codemirror/language`、`@codemirror/language-data`、`@codemirror/search`、`@codemirror/state`、`@codemirror/view`、`@lezer/common`、`@lezer/highlight`、`@lezer/markdown`。

升级（A1）：`react`、`react-dom` → 19.x；`@types/react`、`@types/react-dom` → 19.x。

保留：`markdown-it`、`markdown-it-footnote`、`dompurify`、`highlight.js`、`katex`、`mermaid`、`echarts`、`echarts-for-react`、`zustand`、`emoji-picker-react`、`jszip`、`xlsx`、`prettier`、`html-to-image`、`remixicon`。

新增：无。yeli 编辑器核心零新依赖（符合其"依赖必须本地/离线/可摇树"门规）。

### 保留不动

ReadMode、导出服务、AI 面板、搜索/历史/目录、settingsStore、editorStore（数据仍 markdown）、Electron 层、server、LPK。

### React 19 升级风险点

`echarts-for-react`（peer react）、`emoji-picker-react`、`react-katex`、`@vitejs/plugin-react` 版本、StrictMode 行为变化、`react-dom` client APIs、现有 72 条控件回归断言。处理方式：先升级验证，不兼容则升级/替换实现。

## 第 5 节：错误处理与测试

### 错误处理 / 边界

- **Facade 唯一入口**：任何外部写操作先过 facade typed 校验（range 越界、非法 revision → 拒绝并返回错误，不静默改字符串）。周边拿到的 md 永远是合法保真值。
- **stale 投影防御**：revision 不匹配的投影/渲染任务直接丢弃（yeli revision-bound 语义）；AI 流式插入期间快速编辑不覆盖最新内容。
- **vendor 层零泄漏**：yeli 内部类型（document model / store）不 export 到 lzeditor 公共类型；vendor 用 `@internal`/模块边界封住，只暴露 `YeliEditorFacade`。
- **载入失败**（非法/损坏 md、frontmatter 解析失败）：bounded recovery —— 保留原始字节、弹恢复 sheet，不部分加载。
- **渲染边界**：mermaid/katex/echarts 渲染错误 → 惰性容器内降级为 raw 代码块 + 错误提示，不抛进编辑事务。

### 测试

- 保留现有 `tests/`（e2e + 单元 + DESIGN.md 样式回归、72 条控件断言）必须继续绿，作为"周边没坏"守门员。
- 新增 vendor 适配层测试（vitest）：facade 的 `insertText/replaceRange/setText/getText` 保真断言（no-edit zero-diff、编辑后 markdown 合法、范围外拒绝）；AI 流式插入与快速编辑交错不丢内容。
- 新增编辑器交互测试（playwright，复用现有 e2e 框架）：输入辅助（自动配对/智能粘贴/打字机）、区块内特效渲染（mermaid/katex/echarts 惰性渲染）、AI 重接后的插入/改写。
- 保真回归：用 yeli 上游 `smart-write.test.ts`/`block-projection.test.ts` 语义（no-edit zero diff、supported-block narrow diff、ambiguous fallback、revision-bound stale rejection）在 vendor 上补一套。
- 最终验证：`npm run check`（typecheck + unit）、`npm run test:e2e`、`npm run test:browser`（如适用）、`npm run electron:build` 冒烟。

### 迁移顺序

1. 升 React 19，全量回归绿（独立提交）。
2. vendor yeli 纯逻辑层 + 渲染边界，加 facade 单元测试（独立提交）。
3. vendor edit-canvas.tsx + 接 facade，替换 LZEditor/CM6 入口。
4. 重接输入辅助 + 特效渲染 + AI 接入点。
5. 删 CM6 代码与依赖，typecheck/lint/回归全绿。
6. e2e/浏览器回归 + 保真断言。
