import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 左侧导航模式（navMode==='left'）下 appMode==='history' 时，HistoryPanel 被渲染两次：
// 一次在中心内容（centerContent 的 history 分支），一次在右面板（app-right-panel 的
// history 分支）。修复：右面板的 history 条件必须排除左侧导航，让中心区渲染唯一一份。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const app = read('src/App.tsx')

// ── 右面板外层条件：history 分支必须排除 navMode === 'left' ──
// （否则 leftLayout 下 appMode==='history' 会同时渲染中心 + 右面板两份 HistoryPanel）
assert.match(
  app,
  /appMode === 'history'\s*&&\s*navMode !== 'left'/,
  '右面板 history 条件必须排除左侧导航（navMode !== \'left\'），避免重复渲染 HistoryPanel',
)

// ── 中心内容仍保留 history 分支（唯一渲染位置）──
assert.match(app, /appMode === 'history'[\s\S]{0,80}return <HistoryPanel/, 'centerContent 必须保留唯一的 history 分支')

console.log('history panel single render ok')
