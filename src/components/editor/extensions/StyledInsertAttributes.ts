import { Extension } from '@tiptap/core'

export const StyledInsertAttributes = Extension.create({
  name: 'styledInsertAttributes',

  addGlobalAttributes() {
    return [
      // 标题锚点 id 必须由 tiptap 显式声明为 attr，否则 getHTML() 序列化时会丢弃，
      // 页内锚点跳转与内部链接（App 的点击处理、LinkDialog 章节选择）就会失效。
      {
        types: ['heading'],
        attributes: {
          id: {
            default: null,
            parseHTML: element => element.id || element.getAttribute('id'),
            renderHTML: attributes => attributes.id ? { id: attributes.id } : {},
          },
        },
      },
      {
        types: ['paragraph'],
        attributes: {
          // markdown 里的 <p align="center"> 必须显式声明成 attr：
          // ProseMirror 解析未知属性会直接丢弃，保存后居中段落就再也回不来。
          align: {
            default: null,
            parseHTML: element => element.getAttribute('align') || null,
            renderHTML: attributes => attributes.align ? { align: attributes.align } : {},
          },
        },
      },
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
