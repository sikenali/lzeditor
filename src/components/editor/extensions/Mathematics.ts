import { Node, mergeAttributes } from '@tiptap/core'
import katex from 'katex'
import 'katex/dist/katex.min.css'

function renderMath(dom: HTMLElement, formula: string) {
  try {
    katex.render(formula || '', dom, { throwOnError: false, displayMode: false })
  } catch {
    dom.textContent = `$${formula}$`
  }
}

export const Mathematics = Node.create({
  name: 'mathematics',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      formula: { default: '' },
    }
  },

  parseHTML() {
    return [
      { tag: 'span[data-formula]' },
    ]
  },

  renderHTML({ node }) {
    return ['span', mergeAttributes({ 'data-formula': node.attrs.formula, class: 'math-inline' })]
  },

  addNodeView() {
    return ({ node }: any) => {
      const dom = document.createElement('span')
      dom.className = 'math-inline'
      dom.setAttribute('data-formula', node.attrs.formula)
      renderMath(dom, node.attrs.formula)
      return { dom }
    }
  },

  addCommands() {
    return {
      insertMath: (formula: string) => ({ commands }: any) =>
        commands.insertContent({ type: this.name, attrs: { formula } }),
    } as any
  },
})
