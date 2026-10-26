import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const lz = read('src/components/editor/LZEditor.tsx')
const splitter = read('src/components/splitter/Splitter.tsx')
const split = read('src/utils/split.ts')
const app = read('src/App.tsx')
const sidebarPreview = read('src/components/sidebar/SidebarPreview.tsx')
const layoutCss = read('src/styles/layout.css')
const readModeCss = read('src/styles/read-mode.css')
const floatingCss = read('src/styles/floating.css')
const globalsCss = read('src/styles/globals.css')
const codeModeCss = read('src/styles/code-mode.css')
const mainTsx = read('src/main.tsx')

// ── 几何：夹住边界，两栏都不低于最小宽度 ──
assert.match(split, /SPLITTER_WIDTH/, '必须导出分割线宽度常量')
assert.match(split, /MIN_PANE_WIDTH/, '必须导出最小栏宽常量')
assert.match(split, /export function clampRatio/, '必须导出 clampRatio')
assert.match(split, /export function ratioFromPointer/, '必须导出 ratioFromPointer')
assert.match(split, /export function gridColumns/, '必须导出 gridColumns')

// ── 分割线 ──
assert.match(splitter, /role="separator"/, '分割线必须有 separator 角色')
assert.match(splitter, /aria-orientation="vertical"/, '竖分隔线要声明方向')
assert.match(splitter, /aria-valuenow=\{Math\.round\(ratio \* 100\)\}/, '要报出当前占比')
assert.match(splitter, /onKeyDown=\{onKeyDown\}/, '分割线必须可键盘调整')
assert.match(splitter, /ArrowLeft/, '左箭头缩小编辑栏')
assert.match(splitter, /ArrowRight/, '右箭头放大编辑栏')
assert.match(splitter, /onDoubleClick/, '双击复位到 50/50')
assert.match(splitter, /setPointerCapture/, '拖拽要捕获指针，移出窗口也不掉')

// ── 代码模式不再有裸 textarea 与阅读器壳 ──
assert.doesNotMatch(lz, /<textarea/, '代码模式不再用裸 textarea')
assert.doesNotMatch(lz, /read-article-code/, '不再套阅读器壳的正文容器')
assert.doesNotMatch(lz, /read-mode-code/, '不再套阅读器壳的根容器')
assert.doesNotMatch(lz, /codeEditMd/, '不再自己维护一份编辑缓冲区')
assert.doesNotMatch(lz, /handleCodeModeChange/, '内容写入走 CM6 的 onChange')

// ── 分栏接线 ──
assert.match(lz, /gridColumns\(codeSplitRatio, splitWidth\)/, '代码模式必须按分栏比例排 grid')
assert.match(lz, /<Splitter/, '两栏之间必须挂分割线')
assert.match(lz, /updateSetting\('codeSplitRatio'/, '拖出的比例必须落盘')
assert.match(lz, /codeSplitRatio \?\? 0\.5/, '没存过比例时按 50/50 开')

// ── CM6 不被重建 ──
assert.match(lz, /className="code-source-pane"[^>]*>[\s\S]*?<CM6Editor/, 'CM6 必须挂在 code-source-pane 里')
assert.doesNotMatch(lz, /cm6Visible/, '不再靠 display:none 切代码模式，那会让 CM6 反复重建')

// ── 滚动容器与同步 ──
assert.match(lz, /codeMode\s*\n\s*\?\s*editorRef\.current\?\.querySelector\('\.lz-editor-page'\)/, '代码模式滚容器要指到左栏真正能滚的那一层')
assert.doesNotMatch(lz, /sourcePaneRef/, '滚动权在 .lz-editor-page，别把 ref 留在不滚的 pane 上')
assert.match(lz, /enabled: codeMode/, '滚动同步只在代码模式启用')
assert.match(lz, /useScrollSync/, '分栏预览必须接滚动同步')
assert.match(lz, /\{ lines: true \}/, '预览块要带源码行号，同步才能按行对位')
assert.match(lz, /lz-code-preview-typography-css/, '预览排版样式要用独立 style 节点')
assert.match(lz, /renderMermaidBlocks/, '预览里的 mermaid 代码块要真渲染')
assert.match(codeModeCss, /overflow-y: auto/, '预览栏要能独立滚动')

// ── App 层不变：代码模式不占右面板 ──
assert.match(app, /appMode !== 'code'/, '代码模式自己的右栏不占 App 的右面板')

// ── 共用样式没被误删 ──
assert.match(readModeCss, /\.read-mode-inline/, '阅读模式的容器样式必须还在')
assert.match(readModeCss, /\.read-tag\b/, 'read-tag 基类被 StyleMainPanel 用，不能删')
assert.match(readModeCss, /\.read-tag-tech/, 'read-tag-tech 被 StyleMainPanel 用，不能删')
assert.match(globalsCss, /\.read-mode-toolbar/, '阅读模式的工具栏样式必须还在')
assert.match(globalsCss, /\.read-toc-sidebar/, '目录侧栏样式必须还在')
assert.match(globalsCss, /\.read-article-body/, '文章正文样式被阅读模式与排版面板共用')
assert.doesNotMatch(readModeCss, /read-article-code/, '旧代码模式 textarea 样式应已删除')
assert.doesNotMatch(floatingCss, /read-mode-code/, '旧代码模式容器样式应已删除')

// ── 预览排版共用 ──
assert.match(sidebarPreview, /className="sidebar-preview preview-pane"/, '侧栏预览要挂 preview-pane')
assert.match(layoutCss, /\.preview-pane \.preview-doc/, '预览排版规则要挂在共用前缀上')
assert.doesNotMatch(layoutCss, /\.sidebar-preview \.preview-doc/, '排版规则不该再挂 sidebar 专属前缀')
assert.match(layoutCss, /\.sidebar-preview \.sidebar-scroll/, '侧栏布局规则保持不变')
assert.match(mainTsx, /import '\.\/styles\/code-mode\.css'/, '分栏样式必须被引入')

console.log('code mode boundary checks passed')
