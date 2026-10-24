import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Extension } from '@tiptap/core'
import { headingId } from '../../../utils/mdToHtml'

/**
 * 编辑器里新建 / 改写的标题也要有页内锚点 id。
 * mdToHtml 只负责 markdown → HTML 的转换，用户在编辑器中用快捷键或菜单
 * 生成的 h1..h6 没有 id，页内跳转与内部链接就无法指向它们。
 * 这里在每个事务后统一校正 heading 的 id 属性，并保证同名标题去重。
 */
const headingAnchorsKey = new PluginKey('headingAnchors')

export const HeadingAnchors = Extension.create({
  name: 'headingAnchors',

  addProseMirrorPlugins() {
    const spec = {
      key: headingAnchorsKey,

      appendTransaction(_trs: readonly unknown[], _oldState: unknown, newState: any) {
        const newDoc = newState.doc

        const seen = new Map<string, number>()
        const updates: { pos: number; attrs: Record<string, unknown> }[] = []

        newDoc.descendants((node: any, pos: number) => {
          if (node.type.name !== 'heading') return true
          let base = headingId(node.textContent)
          if (!base) base = 'section'
          const n = seen.get(base) || 0
          seen.set(base, n + 1)
          const id = n ? `${base}-${n + 1}` : base
          if (node.attrs.id !== id) {
            updates.push({ pos, attrs: { ...node.attrs, id } })
          }
          return true
        })

        if (!updates.length) return null

        // appendTransaction 只能返回单个事务（返回数组会让 ProseMirror 在
        // tr.setMeta 上抛错）。setNodeMarkup 只改属性、不移动位置，
        // 所以可以连续串到同一个事务上。
        let tr = newState.tr
        for (let i = updates.length - 1; i >= 0; i--) {
          tr = tr.setNodeMarkup(updates[i].pos, undefined, updates[i].attrs)
        }
        return tr
      },
    }

    return [new Plugin(spec as any)]
  },
})
