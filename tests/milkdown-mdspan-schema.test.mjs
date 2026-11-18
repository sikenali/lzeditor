// tests/milkdown-mdspan-schema.test.mjs
// Task 2 回归：Milkdown facade 的 selection.* 在 **textus 完整 schema**（md_span/
// md_code_span/link 节点、无 strong/emphasis mark）下的 schema 感知路径。
//
// textus 装配用 commonmarkWithoutMarks（排除 strong/emphasis/inline_code/link
// 等 mark），加粗/斜体/删除线/内联代码是 md_span/md_code_span 节点。facade 必须
// 在「有 md_span 节点」时走 toggleSpan/toggleFormat/toggleCodeSpan，而非
// toggleMark（marks.strong 为 undefined 会崩）。本测试用最小 md_span 装配验证
// 该分支；完整装配由 tests/e2e/milkdown-smoke.test.mjs（真实浏览器）覆盖。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core'
import { history } from '@milkdown/kit/plugin/history'
import { listener } from '@milkdown/kit/plugin/listener'
import { TextSelection } from '@milkdown/kit/prose/state'
import { createMilkdownEditorFacade } from '../src/components/editor/facade/milkdown/MilkdownEditorFacade'
import { commonmarkWithoutMarks, gfmWithoutStrikethrough } from '../src/additional/milkdown/textus/editor/markdown/reduced-presets'
import { mdSpanSchema } from '../src/additional/milkdown/textus/editor/marks/md-span-schema'
import { mdCodeSpanSchema } from '../src/additional/milkdown/textus/editor/marks/md-span-schema'
import { linkSchema } from '../src/additional/milkdown/textus/editor/markdown/link-source'

// happy-dom 全局
const w = new Window()
Object.assign(globalThis, {
  window: w, document: w.document, navigator: w.navigator,
  HTMLElement: w.HTMLElement, HTMLImageElement: w.HTMLImageElement,
  HTMLAnchorElement: w.HTMLAnchorElement, HTMLInputElement: w.HTMLInputElement,
  DOMParser: w.DOMParser, MutationObserver: w.MutationObserver,
  CustomEvent: w.CustomEvent, Node: w.Node, DocumentFragment: w.DocumentFragment,
  Element: w.Element, Range: w.Range, Event: w.Event, EventTarget: w.EventTarget,
  getSelection: () => w.getSelection(), Document: w.Document,
  getComputedStyle: w.getComputedStyle.bind(w),
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  addEventListener: w.addEventListener.bind(w),
  removeEventListener: w.removeEventListener.bind(w),
  dispatchEvent: w.dispatchEvent.bind(w),
})

/** textus schema 的最小装配：commonmark（无 mark）+ gfm（无 strike）+ md_span 节点。 */
async function makeTextusEditor(md) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = Editor.make()
    .use(commonmarkWithoutMarks)
    .use(gfmWithoutStrikethrough)
    .use(mdSpanSchema)
    .use(mdCodeSpanSchema)
    .use(linkSchema)
    .use(history)
    .use(listener)
  editor.config((ctx) => {
    ctx.set(rootCtx, root)
    ctx.set(defaultValueCtx, md)
  })
  await editor.create()
  const runner = (fn) => editor.action(fn)
  return { editor, runner }
}

/** 选中整段文本（单段 paragraph 内 [1, 1+len)）。 */
function selectAll(editor, text) {
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 1 + text.length)))
  })
}

test('textus schema：selection.bold 走 md_span → **text**（非 strong mark）', async () => {
  const { editor, runner } = await makeTextusEditor('加粗')
  const facade = createMilkdownEditorFacade(runner, null)
  selectAll(editor, '加粗')
  const ok = facade.execCommand('selection.bold')
  assert.equal(ok, true, 'bold 应成功（schema 感知走 md_span）')
  assert.match(facade.getText(), /\*\*加粗\*\*/, '应序列化为 **加粗**')
  await editor.destroy()
})

test('textus schema：selection.italic 走 md_span → *text*', async () => {
  const { editor, runner } = await makeTextusEditor('斜体')
  const facade = createMilkdownEditorFacade(runner, null)
  selectAll(editor, '斜体')
  const ok = facade.execCommand('selection.italic')
  assert.equal(ok, true, 'italic 应成功')
  assert.match(facade.getText(), /\*斜体\*/, '应序列化为 *斜体*')
  await editor.destroy()
})

test('textus schema：selection.strike 走 md_span ~ → ~~text~~', async () => {
  const { editor, runner } = await makeTextusEditor('删除线')
  const facade = createMilkdownEditorFacade(runner, null)
  selectAll(editor, '删除线')
  const ok = facade.execCommand('selection.strike')
  assert.equal(ok, true, 'strike 应成功')
  assert.match(facade.getText(), /~~删除线~~/, '应序列化为 ~~删除线~~')
  await editor.destroy()
})

test('textus schema：selection.code 走 md_code_span → `text`', async () => {
  const { editor, runner } = await makeTextusEditor('内联码')
  const facade = createMilkdownEditorFacade(runner, null)
  selectAll(editor, '内联码')
  const ok = facade.execCommand('selection.code')
  assert.equal(ok, true, 'code 应成功')
  assert.match(facade.getText(), /`内联码`/, '应序列化为 `内联码`')
  await editor.destroy()
})

test('textus schema：selection.clear 解开 md_span（加粗 → 纯文本）', async () => {
  const { editor, runner } = await makeTextusEditor('清除')
  const facade = createMilkdownEditorFacade(runner, null)
  selectAll(editor, '清除')
  facade.execCommand('selection.bold')
  assert.match(facade.getText(), /\*\*清除\*\*/, '先加粗')
  // 再选整段清除格式
  selectAll(editor, '清除')
  const ok = facade.execCommand('selection.clear')
  assert.equal(ok, true, 'clear 应成功')
  assert.doesNotMatch(facade.getText(), /\*\*/, '清除后不应有 ** 分隔符')
  assert.match(facade.getText(), /清除/, '内容保留')
  await editor.destroy()
})

test('textus schema：selection.link 创建 link 节点（不崩）', async () => {
  const { editor, runner } = await makeTextusEditor('链接字')
  const facade = createMilkdownEditorFacade(runner, null)
  selectAll(editor, '链接字')
  const ok = facade.execCommand('selection.link', { url: 'https://example.com' })
  assert.equal(ok, true, 'link 应成功')
  // 直接查 ProseMirror doc：应存在一个 link 节点（序列化需 linkSource remark 扩展，
  // 属最小装配之外，故不调 getText）。
  let linkCount = 0
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.state.doc.descendants((node) => {
      if (node.type.name === 'link') linkCount += 1
    })
  })
  assert.equal(linkCount, 1, '应创建一个 link 节点')
  await editor.destroy()
})
