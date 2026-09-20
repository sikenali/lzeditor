import { Extension } from '@tiptap/core'

export const StyledInsertAttributes = Extension.create({
  name: 'styledInsertAttributes',

  addGlobalAttributes() {
    return [
      {
        types: ['blockquote', 'codeBlock', 'horizontalRule', 'superscript'],
        attributes: {
          class: {
            default: null,
            parseHTML: element => element.getAttribute('class'),
            renderHTML: attributes => attributes.class ? { class: attributes.class } : {},
          },
          'data-insert': {
            default: null,
            parseHTML: element => element.getAttribute('data-insert'),
            renderHTML: attributes => attributes['data-insert'] ? { 'data-insert': attributes['data-insert'] } : {},
          },
        },
      },
    ]
  },
})
