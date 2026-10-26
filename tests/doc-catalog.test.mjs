import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Window } from 'happy-dom'

// 只为了 localStorage；不用 Node 自带的全局，它在这个版本里没有 Storage。
const win = new Window()
globalThis.window = win.window
globalThis.localStorage = win.localStorage

const { persistCatalog, restoreSession, mergeDocs, DEFAULT_LIBRARIES } =
  await import('../src/utils/docCatalog.ts')

// 模拟 editorStore 的 DEFAULT_DOCS：出厂文档全部带 builtin 标记，
// readme 故意不带 system（LibraryTree 靠它给 readme 显示「还原出厂内容」）。
const builtin = [
  { id: 'readme', title: 'README.md', path: 'Default', libraryId: 'default', builtin: true },
  { id: 'a01-特色功能', title: 'A01', path: '使用手册', libraryId: 'manual', system: true, builtin: true },
]

const catalogOf = (docs, extra = {}) => ({
  docs,
  docLibraries: DEFAULT_LIBRARIES,
  nextUntitledIdx: 1,
  activeDocId: 'readme',
  ...extra,
})

test('persistCatalog 只存用户文档，出厂文档靠 builtin 标记被过滤', () => {
  localStorage.clear()
  assert.equal(persistCatalog(catalogOf([{ id: 'u1', title: '我的文档', path: 'Default' }, ...builtin], { activeDocId: 'u1' })), true)
  const raw = JSON.parse(localStorage.getItem('lzeditor-catalog'))
  assert.deepEqual(raw.docs.map(d => d.id), ['u1'], '出厂文档不该落盘')
})

test('restoreSession 把用户文档放回库，出厂文档重新拼上，顺序是用户在前', () => {
  localStorage.clear()
  persistCatalog(catalogOf([{ id: 'u1', title: '我的文档', path: 'Default' }], { nextUntitledIdx: 2, activeDocId: 'u1' }))
  const s = restoreSession(builtin, 'readme')
  assert.deepEqual(s.docs.map(d => d.id), ['u1', 'readme', 'a01-特色功能'])
  assert.equal(s.docs[0].system, undefined, '用户文档不标 system')
  assert.equal(s.docs[1].system, undefined, 'readme 出厂时故意不标 system')
  assert.equal(s.docs[2].system, true, '手册篇标 system')
  assert.equal(s.activeDocId, 'u1')
  assert.equal(s.nextUntitledIdx, 2)
})

test('存档指向已删除的文档时回落到默认活动文档', () => {
  localStorage.clear()
  persistCatalog(catalogOf([{ id: 'u1', title: 't' }], { activeDocId: '已删除的 id' }))
  assert.equal(restoreSession(builtin, 'readme').activeDocId, 'readme')
})

test('没有任何存档时回落到出厂列表，readme 保持不标 system', () => {
  localStorage.clear()
  const s = restoreSession(builtin, 'readme')
  assert.deepEqual(s.docs.map(d => d.id), builtin.map(d => d.id))
  assert.equal(s.docs[0].system, undefined, 'readme 不能变成 system')
  assert.equal(s.activeDocId, 'readme')
  assert.equal(s.nextUntitledIdx, 1)
})

test('localStorage 里是坏 JSON 时静默回落，不抛错', () => {
  localStorage.clear()
  localStorage.setItem('lzeditor-catalog', '{这不是 JSON')
  const s = restoreSession(builtin, 'readme')
  assert.equal(s.docs.length, 2)
})

test('存档里混入出厂 id 时按 id 去重，不出现重复条目', () => {
  localStorage.clear()
  // 手工写，不走 persistCatalog——正常流程不会把 readme 存下来，这里模拟脏数据
  localStorage.setItem('lzeditor-catalog', JSON.stringify({
    docs: [
      { id: 'readme', title: 'README.md', path: 'Default' },
      { id: 'u1', title: '我的文档', path: 'Default' },
    ],
    docLibraries: DEFAULT_LIBRARIES,
    nextUntitledIdx: 1,
    activeDocId: 'readme',
  }))
  const merged = mergeDocs(
    JSON.parse(localStorage.getItem('lzeditor-catalog')).docs,
    builtin,
  )
  assert.deepEqual(merged.map(d => d.id), ['readme', 'u1', 'a01-特色功能'])
  assert.equal(new Set(merged.map(d => d.id)).size, merged.length, '没有重复条目')
})

test('存档里库列表为空时回落到 Default 库', () => {
  localStorage.clear()
  localStorage.setItem('lzeditor-catalog', JSON.stringify({
    docs: [], docLibraries: [], nextUntitledIdx: 1, activeDocId: 'readme',
  }))
  assert.deepEqual(restoreSession(builtin, 'readme').docLibraries, DEFAULT_LIBRARIES)
})
