import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const app = read('src/App.tsx')
const codeEditor = read('src/components/editor/CodeEditor.tsx')
const sidebarPreview = read('src/components/sidebar/SidebarPreview.tsx')
const layoutCss = read('src/styles/layout.css')
const readModeCss = read('src/styles/read-mode.css')
const globalsCss = read('src/styles/globals.css')
const mainTsx = read('src/main.tsx')

// ── 编辑/代码/排版三模式共用 CM6 源码编辑器，不再有独立代码分栏 ──
assert.match(app, /<CodeEditor md=\{editorMd\}/, '编辑/代码/排版模式都必须挂 CodeEditor')
assert.doesNotMatch(app, /<YeliEditor|<CM6Editor|<LZEditor/, 'App 不再引用任何旧编辑器')

// ── CM6 编辑器不套裸 textarea，走 cm-editor 内容区 ──
assert.doesNotMatch(codeEditor, /<textarea/, 'CM6 编辑器不套裸 textarea')
assert.match(codeEditor, /createCM6EditorFacade/, 'CodeEditor 必须经 CM6 facade 构建')
assert.match(codeEditor, /styles\/code-editor\.css/, 'code-editor.css 必须被引入')

// ── 代码模式不占右栏：shouldShowRightPreview 显式排除 code/history/style/read（逻辑在 modeLayout.ts）──
const modeLayout = read('src/utils/modeLayout.ts')
assert.match(modeLayout, /appMode !== 'code'/, '代码模式自己的右栏不占 App 的右面板')
assert.match(modeLayout, /appMode !== 'history'/, '历史模式不给右栏留位')
assert.match(modeLayout, /appMode !== 'style'/, '排版模式不给右栏留位')
assert.match(modeLayout, /appMode !== 'read'/, '阅读模式不给右栏留位')
assert.match(app, /shouldShowRightPreview\(/, 'App 必须经 shouldShowRightPreview 派生预览可见性')

// ── 预览排版共用 ──
assert.match(sidebarPreview, /className="sidebar-preview preview-pane"/, '侧栏预览要挂 preview-pane')
assert.match(layoutCss, /\.preview-pane \.preview-doc/, '预览排版规则要挂在共用前缀上')
assert.doesNotMatch(layoutCss, /\.sidebar-preview \.preview-doc/, '排版规则不该再挂 sidebar 专属前缀')

// ── 共用样式没被误删 ──
assert.match(readModeCss, /\.read-mode-inline/, '阅读模式的容器样式必须还在')
assert.match(readModeCss, /\.read-tag\b/, 'read-tag 基类被 StyleMainPanel 用，不能删')
assert.doesNotMatch(readModeCss, /nav-hidden:hover/, '浮导航不靠 hover 显示（点内容区才显示）')
// 浮导航必须绝对悬浮在内容之上（非 sticky 兄弟节点：sticky 在 style-main-panel 的兄弟上不生效，
// 会渲染成内容与样式面板之间的整宽白条，按钮操作看似失效）
const navFloatBlock = readModeCss.match(/\.main-nav-float\s*\{[^}]*\}/)?.[0] || ''
assert.match(navFloatBlock, /position:\s*absolute/, '浮导航绝对定位于内容之上，不占 flex 流')
assert.doesNotMatch(navFloatBlock, /position:\s*sticky/, '浮导航不再用 sticky（兄弟节点上不生效）')
assert.match(globalsCss, /\.read-mode-toolbar/, '阅读模式的工具栏样式必须还在')
assert.doesNotMatch(globalsCss, /read-toc/, 'read-toc 死 CSS 已清理（组件已移除）')
assert.doesNotMatch(readModeCss, /read-toc/, 'read-mode 的 read-toc 死 CSS 已清理')
assert.match(globalsCss, /\.read-article-body/, '文章正文样式被阅读模式与排版面板共用')
assert.doesNotMatch(readModeCss, /read-article-code/, '旧代码模式 textarea 样式应已删除')

// ── 预览里 mermaid / echarts 事后增强（替代 yeli canvas 渲染器） ──
assert.match(sidebarPreview, /renderMermaidBlocks/, '预览必须 hydrate mermaid')
assert.match(sidebarPreview, /renderEchartsBlocks/, '预览必须 hydrate echarts')

console.log('code mode boundary checks passed')
