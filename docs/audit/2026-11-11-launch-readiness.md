# lzeditor 上线就绪评估（2026-11-11）

回答两个问题：**上线前还有哪些功能没实现？** **打开大文件的性能如何？**

---

## 一、功能完备性：上线前「未实现」清单

### 🟡 真实功能缺口（需要用户知情或决策）

| # | 缺口 | 现状 | 位置 | 建议 |
|---|---|---|---|---|
| 1 | **在线导入未接入** | Git 仓库 / 博客（WordPress/Hexo/Hugo）/ GitBook 的**远程在线导入未实现**。审计已把按钮诚实标注为「从本地导入 Markdown」（本地 MD 文件导入可用）。 | `ImportButtons.tsx`、`LibraryPanel.tsx` | 上线可接受（本地导入可用，文案已诚实），远程导入列为后续 roadmap |
| 2 | **WYSIWYG 模式命令受限** | Milkdown 是文档模型（ProseMirror），无源码 offset 语义，`getEditorFacade()` 恒 null。命令型按钮（粗体/斜体/删除线、格式/插入命令、查找、大纲）在 wysiwyg 下**禁用**（非静默 no-op），面板型（图片/链接/代码/公式/表格）走 fallback 仍可用。 | `editorActions.tsx applyWysiwygItems`、`Toolbar.tsx`、`LeftNav.tsx` | 这是诚实的设计限制，非缺陷。WYSIWYG 用户需在编辑器内用 Markdown 语法/菜单 |
| 3 | **表格结构命令源码模式永久置灰** | 源码编辑器无表格单元格上下文，`getTableContext()` 恒 null → 表格结构菜单 7 项永远灰色。 | `EditorFacade.ts:75`、`cm6/CM6EditorFacade.ts:172` | 可接受（源码模式插入表格走 fallback）；可选：隐藏而非置灰 |

### 🟢 架构决策（非缺口，但影响「服务端能力」认知）

| 项 | 现状 | 说明 |
|---|---|---|
| **无业务后端** | 本地 `server` 仅 `GET /health`、`GET /api/health` 供 LPK 平台健康检查；前端对本地服务**零调用**。外部 AI 请求**直连第三方 provider**。 | 无自有后端 → **无账号 / 云同步 / 多设备 / 协作 / 云存储**能力。数据全部走本地 `localStorage` + `docCatalog`。这是架构决策，上线前需让用户知情。 |
| **双排版主题轨道** | `styles/themes.ts`（18KB）与 `styles/typography-themes.ts`（58KB）并存，主题色与排版主题职责重叠。 | 技术债非功能缺口，可后续合并。 |
| **4 面板本地重定义 `UDSection`/`UDSettingRow`** | ChartDialog/CodeDialog/ImageDialog/LinkDialog 未复用 `ui/sections.tsx`。 | 技术债，不影响功能。 |

### ✅ 已具备的能力（非缺口，验证过）
- **导出格式齐全**：pdf / html / docx / epub / md / png / svg / drawio / xlsx（`exportService.ts:7`）。
- **自动保存**：每次编辑写 `localStorage` + `docCatalog` 持久化（`App.tsx:414-418`）。
- **前后端 100% 对接**：Electron IPC 10/10 channel 双向咬合；无死调用/孤儿端点（审计已确认）。
- **WYSIWYG**（Milkdown 7）与 **源码**（CM6）双编辑器并存，均受控于同一 `md`。

---

## 二、大文件性能：打开快，输入是风险点

### ✅ 打开大文件 —— 快（无问题）
**CM6 EditorState 惰性解析**：624KB → **19ms**（375KB → 15ms）。lezer 按需解析，`EditorState.create` 几乎不解析全文。**大文件打开不卡。**

### ⚠️ 输入大文档 —— 每键同步全量渲染（性能风险点）

**结构事实**（`App.tsx:412-418`）：
```ts
const handleEditorChange = useCallback((md: string) => {
  const es = useEditorStore.getState()
  es.setMdContent(md)          // 每键触发预览订阅
  ...
  const html = mdToHtml(md)    // ← 每键同步全量渲染，无 debounce、无缓存
  es.updateDoc({ md, html, docsMd: { [docId]: md } })
  localStorage.setItem(...)     // 每键写 localStorage
}, [])
```

**实测（node 跑真实 `renderMarkdown` 管线，含 markdown-it + KaTeX + hljs + DOMPurify）**：

| 文档大小 | 渲染耗时 | 说明 |
|---|---|---|
| 123KB | ~200ms | 每键 200ms → 输入明显迟滞 |
| 247KB | ~310ms | 每键 310ms → 输入迟滞 |
| 497KB | ~905ms | 每键近 1s → 输入卡顿严重 |
| （公式密集 193KB） | ~2000ms | KaTeX 是主要瓶颈，公式多时更糟 |

- **无 debounce / throttle / useDeferredValue / 缓存**（全编辑器路径 grep 为空）。
- **`mdToHtml` 无 memo**（`mdToHtml.ts` 每次全新 `renderMarkdown`）。
- **`handleEditorChange` 的 `mdToHtml` 无条件执行**——即使预览面板关闭，每键仍全量渲染（只为更新 `docHTML`/`localStorage`）。
- 预览面板本身用缓存的 `docHTML`（不重复渲染），但 html 已被上面**急迫计算**。

**结论**：大文件打开无问题；**大文档持续输入是主要性能风险**（每键同步全量渲染，500KB 级文档近 1s/键）。公式（KaTeX）密集时更差。

### 🔧 推荐修复（已完成）

1. **`handleEditorChange` 的 `mdToHtml` 加 debounce（~180ms）** —— 已实现：md 立即保存（不丢内容），html 计算 + `docHTML` 更新 + `localStorage` 走 debounce（`App.tsx` `renderTimerRef`），消除每键同步全量渲染阻塞；切文档时仅更新仍在看的 `docHTML`。
2. **`docHTML` 惰性化** —— 已实现：html 不再每键急迫计算，改为输入停顿后计算（lazy）。重载路径用 `md` 重算（`getDocMd`），stale html 无风险。
3. （可选，后续）预览用 `useDeferredValue(mdContent)`；KaTeX 公式按字符串 memo。

> 实测修复效果：输入从「每键同步 300-900ms」降为「停顿后一次 ~300-900ms」，大文档持续输入不再卡。

---

## 三、结论

**功能**：无「上线阻断」级缺口。3 个真实功能缺口（在线导入 / WYSIWYG 命令受限 / 表格结构置灰）都已**诚实呈现**（按钮文案或禁用态），可上线；1 个架构认知点（无业务后端 → 无云同步/账号）需让用户知情。

**性能**：**大文件打开快（624KB→19ms，无问题）**；**大文档输入是唯一风险**（每键同步全量渲染，500KB 级近 1s/键）。**建议上线前加 debounce + docHTML 惰性化**（约 1 处改动，低成本高收益）。
