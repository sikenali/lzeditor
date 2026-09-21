import React, { useState, useMemo } from 'react'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { useEditorStore } from '../../store/editorStore'
import { copyRichText } from '../../clipboard'

function getEffectiveMd(activeDocId: string | null, storeMd: string, docsMd: Record<string, string>): string {
  if (storeMd) return storeMd
  if (docsMd[activeDocId || 'welcome']) return docsMd[activeDocId || 'welcome']
  try {
    const raw = localStorage.getItem(`lzeditor-doc-${activeDocId || 'welcome'}`)
    if (raw) {
      const d = JSON.parse(raw)
      if (d.md) return d.md
    }
  } catch {}
  return ''
}

export const PreviewPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docTitle = useEditorStore((s: any) => s.docTitle)
  const previewMode = useEditorStore((s: any) => s.previewMode)
  const setPreviewMode = useEditorStore((s: any) => s.setPreviewMode)
  const [isCodeMode, setIsCodeMode] = useState(previewMode === 'code')
  const [copied, setCopied] = useState(false)

  const effectiveMd = useMemo(() => getEffectiveMd(activeDocId, mdContent, docsMd), [activeDocId, mdContent, docsMd])

  const renderedHtml = useMemo(() => {
    if (!effectiveMd) return ''
    try {
      return remark().use(remarkGfm).use(remarkHtml).processSync(effectiveMd).toString()
    } catch {
      return effectiveMd
    }
  }, [effectiveMd])

  const handleCopyWechat = async () => {
    if (!renderedHtml) return
    const ok = await copyRichText(renderedHtml)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
              className="sidebar-wechat-btn"
              onClick={handleCopyWechat}
              title="一键复制为公众号可用富文本"
            >
              <span className={`remix ${copied ? 'ri-check-line' : 'ri-wechat-fill'}`}></span>
              {copied ? '已复制' : '公众号'}
            </button>
            <button
              className={`preview-mode-btn ${isCodeMode ? 'active' : ''}`}
              onClick={() => { setIsCodeMode(!isCodeMode); setPreviewMode(isCodeMode ? 'render' : 'code') }}
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
              <code>{effectiveMd || '# Welcome to LZEditor\n\n请切换到编辑模式后查看预览内容...'}</code>
            </pre>
          ) : (
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: renderedHtml || `<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无内容</p>` }}
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
