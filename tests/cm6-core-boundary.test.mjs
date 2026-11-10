import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 被禁引用的字面串用拼接构造：不让这些名字作为字面量出现在测试文件里
// （否则「grep CLEAN」会误报残留）。
const YELI_NS = ['vendor/', 'yeli'].join('')

const facade = read('src/components/editor/facade/EditorFacade.ts')
const registry = read('src/components/editor/facade/registry.ts')
const app = read('src/App.tsx')
const codeEditor = read('src/components/editor/CodeEditor.tsx')
const cm6Facade = read('src/components/editor/facade/cm6/CM6EditorFacade.ts')

// ── 唯一入口：CM6 源码编辑器注册 neutral facade ──
assert.match(registry, /registerEditorFacade/, '必须提供全局注册入口')
assert.match(registry, /getEditorFacade/, '必须能取到当前 facade')
assert.doesNotMatch(registry, /Yeli/, 'registry 不得再引用 yeli')
assert.match(codeEditor, /registerEditorFacade\(facade\)/, 'CodeEditor 挂载时必须注册 facade')
assert.match(codeEditor, /createCM6EditorFacade/, 'CodeEditor 必须经 createCM6EditorFacade 构建')
assert.doesNotMatch(codeEditor, new RegExp(YELI_NS), 'CodeEditor 不能引用 yeli vendor')

// ── App 挂载 CM6 编辑器，旧编辑器彻底下线 ──
assert.match(app, /<CodeEditor md=\{editorMd\}/, '编辑/代码/排版模式都必须挂 CodeEditor')
assert.doesNotMatch(app, /<YeliEditor|<CM6Editor|<LZEditor/, 'App 不再引用任何旧编辑器')

// ── EditorFacade 契约：写入路径全部走 typed 事务 ──
assert.match(facade, /setText\(markdown: string\): void/, 'facade 必须暴露 setText')
assert.match(facade, /getText\(\): string/, 'facade 必须暴露 getText')
assert.match(facade, /replaceRange\(from: number, to: number, text: string\): void/, 'facade 必须暴露 replaceRange')
assert.match(facade, /insertText\(/, 'facade 必须暴露 insertText')
assert.match(facade, /getSelection\(\): FacadeSelection \| null/, 'facade 必须暴露 getSelection')
assert.match(facade, /setSelection\(from: number, to: number\): void/, 'facade 必须暴露 setSelection')

// ── 查找/替换重接到 facade：匹配遍历 + findNext/findPrev + 替换 ──
assert.match(facade, /searchMatches\(options: SearchQueryOptions\): number/, 'facade 必须实现匹配遍历')
assert.match(facade, /findNext\(\): boolean/, 'facade 必须实现下一处')
assert.match(facade, /findPrev\(\): boolean/, 'facade 必须实现上一处')
assert.match(facade, /replaceCurrent\(text: string\): number/, 'facade 必须实现替换当前')
assert.match(facade, /replaceAll\(text: string\): number/, 'facade 必须实现全部替换')

// ── 源码模式：表格上下文恒 null（table.* 回退为插入 markdown 表格） ──
assert.match(facade, /getTableContext\(\): null/, 'getTableContext 必须恒为 null')

// ── CM6 facade 必须绑定 EditorView 并路由命令/搜索 ──
assert.match(cm6Facade, /from ['"]@codemirror\/view['"]/, 'CM6 facade 必须绑定 @codemirror/view')
assert.match(cm6Facade, /applyEditorCommand/, 'execCommand 必须经命令映射路由')
assert.match(cm6Facade, /createSearchSession/, '搜索必须委托 search session')

// ── TipTap / ProseMirror / yeli 必须彻底下线，src 里不允许再有引用 ──
const walk = (dir) => {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx|mjs|css)$/.test(name)) out.push(full)
  }
  return out
}
const banned = walk('src').filter((f) => {
  const src = readFileSync(f, 'utf8')
  return /@tiptap|@memfoldai|@milkdown|prosemirror|useEditor\(|_cm6View/.test(src)
    || src.includes(YELI_NS)
})
assert.deepStrictEqual(
  banned.map((f) => relative(process.cwd(), f)),
  [],
  'src 不应再依赖 TipTap / ProseMirror / yeli vendor',
)

// ── CM6 依赖已在 package.json ──
const pkg = JSON.parse(read('package.json'))
for (const dep of ['@codemirror/state', '@codemirror/view', '@codemirror/commands', '@codemirror/lang-markdown', '@lezer/markdown']) {
  assert.ok(pkg.dependencies[dep], `package.json 必须含 ${dep}`)
}
assert.ok(!pkg.dependencies['@heroicons/react'], '@heroicons/react 只被 yeli 用，必须移除')
assert.ok(!pkg.dependencies['yaml'], 'yaml 只被 yeli 用，必须移除')

console.log('cm6 core boundary ok')
