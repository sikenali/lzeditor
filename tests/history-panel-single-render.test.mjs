import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 左导航（navMode==='left'）下 appMode==='history' 时 HistoryPanel 渲染两份：
// 中心内容（centerContent 的 history 分支）+ 右面板（app-right-panel 的 history 分支）。
// LeftNav 对 history 设 showRightPanel=true，会短路外层条件（旧修复只排除
// `appMode==='history'&&navMode!=='left'` 这一 OR 项，仍被 showRightPanel 短路绕过）。
// 修复：右栏外层条件整体排除 appMode==='history'，history 由中心内容独占渲染。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const app = read('src/App.tsx')
const modeLayout = read('src/utils/modeLayout.ts')

// ── 右栏外层条件必须整体排除 history（否则 showRightPanel 短路仍会渲染右栏）──
// 排除逻辑现在集中在 modeLayout.shouldShowRightPanel
assert.match(
  modeLayout,
  /appMode !== 'read'[\s\S]{0,40}appMode !== 'history'/,
  '右栏外层条件必须整体排除 appMode===\'history\'（history 由中心内容独占，右栏不渲染）',
)

// ── 右栏内层不得再有 history 分支（否则残留重复渲染路径）──
const rightPanel = app.match(/右面板：单面板互斥[\s\S]{0,400}/)?.[0] || ''
assert.ok(
  !rightPanel.includes("appMode === 'history' ? <HistoryPanel"),
  '右栏内层不得保留 history 分支（重复渲染路径需删除）',
)

// ── 中心内容仍保留 history 分支（唯一渲染位置）──
assert.match(app, /appMode === 'history'[\s\S]{0,80}return <HistoryPanel/, 'centerContent 必须保留唯一的 history 分支')

console.log('history panel single render ok')
