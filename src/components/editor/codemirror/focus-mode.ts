import { Decoration, EditorView } from '@codemirror/view'
import { StateEffect, StateField, RangeSetBuilder, type EditorState, type RangeSet, type Extension } from '@codemirror/state'

/**
 * 专注模式：只让光标所在段落保持正常亮度，其余行淡化。
 *
 * 用一整份 Decoration.line 的 RangeSet 表达，光标移动或文档变化时重建；
 * 其余 transaction 直接复用缓存，所以长文档里不会每次都全量扫描。
 */

const DIM = Decoration.line({ class: 'cm-focus-dim' })

export const enableFocusMode = StateEffect.define<boolean>()

function build(state: EditorState): RangeSet<Decoration> {
  const builder = new RangeSetBuilder<Decoration>()
  const cur = state.doc.lineAt(state.selection.main.from).number
  for (let i = 1; i <= state.doc.lines; i++) {
    if (i === cur) continue
    const line = state.doc.line(i)
    builder.add(line.from, line.from, DIM)
  }
  return builder.finish()
}

export const focusField = StateField.define<RangeSet<Decoration>>({
  create: () => Decoration.none,
  update(value, tr) {
    let on = value !== Decoration.none
    for (const e of tr.effects) if (e.is(enableFocusMode)) on = e.value
    if (!on) return Decoration.none
    if (value === Decoration.none || tr.docChanged || tr.selection) return build(tr.state)
    return value
  },
})

export const focusModeExtension: Extension = [focusField, EditorView.decorations.of(view => view.state.field(focusField))]
