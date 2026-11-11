import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 大文档输入性能：handleEditorChange 在每键同步调用 mdToHtml(md)（App.tsx:418），
// 无 debounce、无缓存，即使预览面板关闭也执行。实测 497KB → ~900ms/键，输入卡顿。
// 修复：md 立即保存（不丢内容），html 计算 + docHTML 更新 + localStorage 走 debounce
// （~180ms 停顿后计算），消除每键同步全量渲染阻塞。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const app = read('src/App.tsx')

// ── handleEditorChange 不得同步调用 mdToHtml ──
const handler = app.match(/const handleEditorChange[\s\S]*?\n  \}, \[\]\)/)?.[0] || ''
assert.ok(handler, '必须能找到 handleEditorChange')

// 同步块内不得直接 `const html = mdToHtml(`（须在 setTimeout 内）
const syncHtml = handler.match(/const html = mdToHtml\(/)
const inTimeout = handler.match(/setTimeout\([\s\S]*?mdToHtml\(/)
assert.ok(!syncHtml || inTimeout, 'mdToHtml 必须在 setTimeout（debounce）内调用，不得同步每键渲染')

// ── 必须有 debounce 定时器（renderTimerRef + clearTimeout 合并）──
assert.match(handler, /renderTimerRef|debounceTimer|pendingRender/, '必须用定时器引用做 debounce')
assert.match(handler, /clearTimeout/, '必须 clearTimeout 合并前一次（输入停顿后只算一次）')
assert.match(handler, /setTimeout/, '必须用 setTimeout 延迟计算')

// ── md 立即保存（不丢内容），html 走 debounce ──
// updateDoc({ md, docsMd }) 应同步调用（在 setTimeout 之外）
const syncUpdate = handler.match(/updateDoc\(\{ md, docsMd: \{ \[docId\]: md \} \}\)/)?.[0] || ''
assert.ok(syncUpdate, 'md 必须同步保存（updateDoc({md, docsMd}) 在 setTimeout 外，防内容丢失）')

// ── debounce 时长 ~180ms ──
assert.match(handler, /180|setTimeout\([^)]*,\s*1[5-9]\d|setTimeout\([^)]*,\s*2[0-4]\d/, 'debounce 时长应在 150-240ms 区间')

// ── 仅当仍是同一文档时才更新 docHTML（防切文档串内容）──
assert.match(handler, /activeDocId === docId|docId === \w*activeDocId/, '更新 docHTML 前必须校验仍是同一文档')

console.log('editor change debounce ok')
