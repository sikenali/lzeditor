import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const PreviewPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const docTitle = useEditorStore((s: any) => s.docTitle)
  const isCodeMode = useEditorStore((s: any) => s.isCodeMode)
  const setIsCodeMode = useEditorStore((s: any) => s.setIsCodeMode)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="preview-panel" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div className="preview-title">
            <span className="remix ri-eye-2-line" style={{ fontSize: 17, color: 'var(--accent-primary)' }}></span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>预览</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{docTitle}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className={`preview-mode-btn ${isCodeMode ? 'active' : ''}`}
              onClick={() => setIsCodeMode(!isCodeMode)}
              title="切换源码模式"
            >
              <span className="remix ri-code-line"></span>
              <span>源码</span>
            </button>
            <button className="settings-close-btn" onClick={onClose}>
              <span className="remix ri-close-line"></span>
            </button>
          </div>
        </div>

        <div className="preview-body">
          {isCodeMode ? (
            <pre className="preview-code">
              <code>{mdContent || '# Welcome to LZEditor\n\n请切换到编辑模式后查看预览内容...'}</code>
            </pre>
          ) : (
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: mdContent || '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无内容，请先编辑文档</p>' }}
            />
          )}
        </div>

        <div className="preview-footer">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {isCodeMode ? 'Markdown 源码视图' : '富文本预览'} · 点击外部区域关闭
          </span>
        </div>
      </div>
    </div>
  )
}
