import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEditorStore } from '../../store/editorStore'

export const PreviewPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const editorRef = useEditorStore((s) => s.editorRef)
  const [content, setContent] = useState('')

  useEffect(() => {
    if (editorRef) {
      // Get content from TipTap editor
      const editor = (editorRef as any)?.__tiptapEditor || editorRef
      if (editor) {
        setContent(editor.getHTML() || '')
      }
    }
  }, [editorRef])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div className="preview-title">
            <span className="remix" style={{ fontSize: 17, color: 'var(--accent-primary)' }}>\uECB0</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(242,248,251,1)' }}>预览</div>
              <div style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>Preview Mode</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix">\uE61C</span>
          </button>
        </div>

        <div className="preview-body">
          <div className="preview-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1>{children}</h1>,
                h2: ({ children }) => <h2>{children}</h2>,
                h3: ({ children }) => <h3>{children}</h3>,
                p: ({ children }) => <p>{children}</p>,
                ul: ({ children }) => <ul>{children}</ul>,
                ol: ({ children }) => <ol>{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                blockquote: ({ children }) => <blockquote>{children}</blockquote>,
                code: ({ children }) => <code>{children}</code>,
                pre: ({ children }) => <pre>{children}</pre>,
                table: ({ children }) => <table>{children}</table>,
                th: ({ children }) => <th>{children}</th>,
                td: ({ children }) => <td>{children}</td>,
                a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                img: ({ src, alt }) => <img src={src} alt={alt} style={{ maxWidth: '100%' }} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>

        <div className="preview-footer">
          <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>点击外部区域关闭预览</span>
        </div>
      </div>
    </div>
  )
}
