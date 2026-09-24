import { Node, mergeAttributes } from '@tiptap/core'
import katex from 'katex'
import 'katex/dist/katex.min.css'

function renderMath(dom: HTMLElement, formula: string) {
  try {
    const isBlock = /^\$\$[\s\S]*\$\$$/.test(formula.trim())
    katex.render(formula || '', dom, { throwOnError: false, displayMode: isBlock })
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
    return { formula: { default: '' } }
  },

  parseHTML() {
    return [{ tag: 'span[data-formula]' }, { tag: 'div[data-formula]' }]
  },

  renderHTML({ node }) {
    const isBlock = /^\$\$[\s\S]*\$\$$/.test(node.attrs.formula || '')
    const tag = isBlock ? 'div' : 'span'
    const cls = isBlock ? 'math-block' : 'math-inline'
    return [tag, mergeAttributes({ 'data-formula': node.attrs.formula, class: cls })]
  },

  addNodeView() {
    return ({ node }: any) => {
      const isBlock = /^\$\$[\s\S]*\$\$$/.test(node.attrs.formula || '')
      const dom = document.createElement(isBlock ? 'div' : 'span')
      dom.className = isBlock ? 'math-block' : 'math-inline'
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
