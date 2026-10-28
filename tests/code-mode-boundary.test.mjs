import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const app = read('src/App.tsx')
const yeli = read('src/components/editor/YeliEditor.tsx')
const sidebarPreview = read('src/components/sidebar/SidebarPreview.tsx')
const layoutCss = read('src/styles/layout.css')
const readModeCss = read('src/styles/read-mode.css')
const globalsCss = read('src/styles/globals.css')
const mainTsx = read('src/main.tsx')

// ── 编辑/代码/排版三模式共用 yeli 源码编辑器，不再有独立代码分栏 ──
assert.match(app, /<YeliEditor md=\{editorMd\}/, '编辑/代码/排版模式都必须挂 YeliEditor')
assert.doesNotMatch(app, /<LZEditor|<CM6Editor/, 'App 不再引用已卸载的旧编辑器')

// ── yeli 编辑器不再用裸 textarea 编辑正文，走 contenteditable 块 ──
assert.doesNotMatch(yeli, /<textarea/, 'yeli 编辑器不套裸 textarea')

// ── 代码模式不占右栏：showRightPreview 显式排除 code ──
assert.match(app, /showRightPreview = showPreview && appMode !== 'code'/, '代码模式自己的右栏不占 App 的右面板')

// ── 预览排版共用 ──
assert.match(sidebarPreview, /className="sidebar-preview preview-pane"/, '侧栏预览要挂 preview-pane')
assert.match(layoutCss, /\.preview-pane \.preview-doc/, '预览排版规则要挂在共用前缀上')
assert.doesNotMatch(layoutCss, /\.sidebar-preview \.preview-doc/, '排版规则不该再挂 sidebar 专属前缀')
assert.match(mainTsx, /import '\.\/styles\/code-mode\.css'/, '分栏样式必须被引入')

// ── 共用样式没被误删 ──
assert.match(readModeCss, /\.read-mode-inline/, '阅读模式的容器样式必须还在')
assert.match(readModeCss, /\.read-tag\b/, 'read-tag 基类被 StyleMainPanel 用，不能删')
assert.match(globalsCss, /\.read-mode-toolbar/, '阅读模式的工具栏样式必须还在')
assert.match(globalsCss, /\.read-toc-sidebar/, '目录侧栏样式必须还在')
assert.match(globalsCss, /\.read-article-body/, '文章正文样式被阅读模式与排版面板共用')
assert.doesNotMatch(readModeCss, /read-article-code/, '旧代码模式 textarea 样式应已删除')

console.log('code mode boundary checks passed')
