# 上线前加固设计（P0–P3）

日期：2026-10-27
范围：导出失败可见性、渲染崩溃兜底、CSP、Electron 导航守卫、`file:read` 授权、导出链路按需加载

## 背景

上线前审计发现 6 类问题。设计原则：**只做能让"以为成功了/白屏了/文件被读了"变不可能的事**，不做无关重构。

用户选定的范围是"全修含 P3"。

## 1. P0 导出失败可见性

`src/components/panels/ExportDialog.tsx` 的 `handleExport` 原来 `catch { console.error }` 后无条件 `onClose()`——失败和成功完全一样，用户会以为文件已导出。

改为：
- `let failed = false`，catch 里置位并 `toast('导出失败，文件没有生成，可以换个格式重试', { type: 'error', duration: 4000 })`
- 失败时 `if (failed) return`，**不关弹窗**——保留用户已选的格式与排版项，可直接重试
- 成功时 `toast(\`已导出 ${safeTitle}.${format}\`)`——原来是成功也没任何反馈，用户要自己去下载目录确认

用现有 `src/utils/toast`，零新增依赖。

## 2. P1 渲染崩溃兜底

新增 `src/components/ErrorBoundary.tsx`，class 组件：
- `getDerivedStateFromError` 捕获、`componentDidCatch` 走 `silentError` 统一出口并补记 `componentStack`
- fallback：居中卡片 + "页面出了点问题" + 说明文档在 localStorage 刷新不丢 + **仅开发环境**显示 `error.message` + "重新加载页面"按钮
- 样式内联走 `--color-*` / `--radius-*` / `--shadow-xl` token，与 `toast.ts` 同一写法，不新增 CSS 文件

`src/main.tsx` 把 `<App />` 包在 `<ErrorBoundary>` 里（仍在 `<StrictMode>` 内）。

不提供任何"清空/重置"动作：文档持久化在 localStorage，刷新即可恢复。

## 3. P1 CSP

`index.html`：

```
script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

**故意不收窄的三项**，理由必须写进 HTML 注释，否则后人会"顺手加固"把功能弄没：

| 项 | 为什么不加 |
|---|---|
| `style-src` | React 内联 `style`、`toast.ts` 与 mermaid 运行时注入的 `<style>` 都依赖 `'unsafe-inline'` |
| `connect-src` | AI 端点由用户在设置里自填（阿里云/百度/智谱/DeepSeek/Moonshot/零一万物…），锁了等于删掉核心功能 |
| `img-src` | 本地嵌入的 base64 图片、markdown 里的外链图都要用 |

**策略成立的三个前提**（已核对）：
1. `src/**/*.ts(x)` 无 `eval(` / `new Function(`
2. mermaid 走 `securityLevel: 'strict'`（图标签里不能塞脚本）
3. `exportPDF` 的打印文档只写 HTML+CSS，不含 script；`about:blank` 继承本策略也不受影响

三者都被写进 `tests/security-boundary.test.mjs` 断言，前提被破坏时测试会红。

## 4. P2+P4 Electron 导航守卫（两处纠缠）

`window.open('', '_blank')` 的 PDF 打印窗口与"外链新开应用窗口"是同一个缺口，必须一起处理，否则补一个就废另一个。

修法：**按 URL 分类放行**，不动前端。

```ts
wc.setWindowOpenHandler(({ url }) => {
  if (!url || url === 'about:blank') return { action: 'allow' }   // 打印窗口
  if (/^https?:/i.test(url)) { shell.openExternal(url); return { action: 'deny' } }
  return { action: 'deny' }
})
wc.on('will-navigate', (event, target) => {
  if (target === wc.getURL()) return   // location.reload()，否则热更新刷新被拦
  event.preventDefault()
  shell.openExternal(target)
})
```

打印窗口不带 preload，拿不到 `readLocalFile` 等 IPC，天然无权限。
`mainWindow` 是模块级 `let`，闭包内拿不到收窄后的类型，先 `const wc = mainWindow.webContents` 再用。

## 5. P1 `file:read` 授权（白名单而非黑名单）

`electron/main.ts`：

```ts
const allowedPaths = new Set<string>()
const ALLOWED_FILE_EXT = ['.md', '.markdown', '.txt']
const isAllowedPath = (p) => ALLOWED_FILE_EXT.includes(ext(p)) && allowedPaths.has(path.resolve(p))
```

- `second-instance`（OS 文件关联，路径由系统给出）通过校验后 `allowedPaths.add(path.resolve(file))`
- `file:read` 先 `isAllowedPath` 校验，不通过返回 `{ ok: false, error: 'path not allowed' }`
- `path.resolve` 比对，防 `../` 绕过

**连带修复**：`src/App.tsx` 原来 `if (!res?.ok || !res.text) return` 静默返回。加上授权后这个分支会被真实触发，而欢迎页已经 `dismissWelcome()`——用户双击文件只会看到欢迎页消失然后什么都没有。改为 `toast(\`打开文件失败：${res?.error || filePath}\`, { type: 'error' })`。

不加对话框发放授权：UI 里没有自由输入路径的入口，`FilePanel` 只提供模板。

## 6. P3 导出链路按需加载

`ExportDialog` 是唯一静态引入 `exportService` 的地方，而 `exportService` 牵动 `jszip` / `xlsx`，让 500+ KB 的 `vendor-export` 块进首屏关键路径。

修法不是 `React.lazy`（`ExportDialog` 同时被 `App.tsx` 和 `StyleMainPanel.tsx` 引用，两处都要加 Suspense），而是在 `handleExport` 里动态 import：

```ts
const { exportDocument } = await import('../../services/exportService')
```

收益在按钮按下时才付出——此时本来就在 `exporting` 状态，用户不会感知到额外的加载等待，且没有 Suspense/fallback 的结构改动。

`vite.config.ts` 的 `manualChunks` 增补 `vendor-react`（react + react-dom + scheduler）：被所有懒加载块共享，与 app 主块拆开可独立缓存。

**不动** CM6 常驻——那是代码模式滚动同步的前提，改了就等于回退之前的功能。

## 7. 测试

新增 `tests/security-boundary.test.mjs`，沿用现有静态断言风格，但有一项是真正的行为扫描：递归遍历 `src/**` 断言无 `eval(` / `new Function(`。

其余为反向断言，防止未来误加固：CSP 不得锁 `connect-src` / `img-src`，`style-src` 若出现必须含 `'unsafe-inline'`；`setWindowOpenHandler` 必须放行 `about:blank`；`ExportDialog` 不得静态引入 `exportService`；`<meta>` 里不得出现 `frame-ancestors`。

新增 `tests/error-boundary.test.mjs`（4 项，React + happy-dom 真渲染）：不抛错原样渲染、子组件 throw 时出兜底页且容器非空、生产环境不泄露 `error.message`、按钮真会 `location.reload`。静态断言证明不了"子组件真的 throw 了、用户看到的不是白屏"，只有真渲染才能。

## 8. 验证口径

- `npx tsc --noEmit -p tsconfig.json`
- `npx tsc -p electron/tsconfig.json --noEmit`
- `npm test`（130/130，含 security-boundary 与 error-boundary）
- `npm run build`
- 构建后检查 `dist/index.html`：CSP meta 存在、`<script>` 只有外部 module（无内联）、`vendor-export` 不在 modulepreload 列表
- **Electron 实机探针**：`/tmp/opencode/probe.js`，`DISPLAY=:100 electron --no-sandbox` 真启动应用（dev 模式走 vite dev server），用 `webContents.debugger` 挂 CDP 逐项断言，共 **21 项全绿**

## 9. Electron 实机验证结果

用 CDP 驱动真渲染进程跑了 21 项断言，全绿：

| 断言 | 结果 |
|---|---|
| 应用正常渲染 | `#root` 子节点 1，页面文本 372 字 |
| CSP 生效于渲染进程 | 读到完整 `content` |
| **CSP 没有误伤运行时** | **零条 `security`/CSP 日志** |
| 渲染进程无未捕获 JS 错误 | console 无 uncaught/TypeError |
| 打印窗口被放行且能写入 | `document.write` 后 `innerText="PRINT-DOC\n\nok"` |
| 打印窗口是独立 webContents | `URL=about:blank` |
| **打印窗口拿不到 IPC** | **`typeof window.electronAPI === undefined`** |
| 打印文档没触发 CSP 拦截 | `[]` |
| **mermaid 在 CSP 下渲染出 SVG** | `jobs:1, mermaidSvg:1, mermaidNodes:73` |
| **katex 在 CSP 下渲染出 DOM** | `katexNodes:33`，且走应用自己的 markdown 管道 `renderMarkdownRaw('$$E=mc^2$$')` 也产出 katex HTML |
| **echarts 在 CSP 下渲染出 SVG** | `echartsSvg:1, echartsNodes:21`（v6，bar 图 svg renderer） |
| 三个渲染器全程无 CSP 拦截 | `[]` |
| 三个渲染器全程无 JS 错误 | `[]` |
| 外链被拒 | `window.open` 返回 `null` |
| 外链交给系统浏览器 | `shell.openExternal` 记录 `["https://example.com/"]` |
| 当前窗口没被导航走 | URL 仍是 `localhost:5173` |
| `location.href` 跳外链被拦 | 导航前后 URL 不变 |
| 未授权路径被拒 | `{ok:false, error:'path not allowed'}` |
| 路径穿越被拒 | `/tmp/../etc/passwd` 同样被拒 |
| 未登记的 `.txt` 被拒 | 授权集合为空时一律拒 |

**探针跑出来的两个修正**：

1. **`frame-ancestors` 已从 CSP meta 里移除**。Chromium 实测报 `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element`——写在 meta 里直接被忽略，留着会误导后人以为有这层保护。它只能走 HTTP 响应头，而本应用由 Electron 自己加载固定 URL，不存在被别的站点 iframe 嵌入的场景。已加反向断言防回归。
2. **`window.open('', '_blank')` 的同步快照里 `w.location.href` 返回的是 opener 的 URL**（空白窗口在被写入之前仍报告来源页 URL），所以窗口身份必须用主进程侧 `webContents.getURL()` 判定。

探针本身踩过的三个坑（都不是应用问题，记录以免重查）：`shell.openExternal` 会规整出尾斜杠 `https://example.com/`；页面运行时动态 `import('katex')` 解析不了裸名，要走 Vite 的 `/@id/katex`；echarts v6 已移除 `getRenderedSVG()`，改数容器里的 SVG 节点。

**唯一没能验证的**：`win.print()` 弹出的系统打印对话框本身——探针确认了打印文档被完整写进一个干净的 `about:blank` 窗口且没有 CSP 拦截，但没有真的调用 `print()`（那会在 X server 上弹原生对话框，无断言价值）。操作系统打印选择器是否出现属于 OS 行为。

## 10. 探针暴露的既有缺口（不在本次范围）

**双击 .md 打开文件这条链路本来就是死的**，与本次加固无关但值得一并处理：

- `grep SingleInstanceLock electron/*.ts` 为空——没调 `app.requestSingleInstanceLock()`，而 Electron 的 `second-instance` 事件只有拿到锁之后才会发。所以 `second-instance` 处理器是死代码，`allowedPaths` 永远为空，`readLocalFile` 现在会一律拒绝。
- `app.argv` / `process.argv` 同样无人读取——应用未运行时双击文件（首次启动）也没有任何处理。

加固前这条链路已经不工作（`second-instance` 从不触发），加固后表现为"明确拒绝 + 用户能看到 toast"，比之前静默无响应好，但要真正可用需要补 `requestSingleInstanceLock` + 首次启动 argv 处理。

