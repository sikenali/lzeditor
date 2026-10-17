import { Node, mergeAttributes } from '@tiptap/core'

export const ImageExt = Node.create({
  name: 'image',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      align: { default: 'top' },
    }
  },

  parseHTML() {
    return [
      { tag: 'img[src][data-align]' },
      { tag: 'img[src]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes.align || 'top'
    if (align === 'top') {
      return ['img', mergeAttributes(HTMLAttributes, { 'data-align': 'top' })]
    }
    return ['div', { class: `lz-image-wrap lz-image-wrap--${align}`, 'data-align': align },
      ['img', mergeAttributes({ ...HTMLAttributes, align: undefined })]
    ]
  },

  addCommands() {
    return {
      insertImage: (attrs: { src: string; alt?: string; align?: 'top' | 'left' | 'right' }) => ({ commands }: any) =>
        commands.insertContent({ type: this.name, attrs }),
    } as any
  },
})
