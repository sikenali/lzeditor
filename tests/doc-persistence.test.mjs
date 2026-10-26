import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// 结构性断言。pendingSave.ts 不能直接 import——它经 editorStore → constants.ts
// 链式 require() 读原始内容文件，在 node 测试里加载不了。
// 这类接线靠行为测试覆盖不了，只能锁源码形状。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const cm6 = read('src/components/editor/CM6Editor.tsx')
const store = read('src/store/editorStore.ts')
const pendingSave = read('src/utils/pendingSave.ts')
const catalog = read('src/utils/docCatalog.ts')

test('待存内容在防抖回调外登记，落盘走统一入口', () => {
  assert.match(cm6, /setPendingEdit\(\{ md: text, html \}\)/, '防抖窗口内登记待存内容')
  assert.match(cm6, /persistEdit\(docId, \{ md: text, html \}\)/, '防抖到期走 persistEdit')
  assert.doesNotMatch(cm6, /localStorage\.setItem/, 'CM6 不该再直接写 localStorage')
  assert.doesNotMatch(cm6, /catch \{\}/, '静默吞掉的 catch 必须清掉')
})

test('pagehide 与 hidden 两条路都会兜底落盘', () => {
  assert.match(cm6, /addEventListener\('pagehide'/)
  assert.match(cm6, /visibilityState === 'hidden'/)
  assert.match(cm6, /flushPendingEdit\(\)/)
})

test('两个监听器都有对应的 remove，不泄漏', () => {
  assert.match(cm6, /removeEventListener\('pagehide'/)
  assert.match(cm6, /removeEventListener\('visibilitychange'/)
})

test('配额写满走 silentError + toast，不再静默 catch', () => {
  assert.match(pendingSave, /silentError\(/)
  assert.match(pendingSave, /toast\(/)
  assert.match(pendingSave, /if \(!warned\)/, '一次会话只提示一次')
})

test('toast 被单独兜住——pagehide 时 document.body 可能已经没了', () => {
  assert.match(pendingSave, /try \{[\s\S]{0,200}toast\(/, 'toast 调用外面要有 try')
})

test('四个会改目录的动作都持久化，switchDoc 不持久化', () => {
  // 只数独立成行的调用，函数定义那行也含 saveCatalog() 字样
  const count = (store.match(/^\s+saveCatalog\(\);?$/gm) || []).length
  assert.equal(count, 4, `saveCatalog 应该正好四处调用，实际 ${count} 处`)

  const i = store.indexOf('switchDoc: (id: string)')
  const j = store.indexOf('closeDoc: (id: string)')
  assert.ok(i !== -1 && j !== -1 && j > i, '找到 switchDoc 和 closeDoc')
  // 用区间而不是正则窗口：switchDoc 后面紧跟着 closeDoc，
  // 按固定字符数往后扫会扫到 closeDoc 的 saveCatalog，测试就假失败了
  assert.doesNotMatch(store.slice(i, j), /saveCatalog/, 'switchDoc 自己的代码里不该持久化')
})

test('store 启动时从存档恢复文档库', () => {
  assert.match(store, /restoreSession\(/)
  assert.match(store, /DEFAULT_DOCS/)
  assert.match(store, /docLibraries: restored\.docLibraries/)
  assert.match(store, /nextUntitledIdx: restored\.nextUntitledIdx/)
  assert.match(store, /activeDocId: restored\.activeDocId/)
})

test('出厂文档用 builtin 标记，不占用 system 语义', () => {
  assert.match(catalog, /!d\.builtin/, 'persistCatalog 按 builtin 过滤')
  assert.doesNotMatch(catalog, /system: d\.system \?\? true/, '不能替 readme 强标 system')
  assert.match(catalog, /builtinDocs\.slice\(\)/, '无存档回落时原样保留出厂标记')
})
