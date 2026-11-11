import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 样式面板的目录侧栏（read-toc-sidebar）当前从不渲染：`storeTocItems` 依赖
// editorStore.tocItems，但 `setTocItems` 从未被任何组件调用，恒为 []。
// 修复：StyleMainPanel 从 DOM 提取 chapters 后必须调用 setTocItems(items)。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const panel = read('src/components/panels/StyleMainPanel.tsx')

// ── StyleMainPanel 必须订阅 setTocItems ──
assert.match(panel, /setTocItems/, 'StyleMainPanel 必须订阅 editorStore 的 setTocItems')

// ── chapters 提取 effect 内必须调用 setTocItems(items) ──
// 用 indexOf 断言（正则字面量里未转义的 [ 会与 ] 组成字符类，产生歧义）
const tocCall = panel.indexOf('setTocItems(items)')
const chCall = panel.indexOf('setChapters(items)')
assert.ok(tocCall > -1, 'chapters 提取后必须调用 setTocItems(items) 填充目录侧栏')
assert.ok(chCall > -1, 'chapters 提取仍须调用 setChapters(items)')
assert.ok(tocCall > chCall, 'setTocItems 调用必须出现在 setChapters 之后（同一 effect 内）')

// ── 目录侧栏渲染条件要能拿到 storeTocItems ──
assert.match(panel, /storeTocItems/, '目录侧栏必须读取 storeTocItems')

console.log('style panel toc wiring ok')
