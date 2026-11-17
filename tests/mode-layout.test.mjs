import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { shouldShowRightPreview, shouldShowRightPanel } from '../src/utils/modeLayout.ts'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const app = read('src/App.tsx')

// ── 行为：右侧预览显示条件（WYSIWYG 参数已随模式移除）──
// 编辑模式 + 预览开启 → 显示预览（正常分屏）。
assert.equal(
  shouldShowRightPreview({ showPreview: true, appMode: 'edit' }),
  true,
  '编辑模式 + 预览开启 → 显示预览（正常分屏）'
)
// 各 appMode 都不得显示预览
for (const m of ['code', 'history', 'style', 'read']) {
  assert.equal(
    shouldShowRightPreview({ showPreview: true, appMode: m }),
    false,
    `appMode=${m} 不显示预览`
  )
}
assert.equal(
  shouldShowRightPreview({ showPreview: false, appMode: 'edit' }),
  false,
  '预览关闭 → 不显示预览'
)

// ── 行为：残留 showRightPanel 不得渲染空面板（样式界面不显示 bug）──
// 旧逻辑把 showRightPanel 放进渲染条件，该状态只在 LeftNav 进入样式/历史时置 true，
// 其它入口（模式菜单/工具栏/页脚）只改 appMode 不动它，退出样式后残留 true →
// 渲染一个 0 子元素的空面板（样式界面不显示、编辑器被压窄）。
assert.equal(
  shouldShowRightPanel({ appMode: 'edit', showRightPreview: false, showLibrary: false }),
  false,
  '编辑模式 + 无预览 + 无文档库 → 不渲染右栏（不得因残留 showRightPanel 渲染空面板）'
)
assert.equal(
  shouldShowRightPanel({ appMode: 'edit', showRightPreview: true, showLibrary: false }),
  true,
  '编辑模式 + 预览 → 渲染右栏'
)
assert.equal(
  shouldShowRightPanel({ appMode: 'edit', showRightPreview: false, showLibrary: true }),
  true,
  '编辑模式 + 文档库 → 渲染右栏'
)
assert.equal(
  shouldShowRightPanel({ appMode: 'style', showRightPreview: false, showLibrary: false }),
  true,
  '样式模式 → 渲染右栏（样式面板）'
)
assert.equal(
  shouldShowRightPanel({ appMode: 'style', showRightPreview: true, showLibrary: false }),
  true,
  '样式模式 → 渲染右栏'
)
for (const m of ['read', 'history']) {
  assert.equal(
    shouldShowRightPanel({ appMode: m, showRightPreview: true, showLibrary: true }),
    false,
    `appMode=${m} 不渲染右栏`
  )
}

// ── 静态：App.tsx 必须走纯函数，渲染条件不得再出现残留 showRightPanel ──
assert.match(app, /shouldShowRightPreview\(/, 'App.tsx 必须用 shouldShowRightPreview')
assert.match(app, /shouldShowRightPanel\(/, 'App.tsx 必须用 shouldShowRightPanel')
assert.doesNotMatch(app, /showRightPanel\s*\|\|/, 'App.tsx 渲染条件不得再出现 showRightPanel ||（会渲染空面板）')

// ── 静态：WYSIWYG 参数已从签名移除（tsx 不校验类型，行为断言在旧/新代码都过，
//    故用源码断言真正区分）──
const modeLayout = read('src/utils/modeLayout.ts')
assert.doesNotMatch(modeLayout, /wysiwyg/, 'modeLayout.ts 不得再引用 wysiwyg（签名已移除）')
assert.doesNotMatch(app, /shouldShowRightPreview\(\{[^}]*wysiwyg/, 'App.tsx 调用不得再传 wysiwyg')
