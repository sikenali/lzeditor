import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 预览点击跳源码失效的根因：lineBridgeOf 恒返回 null，goToLine 永远不被执行。
// 修复：返回真实 CM6 行桥（EditorView.findFromDOM 从编辑器根拿 view）。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const sync = read('src/hooks/scrollSync.ts')

// ── lineBridgeOf 必须返回真实桥（不再恒 null）──
assert.doesNotMatch(sync, /function lineBridgeOf\([^)]*\)\s*\{\s*return null/, 'lineBridgeOf 不得恒返回 null')
assert.match(sync, /EditorView\.findFromDOM|findFromDOM/, 'lineBridgeOf 必须用 EditorView.findFromDOM 从编辑器根拿 view')

// ── goToLine：光标移到行首，不夺焦点（dispatch 不 focus）──
assert.match(sync, /goToLine/, '必须实现 goToLine')
assert.match(sync, /state\.doc\.line\(/, 'goToLine 必须用 state.doc.line(n) 定位行')
assert.match(sync, /selection:\s*\{\s*anchor/, 'goToLine 必须设置光标 anchor')
assert.match(sync, /scrollIntoView/, 'goToLine 必须滚动到目标行')
assert.doesNotMatch(sync, /goToLine[^}]*\.focus\(\)/, 'goToLine 不得夺焦点')

// ── topVisibleLine：可视区顶端行号 ──
assert.match(sync, /topVisibleLine/, '必须实现 topVisibleLine')
assert.match(sync, /lineBlockAt|lineBlockAtHeight/, 'topVisibleLine 必须用 lineBlockAt/lineBlockAtHeight 量可视区顶端')

// ── scrollToLine：滚到指定行 ──
assert.match(sync, /scrollToLine/, '必须实现 scrollToLine')
assert.match(sync, /scrollDOM/, 'scrollToLine 必须滚动 scrollDOM（CM6 滚动容器）')

// ── destroyed：view 脱离 DOM 即失效 ──
assert.match(sync, /destroyed/, '必须暴露 destroyed')

console.log('line bridge wiring ok')
