import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const svc = read('src/services/exportService.ts')
const dialog = read('src/components/panels/ExportDialog.tsx')

// ── D2: HTML 导出必须调用 buildTOC（当前只 pdf/docx/epub 调了） ──
// exportHTML 内部必须出现 buildTOC 的调用
const htmlFn = svc.match(/function exportHTML[\s\S]*?\n}/)?.[0] || ''
assert.match(htmlFn, /buildTOC\(/, 'exportHTML 必须调用 buildTOC（包含目录对 HTML 生效）')

// ── D3: addLineNumbers 正则必须匹配真实输出 class="hljs language-…" ──
const lnFn = svc.match(/function addLineNumbers[\s\S]*?\n}/)?.[0] || ''
// 用字符串 includes 断言（避免正则字面量把 \[^"\] 误解析为字符类）
assert.ok(lnFn.includes('class="[^"]*language-'), 'addLineNumbers 必须匹配 hljs language- 类')
assert.ok(!lnFn.includes('class="language-'), '不得只匹配旧的 language- 精确类（匹配不到真实输出）')

// ── D4: 导出必须注入 codeTheme 高亮 CSS 与 macCodeBlock 窗口样式 ──
assert.match(svc, /getCodeTheme|hljs/, 'exportService 必须读取 codeTheme 并注入 hljs 主题')
assert.match(svc, /macCodeBlock|data-mac-code/, 'exportService 必须应用 macCodeBlock（Mac 窗口栏）')

// ── D5: PDF 弹窗被拦截时必须报错/提示，不得静默 return ──
const pdfFn = svc.match(/function exportPDF[\s\S]*?\n}/)?.[0] || ''
assert.doesNotMatch(pdfFn, /if \(!win\) return/, 'exportPDF 不得在弹窗被拦截时静默 return')

// ── D1: 导出未编辑文档不得输出 <h1>Empty</h1>（须回落真实内容 previewHtml） ──
assert.match(dialog, /docHTML\s*\|\|\s*previewHtml/, 'ExportDialog 必须用真实内容 previewHtml 兜底而非直接 Empty')
assert.match(dialog, /format === 'md'\s*\?\s*mdSource/, 'ExportDialog 的 md 导出必须用真实 md 源码')

console.log('export fixes boundary ok')
