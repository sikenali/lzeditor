import { Node, mergeAttributes } from '@tiptap/core'

export const ImageExt = Node.create({
  name: 'image',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
    }
  },

  parseHTML() {
    return [
      { tag: 'img[src]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  addCommands() {
    return {
      insertImage: (attrs: { src: string; alt?: string }) => ({ commands }: any) =>
        commands.insertContent({ type: this.name, attrs }),
    } as any
  },
})
