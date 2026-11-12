# 设计：历史功能——Git 提交 + 本地编辑合并时间线

- 日期：2026-11-12
- 类型：项目（新增依赖 isomorphic-git、Electron IPC、路径追踪、UI 重做、恢复 versionId.ts）
- 状态：待批准

## 意图与 why

历史功能当前完全死掉：`addVersion` 无调用方（`editorStore.ts:240`），`versions` 永远 `[]`，HistoryPanel 恒显「暂无历史记录」。`DocVersion` 已预留 `gitPath?`/`isFromGit?` 但无任何 git 集成。

用户决策：历史功能分两种情况，用**合并时间线**呈现——
1. **Git 仓库文件**：md 文件所属 git 仓库存在历史提交 → 显示该文件的 git 提交历史。
2. **本地新建 md**：修改多次 → 显示本地编辑快照历史。

## 目标

- 打开历史面板，能看到当前文档的**合并时间线**：git 提交（isFromGit=true）与本地快照（source='local'）按时间倒序插入，图标区分来源。
- 两类都可**回滚/重播**：本地项载入快照内容；git 项读该 commit 的文件内容载入编辑器（不改仓库，只载内容）。
- 优雅降级：非 git 仓库文档 / 非 Electron（浏览器 dev）→ 仅本地历史；无历史 → 「暂无历史记录」。

## 非目标 / 反目标

- **不改仓库**：回滚/重播只载编辑器内容，不 `git checkout`、不 `git commit`、不修改工作区。
- **不做 diff 视图**（git 提交间文本对比）——历史面板只预览单版本 + 时间线；diff 后续另议。
- **不做多人协作/远端推送**。
- **不做 git 仓库浏览器**（只读当前文档的提交历史，不列仓库内其它文件）。

## 约束

- git 历史**仅 Electron 可用**：渲染进程无 Node `fs`、无真实磁盘路径；浏览器 dev 只能显示本地历史。
- `isomorphic-git` **新增依赖**（纯 JS，无需用户装 git CLI，打包环境可用）。
- 路径追踪仅 Electron 提供 `File.path`；浏览器导入无法追踪磁盘路径（本地历史仍可用）。
- **恢复** `src/utils/versionId.ts`（`nextVersionId`，上轮作为孤儿误删）——本地快照 id 正需要。

## 方案

### 1. 路径追踪（Electron，用 webUtils.getPathForFile）
- `File.path` 在 Electron 32 已弃用 → 用 `webUtils.getPathForFile(file)`（preload 桥），前向兼容。
- 导入/打开文件时经 `webUtils.getPathForFile(file)` 取真实路径 → 存 `doc.diskPath`，并**注册进 `allowedPaths`**（与文件关联打开同机制，见 §2）。
- `openMarkdownDoc(title, md, path, diskPath?)` 加 `diskPath` 参数；`importSingleFile`/`importFolderFiles`/LibraryPanel 本地导入把 `diskPath` 传入。
- `Doc` 模型加 `diskPath?: string`；随 docCatalog/localStorage 持久化（`createDoc` 接受 `diskPath`）。
- 文件关联打开（`menu-open-file` → `readLocalFile(filePath)`）已有真实路径 + 已在 `allowedPaths`，一并写入 `diskPath`。

### 2. Git 历史读取（Electron 主进程 + isomorphic-git，授权复用闸门）
- `isomorphic-git` 依赖加入 **electron 侧**（`electron/main.ts` 用 Node `fs`）。
- 新增 IPC：
  - `git:history (filePath)` → `{ ok, repoRoot, commits: [{ oid, message, author, ts, changes }] }`。内部：`findRoot` 判仓库 → `log({ filepath })` → 每 commit 的 `committer.timestamp`、**手写逐 commit blob diff** 算 `changes`（isomorphic-git 无 numstat；root commit 记全新增）。
  - `git:show (filePath, oid)` → 该文件在 oid 处的内容（`readBlob` → utf8）。
  - **git 提交上限 50**（`MAX_GIT_COMMITS`），防大仓库逐 commit diff 卡顿。
- **授权**：`git:history`/`git:show` 复用 `isAllowedPath` 闸门（与 `file:read` 一致）——只允许读 `allowedPaths` 内的文件，堵住「读任意仓库文件」漏洞；§1 导入时把 `diskPath` 注册进 `allowedPaths`，故文件选择器导入的 git 历史可用。
- `preload.ts` 暴露 `gitHistory(filePath)` / `gitShow(filePath, oid)`；`electron/api.ts` 加类型。
- 非 git 仓库 / 非 Electron / 未授权 / 出错 → `{ ok: false }`，前端降级本地历史。

### 3. DocVersion 扩展 + 按文档隔离（合并排序 + 来源）
```ts
interface DocVersion {
  id: string          // 本地：nextVersionId()；git：commit oid（SHA）
  time: string; date: string
  ts: number          // epoch ms：本地=快照时刻；git=commit 时间戳*1000
  desc: string
  changes: number     // 本地=diff 行数；git=手写 blob diff 行数
  html: string; md: string
  gitPath?: string    // git 项：repoRoot 相对路径
  isFromGit?: boolean
  source: 'git' | 'local'
}
```
- **store 改为 `versionsByDoc: Record<docId, DocVersion[]>`**（避免 doc B 显示 doc A 快照）；`addVersion(docId, version)` 按 docId 追加；HistoryPanel 读 `versionsByDoc[activeDocId]`。

### 4. 本地快照接线（Case 2，持久化 + 抑制程序化载入）
- **恢复** `src/utils/versionId.ts`（nextVersionId）。
- 在 `handleEditorChange` 的 180ms debounce 回调里，`mdToHtml` 之后调用 `addVersion(activeDocId, {...})`：`{ id: nextVersionId(), md, html, ts: Date.now(), time/date 格式化, changes: 行 diff, source: 'local' }`。
- **持久化**：`lzeditor-versions-{docId}` 存 localStorage（快照数组，有上限），启动恢复；`addVersion` 落盘。
- **抑制程序化载入快照**：回滚/重播用 `setText(md, { skipVersion: true })`（或 loadVersion 内标记），避免载入内容再触发 `addVersion` 产生重复快照。
- 快照上限 `MAX_VERSIONS`（现有）；同 md 去重（`addVersion` 已有）。

### 5. HistoryPanel 重做（合并时间线）
- 打开时：读 `versionsByDoc[activeDocId]`（本地）+ 若 `doc.diskPath` 则 `gitHistory(diskPath)`（异步 loading）→ 合并成 `merged = [...local, ...git]` 按 `ts` 倒序。
- `commitShortHash`：git SHA 取前 6 位；本地数字 id 走现有 `parseInt→toString(16)`。
- 预览：git 项用 `gitShow(diskPath, oid)` 取内容 → `mdToHtml` → 预览（loading 态）；本地项用现有 `selected.html`。
- 回滚/重播：本地项走现有 `loadVersion`（`skipVersion` 抑制）；git 项 `gitShow` 取内容 → `updateDoc({md, html})` + `setText`（`skipVersion`，不改仓库）。
- 图标区分：git 项 `ri-git-commit-line`，本地项 `ri-history-line`。
- 非 git/非 Electron/未授权/加载失败 → 仅本地快照；都无 → 「暂无历史记录」。

## 决策点留白给实现者
- `findRoot` 判仓库失败/无 `.git` 的边界（返回 ok:false）。
- git 历史加载失败（权限/仓库损坏）的降级文案。
- 本地快照 `changes` 的行 diff 实现（按行数差异即可，不必 Myers diff）。
- `versionsByDoc` 的旧 `versions` 字段迁移（启动时从旧键读，或直接弃用——历史功能本就从未落过快照）。

## 验收
- 打开 git 仓库内文件的文档 → 历史面板显示该文件 git 提交 + 本地快照合并时间线，图标区分。
- 回滚 git 提交 → 编辑器载入该 commit 内容（不新增重复快照）；回滚本地快照 → 载入快照。
- 非 git 仓库文档 / 新建 md → 仅本地快照；改多次出现多个版本；**重启后本地快照仍在**。
- 浏览器 dev / 非 Electron → 仅本地历史，不报错。
- `npm run check`（typecheck + 测试）全绿；`npm run build` 成功。
