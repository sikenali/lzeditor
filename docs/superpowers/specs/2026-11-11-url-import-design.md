# 设计：文档库导入改为 2 标签（URL 在线导入 + 本地导入）

- 日期：2026-11-11
- 类型：小改动（前端 UI + 一个 fetch 工具函数）
- 状态：待确认

## 意图与 why

文档库弹窗左侧现有 4 个分类：文档库 / Git仓库 / 博客 / GitBook。后 3 个来源的**在线导入能力此前已删除**，实际都只是「从本地导入 Markdown」按钮，三个页面重复且名不副实。

用户决策：把 **Git仓库 / 博客 / GitBook 三个页面优化为 2 个标签**——「URL 在线导入」与「本地导入」。

## 范围（用户已定）

**URL 在线导入**：粘贴**纯 .md 直链**（`raw.githubusercontent.com`、gist 等返回 markdown 的 URL），`fetch` 后作为新文档导入。

**本地导入**：现有本地文件选择器（`.md/.markdown/.txt`，多选），行为不变。

## 非目标 / 反目标（不做）

- **不做 HTML 提取**：若 URL 返回 HTML（博客/GitBook 页面），toast 提示「请提供 .md 直链」，不自动转 markdown（用户选「仅 .md 直链」）。
- **不做 Git 仓库文件列表**（多文件批量导入需 GitHub API，用户明确排除）。
- **不新增后端/代理/IPC**：`raw.githubusercontent.com`/gist 带 `Access-Control-Allow-Origin: *`，渲染进程 `fetch` 可行。个别站点 CORS 失败则 toast 报错，不静默。

## 方案（唯一合理路径）

因范围已收敛为「仅 .md 直链」，无并行的替代方案需要权衡（不做 HTML 提取则无需 turndown，不做 Git API 则无需服务端）。

1. **`ImportButtons.tsx`**：
   - `CATEGORIES` 改为：`docs`（文档库）/ `url`（URL 在线导入）/ `local`（本地导入）。
   - Props 改为 `onImportUrl(url: string)`、`onImportLocal()`（删除 onImportGit/Blog/Gitbook）。
   - `category==='url'`：渲染 URL 输入框 + 「导入」按钮 + 说明文案「粘贴 .md 文件直链（raw.githubusercontent.com / gist 等）」，含 loading 态。
   - `category==='local'`：渲染「从本地导入 Markdown」按钮（复用现有文件选择器逻辑，从 LibraryPanel 传入）。
   - 删除 3 份重复的 empty-state 段落。
2. **`LibraryPanel.tsx`**：
   - `handleImportLocal` 保留（文件选择器 → `openMarkdownDoc`）。
   - 新增 `handleImportUrl(url)`：校验 URL → `fetch(url)` → `response.ok` 检查 → `text()` → 从 URL 末段派生标题（去扩展名）→ `openMarkdownDoc(title, text)`；`catch` → toast 错误（含 CORS/网络区分）。
   - `ImportButtons` 传新 props。
3. **（可选）标题**：从 URL 末段文件名派生；不额外加标题输入框，保持最小。

## 决策点留白给实现者
- URL 输入框的校验（是否要求 `http(s)://`、空值禁用按钮）。
- 加载/错误态的 toast 文案。

## 验收
- 文档库弹窗左侧为 文档库 / URL 在线导入 / 本地导入 三项；Git仓库/博客/GitBook 不再出现。
- 贴 raw.githubusercontent.com 的 .md 直链 → 成功新建文档并打开。
- 贴 HTML 页面 URL → toast 提示需 .md 直链，不导入。
- 本地导入按钮行为与现状一致（多选 .md 导入）。
- `npm run check`（typecheck + 测试）全绿。
