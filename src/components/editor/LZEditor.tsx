import React, { useRef, useEffect, useCallback } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useAIStore } from '../../store/aiStore'
import { useEditorStore } from '../../store/editorStore'
import { FloatingToolbar } from './FloatingToolbar'
import { AIPanel } from './AIPanel'
import { useDocumentSelection } from '../../hooks/useDocumentSelection'
import type { AIAction } from '../../shared/types'

const DEFAULT_CONTENT = `# Technical Notes

## Project Planning

本文档描述了 lzeditor 的设计与实现。

### 核心功能

- Markdown 编辑与实时预览
- AI 写作助手（改写/润色/续写/摘要/翻译）
- 版本历史与回滚
- 暗夜霓虹主题

### 技术栈

\`\`\`bash
npm run dev
\`\`\`

> 选中这段文字可以体验 AI 浮动工具栏 —— 点击图标即可唤起 AI 辅助。

### 下一步

* 完成 AI 代理服务器
* 接入真实 LLM API
* 打包为桌面应用
`

export const LZEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const { toolbar } = useDocumentSelection(editorRef)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)
  const setCharCount = useEditorStore((s: any) => s.setCharCount)
  const setCursorPosition = useEditorStore((s: any) => s.setCursorPosition)
  const setEditorRef = useEditorStore((s: any) => s.setEditorRef)

  React.useEffect(() => {
    setEditorRef(editorRef.current)
  }, [])

  const editor = useEditor({
    extensions: [StarterKit],
    content: DEFAULT_CONTENT,
    onUpdate: ({ editor }: any) => {
      const text = editor.getText()
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      setCharCount(text.length)
    },
    onSelectionUpdate: ({ editor }: any) => {
      const pos = editor.state.selection
      const line = editor.state.doc.nodeSize > 0
        ? editor.view.coordsAtPos(pos.from).top
        : 0
      setCursorPosition({ line: Math.max(1, Math.floor(line / 22) + 1), column: pos.from })
    },
    editable: true,
  })

  const handleToolbarAction = useCallback((action: AIAction) => {
    const selectedText = editor ? editor.state.doc.textContent.slice(editor.state.selection.from, editor.state.selection.to) : ''
    const pos = toolbar.position
    useAIStore.getState().showPanel(action, selectedText, pos)
  }, [editor, toolbar])

  useEffect(() => {
    return () => { editor?.destroy() }
  }, [editor])

  return (
    <div className="lz-editor" ref={editorRef}>
      <div className="lz-editor-content">
        <EditorContent editor={editor} />
      </div>
      <FloatingToolbar
        position={toolbar.position}
        selectedText={toolbar.selectedText}
        visible={toolbar.visible}
        onAction={handleToolbarAction}
      />
      <AIPanel />
    </div>
  )
}
