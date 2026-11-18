// tests/milkdown-editor-mount.test.mjs
// Task 1：可编辑 Milkdown 编辑器机制 —— markdown 解析入、编辑后经
// markdownUpdated 带出（round-trip 不丢内容）。
// 注：withEditorCore 装配链用了 Vite 专有的 import.meta.glob（i18n/strings.ts），
// node/tsx 无法 import 整个装配（textus-* 测试因此只测叶子模块）。故此处用
// 最小可编辑装配（commonmark + listener）验证机制；完整装配由 Vite 构建 +
// textus-* 测试覆盖。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'

// happy-dom 全局（同 textus-source-control：node --test 每文件独立子进程，不泄漏）
const w = new Window()
Object.assign(globalThis, {
  window: w,
  document: w.document,
  navigator: w.navigator,
  HTMLElement: w.HTMLElement,
  HTMLImageElement: w.HTMLImageElement,
  HTMLAnchorElement: w.HTMLAnchorElement,
  HTMLInputElement: w.HTMLInputElement,
  DOMParser: w.DOMParser,
  MutationObserver: w.MutationObserver,
  CustomEvent: w.CustomEvent,
  Node: w.Node,
  DocumentFragment: w.DocumentFragment,
  Element: w.Element,
  Range: w.Range,
  Event: w.Event,
  EventTarget: w.EventTarget,
  getSelection: () => w.getSelection(),
  Document: w.Document,
  getComputedStyle: w.getComputedStyle.bind(w),
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  addEventListener: w.addEventListener.bind(w),
  removeEventListener: w.removeEventListener.bind(w),
  dispatchEvent: w.dispatchEvent.bind(w),
})

test('可编辑 Milkdown 编辑器挂载并 round-trip markdown（markdownUpdated）', async () => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const md = '# 标题\n\n一段**加粗**文本。'
  const updates = []

  const editor = Editor.make().use(commonmark).use(listener)
  editor.config((ctx) => {
    ctx.set(rootCtx, root)
    ctx.set(defaultValueCtx, md)
    ctx.get(listenerCtx).markdownUpdated((_c, next) => updates.push(next))
  })
  await editor.create()

  // listener 是 200ms 防抖：首次更新仅建立 prevDoc，第二次才触发回调。
  // 第一次事务建立基线，等防抖跑完；第二次事务才是真正要观察的变更。
  await editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(view.state.tr.insertText('基线', view.state.doc.content.size))
  })
  await new Promise(r => setTimeout(r, 250))

  await editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(view.state.tr.insertText('\n新段落', view.state.doc.content.size))
  })
  await new Promise(r => setTimeout(r, 250))

  assert.ok(updates.length > 0, 'markdownUpdated 应触发')
  const out = updates.at(-1)
  assert.match(out, /# 标题/, '应保留一级标题')
  assert.match(out, /\*\*加粗\*\*/, '应保留加粗标记')
  assert.match(out, /新段落/, '应包含新插入的内容')

  await editor.destroy()
})
