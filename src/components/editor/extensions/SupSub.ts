import { Mark, mergeAttributes } from '@tiptap/core'

export const Superscript = Mark.create({
  name: 'superscript',
  excludes: 'subscript',
  parseHTML() {
    return [
      { tag: 'sup' },
      { style: 'vertical-align', getAttrs: (v: string) => v === 'super' ? {} : false },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes), 0]
  },
  addCommands() {
    return {
      toggleSuperscript: () => ({ commands }: any) =>
        commands.toggleMark(this.name),
    } as any
  },
})

export const Subscript = Mark.create({
  name: 'subscript',
  excludes: 'superscript',
  parseHTML() {
    return [
      { tag: 'sub' },
      { style: 'vertical-align', getAttrs: (v: string) => v === 'sub' ? {} : false },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['sub', mergeAttributes(HTMLAttributes), 0]
  },
  addCommands() {
    return {
      toggleSubscript: () => ({ commands }: any) =>
        commands.toggleMark(this.name),
    } as any
  },
})
