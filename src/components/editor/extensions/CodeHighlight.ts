import { Extension } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, all } from 'lowlight'

const lowlight = createLowlight(all)

export const CodeHighlight = Extension.create({
  name: 'codeHighlight',

  addExtensions() {
    return [
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ]
  },
})
