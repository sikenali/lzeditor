import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const html = read('index.html')
const mainTs = read('electron/main.ts')
const mainTsx = read('src/main.tsx')
const boundary = read('src/components/ErrorBoundary.tsx')
const exportDialog = read('src/components/panels/ExportDialog.tsx')
const app = read('src/App.tsx')
const vite = read('vite.config.ts')
const mermaid = read('src/utils/markdown/mermaid.ts')

// ── CSP ──
// 策略是故意收窄的：只挡内联脚本。锁 style/connect/img 会直接砍掉 AI、图片、内联样式，
// 所以反向断言它们没有被锁，防止后人「顺手加固」把功能弄没。
assert.match(html, /http-equiv="Content-Security-Policy"/, 'index.html 必须有 CSP meta')
const cspMatch = html.match(/Content-Security-Policy"[\s\S]{0,400}?content="([^"]+)"/)
assert.ok(cspMatch, 'CSP meta 必须带 content 值')
const policy = cspMatch[1]

for (const directive of [
  "script-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
]) {
  assert.ok(policy.includes(directive), `CSP 缺少 ${directive}`)
}
// frame-ancestors 不能写进 <meta>：Chromium 实测直接忽略并报
// "is ignored when delivered via a <meta> element"。写了会误导后人以为有了保护。
assert.ok(!policy.includes('frame-ancestors'), "<meta> 里写 frame-ancestors 无效，会被 Chromium 忽略")
assert.ok(!policy.includes('connect-src'), '不能锁 connect-src：AI 端点由用户自填')
assert.ok(!policy.includes('img-src'), '不能锁 img-src：base64 嵌入图与 markdown 外链图都要用')
if (policy.includes('style-src')) {
  assert.ok(policy.includes("'unsafe-inline'"), 'style-src 必须含 unsafe-inline：React 内联 style 与运行时注入的 <style>')
}

// CSP 依赖的两个前提，被违反时内联脚本之外的路径也会通
assert.match(mermaid, /securityLevel:\s*'strict'/, "mermaid 必须是 securityLevel:'strict'")
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}
for (const file of walk(new URL('../src', import.meta.url).pathname)) {
  const src = readFileSync(file, 'utf8')
  assert.ok(!/\beval\s*\(/.test(src), `CSP 依赖 src/ 无 eval：${file}`)
  assert.ok(!/new\s+Function\s*\(/.test(src), `CSP 依赖 src/ 无 new Function：${file}`)
}

// ── Electron 导航守卫 ──
assert.match(mainTs, /shell/, 'main.ts 必须引入 shell 才能把外链交给系统浏览器')
assert.match(mainTs, /setWindowOpenHandler/, 'main.ts 必须拦截 window.open')
assert.match(mainTs, /about:blank.*allow|allow.*about:blank/, 'PDF 打印窗口（about:blank）必须放行，否则导出 PDF 会废')
assert.match(mainTs, /shell\.openExternal/, 'http(s) 外链必须交给系统浏览器')
assert.match(mainTs, /'deny'/, '非 http(s) 的 window.open 必须 deny')
assert.match(mainTs, /will-navigate/, '必须拦截当前窗口被导航走')
assert.match(mainTs, /event\.preventDefault\(\)/, 'will-navigate 必须 preventDefault')

// ── file:read 授权 ──
// 白名单而非黑名单：只有操作系统文件关联发放过授权的路径才能读
assert.match(mainTs, /allowedPaths/, 'main.ts 必须有授权路径集合')
assert.match(mainTs, /isAllowedPath/, 'main.ts 必须统一授权判定入口')
assert.match(mainTs, /ALLOWED_FILE_EXT/, 'main.ts 必须有扩展名白名单兜底')
assert.match(mainTs, /second-instance[\s\S]*?allowedPaths\.add/, '文件关联路径必须登记授权')
assert.match(mainTs, /ipcMain\.handle\('file:read'[\s\S]*?isAllowedPath/, 'file:read 必须先校验授权')
assert.match(mainTs, /path not allowed/, '未授权路径必须返回明确的失败原因')
assert.match(mainTs, /path\.resolve/, 'file:read 必须用 resolve 后的真实路径比对，防 ../ 绕过')

// ── 读取失败的可见性 ──
// file:read 开始拒绝路径之后，这里如果还是静默 return，用户双击文件只会看到欢迎页消失
assert.match(app, /from '\.\/utils\/toast'/, 'App.tsx 必须能用 toast 提示用户')
assert.match(app, /readLocalFile[\s\S]{0,400}?toast\(/, '打开文件失败必须 toast，不能静默 return')

// ── 导出失败的可见性 ──
assert.match(exportDialog, /from '\.\.\/\.\.\/utils\/toast'/, 'ExportDialog 必须能 toast')
assert.match(exportDialog, /let failed = false/, '导出必须有成功/失败分支')
assert.match(exportDialog, /type: 'error'/, '导出失败必须用 error 类型的 toast')
assert.match(exportDialog, /if \(failed\) return/, '失败不能关闭弹窗：要保留已选参数供重试')
assert.doesNotMatch(exportDialog, /console\.error\('export failed', err\) \}/, '失败不能只写 console 就不说')
assert.match(exportDialog, /toast\(`已导出/, '导出成功也要告诉用户生成了哪个文件')

// ── 导出链路按需加载 ──
// exportService 牵动 jszip / xlsx，静态 import 会让首屏白背 500+ KB
assert.doesNotMatch(exportDialog, /import \{[^}]*\} from '\.\.\/\.\.\/services\/exportService'/, 'ExportDialog 不能静态引入 exportService')
assert.match(exportDialog, /await import\('\.\.\/\.\.\/services\/exportService'\)/, 'ExportDialog 必须动态加载导出链路')
assert.match(vite, /vendor-react/, 'vite 必须把 react 拆成独立块')

// ── 渲染崩溃兜底 ──
assert.match(boundary, /getDerivedStateFromError/, 'ErrorBoundary 必须捕获渲染错误')
assert.match(boundary, /componentDidCatch/, 'ErrorBoundary 必须记录错误')
assert.match(boundary, /componentStack/, 'ErrorBoundary 必须记录组件栈以便定位')
assert.match(boundary, /silentError/, 'ErrorBoundary 的错误要走统一记录出口')
assert.match(mainTsx, /from '\.\/components\/ErrorBoundary'/, 'main.tsx 必须引入 ErrorBoundary')
assert.match(mainTsx, /<ErrorBoundary>[\s\S]*?<App \/>[\s\S]*?<\/ErrorBoundary>/, 'main.tsx 必须用 ErrorBoundary 包住 App')
