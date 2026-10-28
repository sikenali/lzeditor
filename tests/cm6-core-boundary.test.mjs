import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 被禁引用的字面串用拼接构造：不让这些名字作为字面量出现在测试文件里
// （否则「grep CLEAN」会误报残留）。
const CM6_NS = ['@', 'codemirror'].join('')
const LEZER_NS = ['@', 'lezer'].join('')
const GET_CM6 = ['get', 'CM6Editor'].join('')
const CM6_EDITOR = ['CM6', 'Editor'].join('')

const yeli = read('src/components/editor/YeliEditor.tsx')
const facade = read('src/components/editor/facade/YeliEditorFacade.ts')
const registry = read('src/components/editor/facade/registry.ts')
const store = read('src/store/editorStore.ts')
const actions = read('src/components/layout/editorActions.tsx')
const search = read('src/components/panels/SearchPanel.tsx')
const history = read('src/components/panels/HistoryPanel.tsx')
const toolbar = read('src/components/layout/Toolbar.tsx')
const app = read('src/App.tsx')
const useAI = read('src/hooks/useAI.ts')
const aiApply = read('src/hooks/aiApply.ts')

// ── 唯一入口：yeli 编辑器注册 facade，取代旧编辑器入口 ──
assert.match(registry, /registerYeliFacade/, '必须提供全局注册入口')
assert.match(registry, /getYeliFacade/, '必须能取到当前 facade')
assert.match(yeli, /registerYeliFacade\(facade\)/, '编辑器挂载时必须注册 facade')
assert.match(yeli, /createYeliFacade/, '编辑器必须经 createYeliFacade 构建')
assert.doesNotMatch(yeli, new RegExp(`${GET_CM6}|${CM6_EDITOR}`), 'yeli 入口不能引用已卸载的 CM6')

// ── 写入路径全部走 facade typed 事务 ──
assert.match(facade, /setText\(markdown: string\): void/, 'facade 必须暴露 setText')
assert.match(facade, /getText\(\): string/, 'facade 必须暴露 getText')
assert.match(facade, /replaceRange\(from: number, to: number, text: string\): void/, 'facade 必须暴露 replaceRange')
assert.match(facade, /insertText\(/, 'facade 必须暴露 insertText')
assert.match(facade, /getSelection\(\): FacadeSelection \| null/, 'facade 必须暴露 getSelection')
assert.match(facade, /setSelection\(from: number, to: number\): void/, 'facade 必须暴露 setSelection')

// ── 查找/替换重接到 facade（B1）：匹配遍历 + findNext/findPrev + 替换 ──
assert.match(facade, /searchMatches\(options: SearchQueryOptions\): number/, 'facade 必须实现匹配遍历')
assert.match(facade, /findNext\(\): boolean/, 'facade 必须实现下一处')
assert.match(facade, /findPrev\(\): boolean/, 'facade 必须实现上一处')
assert.match(facade, /replaceCurrent\(text: string\): number/, 'facade 必须实现替换当前')
assert.match(facade, /replaceAll\(text: string\): number/, 'facade 必须实现全部替换')
assert.doesNotMatch(search, new RegExp(`${CM6_NS}|${GET_CM6}`), 'SearchPanel 不再依赖 CM6')
assert.match(search, /getYeliFacade\(\)/, 'SearchPanel 必须经 facade 查找')
assert.match(search, /searchMatches\(/, 'SearchPanel 必须调匹配遍历')
assert.match(search, /replaceCurrent\(/, 'SearchPanel 必须调替换当前')
assert.match(search, /replaceAll\(/, 'SearchPanel 必须调全部替换')

// ── 周边重接：历史 / AI / 大纲 / 插入对话框 ──
assert.match(history, /getYeliFacade\(\)\?\.setText\(selected\.md\)/, '历史回滚必须写 yeli facade')
assert.match(aiApply, /replaceRange\(from, to, output\)/, 'AI 应用必须写 yeli facade')
assert.match(toolbar, /getYeliFacade\(\)/, 'AI 面板必须经 facade 带选区上下文')
assert.match(app, /getYeliFacade\(\)/, '插入对话框必须接入 yeli facade')
assert.match(app, /buildTableMd/, '表格对话框必须能产出 markdown 表格')

// ── docsMd 只能按文档合并，整块替换会丢其它文档内容 ──
assert.match(store, /\.\.\.\(s\.docsMd \|\| \{\}\), \.\.\.params\.docsMd/, 'updateDoc 必须合并 docsMd 而不是整块替换')

// ── 历史去重按正文，html 为空时不能吞掉后续快照 ──
assert.match(store, /last\.md === version\.md/, 'addVersion 去重必须基于 md 正文')
assert.doesNotMatch(store, /htmlToMarkdown/, 'store 不能再依赖 TipTap 的 HTML→markdown 往返')

// ── 命令名映射不能让动作静默失败 ──
assert.match(actions, /strikeThrough: 'strikethrough'/, '大小写变体必须映射')
assert.match(actions, /PANEL_ACTIONS/, '无映射的插入动作必须打开面板')

// ── 菜单项清理（B3）：yeli 无法表达的命令不提供入口 ──
assert.doesNotMatch(actions, /label: '上角标'|label: '下角标'|label: '目录'|label: '脚注'/, '上标/下标/目录/脚注 菜单项必须移除')
assert.doesNotMatch(toolbar, /applyCmd\('underline'\)|applyCmd\('toggleHighlight'\)/, '下划线/高亮 按钮必须移除')

// ── 标题快捷键补绑（B2）：yeli assist 层拦截 Ctrl/⌘+Alt+1..6 ──
const headingShortcuts = read('src/components/editor/assist/heading-shortcuts.ts')
assert.match(headingShortcuts, /installHeadingShortcuts/, '必须导出快捷键装配')
assert.match(headingShortcuts, /block\.convert\.heading1/, 'H1 必须映射到 block.convert.heading1')
assert.match(headingShortcuts, /block\.convert\.heading/, 'H2 必须映射到 block.convert.heading')
assert.match(yeli, /installHeadingShortcuts\(shell, facade\)/, 'YeliEditor 必须装配标题快捷键')

// ── 深色主题对齐（B4）：yeli 画布接入 token 体系 ──
const yeliCss = read('src/styles/yeli-canvas.css')
assert.match(yeliCss, /--ink: var\(--color-text-primary\)/, '--ink 必须接 token')
assert.match(yeliCss, /--focus: var\(--color-primary\)/, '--focus 必须接 token')
assert.doesNotMatch(yeliCss, /--ink: #/, 'yeli 变量不能再硬编码浅色')

// ── S2 清理：TipTap 的 store 槽位、开关与样式类不能残留 ──
const settingsStore = read('src/store/settingsStore.ts')
const storeTypes = read('src/shared/types.ts')
assert.doesNotMatch(store, /setEditor\s*:/, 'store 不应再持有 TipTap 的 editor 槽位')
assert.doesNotMatch(storeTypes, /editor: any/, 'EditorStoreState 不应再声明 editor')
assert.doesNotMatch(settingsStore, /useCM6Editor/, 'useCM6Editor 开关必须随 TipTap 一起删')

// ── TipTap / ProseMirror / CM6 必须彻底下线，src 里不允许再有引用 ──
const walk = (dir) => {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx|mjs|css)$/.test(name)) out.push(full)
  }
  return out
}
const banned = walk('src').filter(f => {
  const src = readFileSync(f, 'utf8')
  return /@tiptap|@memfoldai|@milkdown|prosemirror|useEditor\(|_cm6View/.test(src)
    || src.includes(CM6_NS) || src.includes(LEZER_NS) || src.includes(GET_CM6)
    || /\bEditorContent\b/.test(src)
})
assert.deepStrictEqual(
  banned.map(f => relative(process.cwd(), f)),
  [],
  'src 不应再依赖 TipTap / ProseMirror / CodeMirror 6'
)
console.log('cm6 core boundary ok')
