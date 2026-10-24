import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Extension } from '@tiptap/core'
import { ReplaceStep } from '@tiptap/pm/transform'
import { useSettingsStore } from '../../../store/settingsStore'

/**
 * 中日韩文字与英文数字之间自动补一个空格。
 *
 * 早期实现挂在 DOM 的 input 事件上，但 ProseMirror 何时把 DOM 变更同步进文档
 * 取决于 MutationObserver 是否已跑完，同一段逻辑在两种时序下插入位置差一位。
 * 改用 appendTransaction：事务已应用、文档状态确定，边界位置唯一。
 *
 * 开关从 settingsStore 实时读取，避免开关切换要重建扩展、重建编辑器。
 */

const cjkSpaceKey = new PluginKey('cjkAutoSpace')

const isCJK = (ch: string) =>
  /^[\u2e80-\u2fff\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]$/.test(ch)
const isAsciiWord = (ch: string) => /^[0-9A-Za-z]$/.test(ch)

/** 一侧汉字类、另一侧英文数字类，且相邻无空白 → 需要补空格。 */
function needsSpace(left: string | null, right: string | null): boolean {
  if (!left || !right) return false
  if (/\s/.test(left) || /\s/.test(right)) return false
  return (isCJK(left) && isAsciiWord(right)) || (isAsciiWord(left) && isCJK(right))
}

export const CJKAutoSpace = Extension.create({
  name: 'cjkAutoSpace',

  addProseMirrorPlugins() {
    const plugin = new Plugin({
      key: cjkSpaceKey,

      appendTransaction(trs, oldState, newState) {
        if (!useSettingsStore.getState().autoSpaceCJK) return null
        if (!newState.doc.eq(oldState.doc)) return null

        // 只看最后一条事务的最后一步，也就是用户刚敲下的那个点
        const lastTr = trs[trs.length - 1]
        const steps = lastTr.steps
        if (!steps.length) return null
        // 输入类事务都是 ReplaceStep，其 from/to 相对 tr.apply 后的文档（即 newState）有效
        const lastStep = steps[steps.length - 1]
        if (!(lastStep instanceof ReplaceStep)) return null
        const from = lastStep.from
        const to = lastStep.to
        if (from === to) return null

        const { doc, selection } = newState
        if (from < 0 || to > doc.content.size) return null
        if (selection.from < from || selection.to > to) return null

        const first = doc.textBetween(from, Math.min(to, from + 1), '\u0000') || null
        const last = doc.textBetween(Math.max(from, to - 1), to, '\u0000') || null
        const left = doc.textBetween(Math.max(0, from - 1), from, '\u0000') || null
        const right = doc.textBetween(to, Math.min(doc.content.size, to + 1), '\u0000') || null

        const before = needsSpace(left, first)
        const after = needsSpace(last, right)
        if (!before && !after) return null

        let tr = newState.tr
        if (before) tr = tr.insertText(' ', from)
        if (after) tr = tr.insertText(' ', before ? to + 1 : to)

        // 光标落在刚输入内容的右侧
        const selPos = Math.min(tr.mapping.map(to) + (after ? 1 : 0), tr.doc.content.size)
        tr.setSelection(TextSelection.create(tr.doc, selPos))
        return tr
      },
    })

    return [plugin]
  },
})
