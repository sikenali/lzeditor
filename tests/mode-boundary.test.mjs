import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const actions = read('src/components/layout/editorActions.tsx')
const app = read('src/App.tsx')
const sidebarPreview = read('src/components/sidebar/SidebarPreview.tsx')
const appCss = read('src/styles/app.css')

// ── 模式菜单只有 预览/代码/排版 三项 ──
assert.match(actions, /label: '预览模式', action: 'preview'/, '模式菜单必须有预览模式')
assert.match(actions, /label: '代码模式', action: 'code'/, '模式菜单必须有代码模式')
assert.match(actions, /label: '排版模式', action: 'style'/, '模式菜单必须有排版模式')
assert.doesNotMatch(actions, /action: 'read'/, '阅读模式必须退出模式菜单')

// ── 预览模式驱动分屏预览，不再弹模态面板 ──
const modeBlock = actions.match(/const modeAction[\s\S]*?\n  \}, \[\]\)/)?.[0] ?? ''
assert.match(modeBlock, /st\.setShowPreview\(next\)/, '预览模式必须驱动右栏分屏预览')
assert.doesNotMatch(modeBlock, /setOpenPanel\(/, '模式动作不应再弹模态预览面板')
assert.match(modeBlock, /st\.appMode === action \? 'edit' : action/, '代码/排版模式必须可切换回来')
assert.match(sidebarPreview, /useScrollSync/, '分屏预览必须接滚动同步')

// ── 排版模式：左源码 + 右栏样式面板，样式面板不独占内容区 ──
assert.match(app, /class="style-mode-stack">|className="style-mode-stack"/, '排版模式必须把样式面板装进右栏')
assert.match(app, /app-right-panel--style/, '排版模式右栏必须有专属宽度')
assert.match(app, /appMode !== 'code'/, '代码模式必须不给右栏留位')

// 两种导航布局下点「样式」都得有面板承载：只把预览藏掉而面板不出现，用户看到的就是点了没反应
const topLayout = app.match(/const topLayout = \([\s\S]*?<\/>\n  \)/)?.[0] ?? ''
const leftLayout = app.match(/const leftLayout = \([\s\S]*?<\/div>\n  \)/)?.[0] ?? ''
assert.equal(topLayout.length > 0, true, '必须能定位到顶部布局')
assert.equal(leftLayout.length > 0, true, '必须能定位到左侧布局')
assert.match(topLayout, /style-mode-stack/, '顶部布局点「样式」必须有样式面板')
assert.match(leftLayout, /style-mode-stack/, '左侧布局点「样式」必须有样式面板')

// ── 滚动同步需要唯一滚动容器：CM6 不能锁死高度 ──
assert.match(appCss, /overflow: visible/, 'CM6 内部不能自己滚动')

console.log('mode boundary checks passed')
