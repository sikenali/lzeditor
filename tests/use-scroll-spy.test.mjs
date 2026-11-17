import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

// 静态源断言：大纲↔样式内容点击联动 + 活动项左间距
const hook = readFileSync(new URL('../src/hooks/useScrollSpy.ts', import.meta.url), 'utf8')
const panel = readFileSync(new URL('../src/components/panels/StyleMainPanel.tsx', import.meta.url), 'utf8')
const layout = readFileSync(new URL('../src/styles/layout.css', import.meta.url), 'utf8')

test('scrollTo 直接置 activeId 并在程序滚动期间抑制 scroll-spy 覆盖', () => {
  // 根因：点击后 active 由 computeActive 从滚动落点推导，落点不可靠（底部项滚不到顶），
  // 会把高亮落在上一项。修复：scrollTo 直接 setActiveId(目标)，滚动期间抑制 computeActive。
  assert.match(hook, /suppressRef/, '必须有程序滚动抑制标记')
  assert.match(hook, /suppressRef\.current\s*=\s*true/, 'scrollTo 必须置抑制标记')
  assert.match(hook, /if\s*\(suppressRef\.current\)\s*return/, 'computeActive 在程序滚动期间必须跳过')
  assert.match(hook, /setActiveId\(id\)/, 'scrollTo 必须直接置 activeId=目标')
  assert.match(hook, /document\.getElementById\(id\)/, 'scrollTo 必须按 id 直取最新 DOM 节点，避免过期 el')
})

test('scrollTo 在滚动结束后释放抑制（scrollend 或超时兜底）', () => {
  assert.match(hook, /scrollend/, 'scrollend 事件释放抑制')
  assert.match(hook, /setTimeout/, '超时兜底释放抑制')
})

test('StyleMainPanel 跳转不再冗余双滚动', () => {
  assert.match(panel, /scrollToChapter\(id\)/, '跳转经 scrollToChapter')
  const jumper = panel.match(/jumperRef\.current\s*=\s*\(id\)\s*=>\s*\{([\s\S]*?)\n\s*\}/)
  assert.ok(jumper, 'jumperRef.current 存在')
  assert.doesNotMatch(jumper[1], /getElementById/, '跳转只经 scrollToChapter，无冗余 getElementById 双滚动')
})

test('大纲活动项按钮有左侧内边距（徽标与左边框留呼吸）', () => {
  assert.match(layout, /outline-jump-btn\s*\{[^}]*padding:\s*6px 8px 6px 8px/, '按钮左 padding 8px，徽标不再贴左边框')
})
