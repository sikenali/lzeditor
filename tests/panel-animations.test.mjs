import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── task 7：AI 弹框高度与预览一致，不覆盖顶栏/底栏；task 8：滑入动画统一 ──

const ai = read('src/styles/ai-chat.css')
const layout = read('src/styles/layout.css')

// AI 面板：top=56px（顶栏 .toolbar）、bottom=58px（底栏 .app-footer），不再 top:0/bottom:0
const panel = ai.match(/\.ai-chat-panel\s*\{[^}]*\}/)?.[0] || ''
assert.match(panel, /top:\s*56px/, 'AI 面板 top 必须 56px（避开顶栏 .toolbar 56px）')
assert.match(panel, /bottom:\s*58px/, 'AI 面板 bottom 必须 58px（避开底栏 .app-footer 58px）')
assert.ok(!/top:\s*0;/.test(panel), 'AI 面板不得再 top:0（不覆盖顶栏）')
assert.ok(!/bottom:\s*0;/.test(panel), 'AI 面板不得再 bottom:0（不覆盖底栏）')
// AI 面板从右往左滑入（与预览一致）
assert.match(panel, /animation:\s*slideInRight var\(--t-slow\) var\(--ease\)/, 'AI 面板必须 slideInRight（从右往左，丝滑）')

// 下拉弹框（顶栏 图片/链接/表格/插入 的 .toolbar-submenu）：从上往下平滑滑入，无 scale
const ddIn = layout.match(/@keyframes dd-in\s*\{[\s\S]*?\n\}/)?.[0] || ''
const ddTransform = (ddIn.match(/transform:\s*[^;]+;/g) || []).join('')
assert.ok(!ddTransform.includes('scale'), 'dd-in 不得再有 scale（task 8 平滑）')
assert.match(ddIn, /translateY\(-10px\)/, 'dd-in 必须从上往下位移（translateY -10px）')
const submenu = layout.match(/\.toolbar-submenu\s*\{[^}]*animation:[^;]+;/)?.[0] || ''
assert.match(submenu, /animation:\s*dd-in var\(--t-base\) var\(--ease\)/, '下拉弹框必须 dd-in 用 --t-base + --ease（丝滑柔和）')

// 文档库/大纲 从左到右、预览 从右到左、查找 从下往上 —— 方向统一（task 8 基线）
assert.match(layout, /\.sidebar-library\s*\{[^}]*animation:\s*slideInLeft var\(--t-base\) var\(--ease\)/, '文档库必须 slideInLeft（从左到右）')
assert.match(layout, /\.sidebar-outline\s*\{[^}]*animation:\s*slideInLeft var\(--t-base\) var\(--ease\)/, '大纲必须 slideInLeft（从左到右）')
assert.match(layout, /\.sidebar-preview-wrapper\s*\{[^}]*animation:\s*slideInRight var\(--t-base\) var\(--ease\)/, '预览必须 slideInRight（从右到左）')

console.log('panel animations ok')
