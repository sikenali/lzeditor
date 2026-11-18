// tests/milkdown-facade.test.mjs
// Task 2：createMilkdownEditorFacade 的 WYSIWYG 语义。
//  - execCommand('selection.bold') 切出 strong mark（序列化为 **…**，不是插入字面量）
//  - execCommand('insert.heading1') 把当前块切成 heading（# 前缀，不是插入字面量）
//  - getTableContext() 在表格内返回真实上下文（非恒 null）
// 注：withEditorCore 装配链用了 Vite 专有 import.meta.glob，node/tsx 无法 import
// 整个装配；故用最小装配（commonmark + gfm + history + listener）驱动 facade，
// 完整装配由 Vite 构建 + textus-* 测试覆盖。facade 只依赖 editorViewCtx/
// serializerCtx/listenerCtx，装配无关。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
} from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { listener } from '@milkdown/kit/plugin/listener'
import { TextSelection } from '@milkdown/kit/prose/state'
import { createMilkdownEditorFacade } from '../src/components/editor/facade/milkdown/MilkdownEditorFacade'

// happy-dom 全局（node --test 每文件独立子进程，不泄漏）
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

/** 建一个最小可编辑编辑器 + runner（facade 的入口）。 */
async function makeEditor(md) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = Editor.make().use(commonmark).use(gfm).use(history).use(listener)
  editor.config((ctx) => {
    ctx.set(rootCtx, root)
    ctx.set(defaultValueCtx, md)
  })
  await editor.create()
  const runner = (fn) => editor.action(fn)
  return { editor, runner, root }
}

test('selection.bold 切出 strong mark（非 ** 字面量）', async () => {
  const { editor, runner } = await makeEditor('加粗')
  const facade = createMilkdownEditorFacade(runner, null)

  // 选中整段文本（paragraph 内 text 节点范围 [1,3)）
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 3)))
  })

  const ok = facade.execCommand('selection.bold')
  assert.equal(ok, true, 'bold 应执行成功')
  const out = facade.getText()
  assert.match(out, /\*\*加粗\*\*/, '序列化应为 **加粗**（strong mark）')
  // 不是插入字面量：不应出现两段 **
  assert.equal((out.match(/\*\*/g) ?? []).length, 2, '应只有一对 ** 分隔符')

  await editor.destroy()
})

test('insert.heading1 切当前块为 heading（# 前缀）', async () => {
  const { editor, runner } = await makeEditor('一段正文')
  const facade = createMilkdownEditorFacade(runner, null)

  const ok = facade.execCommand('insert.heading1')
  assert.equal(ok, true, 'heading1 应执行成功')
  const out = facade.getText()
  assert.match(out, /^#\s+一段正文/, '当前块应切成一级标题')
  assert.ok(!out.startsWith('# # '), '不应重复插入 # 前缀')

  await editor.destroy()
})

test('getTableContext 在表格内返回真实上下文，表格外为 null', async () => {
  const { editor, runner } = await makeEditor('表格前')
  const facade = createMilkdownEditorFacade(runner, null)

  // 表格外 → null
  assert.equal(facade.getTableContext(), null, '表格外应返回 null')

  // 插入表格（table_header_row + 2 个 table_row）
  const ok = facade.execCommand('insert.table', { rows: 3, cols: 2 })
  assert.equal(ok, true, '插入表格应成功')
  assert.match(facade.getText(), /\|/, '应序列化出 markdown 表格')

  // 把光标移进第一个 table_cell
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    let cellPos = -1
    view.state.doc.descendants((node, pos) => {
      if (cellPos === -1 && node.type.name === 'table_cell') {
        cellPos = pos
        return false
      }
      return true
    })
    assert.ok(cellPos >= 0, '应找到 table_cell')
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, cellPos + 1)),
    )
  })

  const ctx = facade.getTableContext()
  assert.notEqual(ctx, null, '表格内应返回真实上下文')
  assert.ok(ctx.rows >= 3, `rows 应 ≥3，实际 ${ctx.rows}`)
  assert.ok(ctx.cols >= 2, `cols 应 ≥2，实际 ${ctx.cols}`)

  await editor.destroy()
})

test('undo/redo 回退/重做命令', async () => {
  const { runner } = await makeEditor('原始')
  const facade = createMilkdownEditorFacade(runner, null)

  facade.execCommand('insert.heading1')
  assert.match(facade.getText(), /^#\s+原始/, '应先切成标题')

  const undone = facade.undo()
  assert.equal(undone, true, 'undo 应成功')
  assert.doesNotMatch(facade.getText(), /^#\s+/, 'undo 后应回到段落')

  const redone = facade.redo()
  assert.equal(redone, true, 'redo 应成功')
  assert.match(facade.getText(), /^#\s+原始/, 'redo 后应回到标题')
})
