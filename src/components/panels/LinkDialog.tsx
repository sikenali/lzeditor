import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { LFSCombo } from '../../components/ui/LFSCombo'

type LinkMode = 'external' | 'document'

export const LinkDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const editorRef = useEditorStore((s: any) => s.editorRef)
  const [mode, setMode] = useState<LinkMode>('external')
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [docName, setDocName] = useState('')
  const [heading, setHeading] = useState('')

  const handleInsert = () => {
    if (!editorRef) return
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    const text = linkText || (mode === 'external' ? linkUrl : `#${heading}`)
    const href = mode === 'external' ? linkUrl : `#${heading}`

    const a = document.createElement('a')
    a.href = href
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.textContent = text
    a.style.color = 'var(--accent-primary)'
    a.style.textDecoration = 'none'

    range.deleteContents()
    range.insertNode(a)
    range.setStartAfter(a)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    onClose()
  }

  const canInsert =
    mode === 'external'
      ? linkUrl.trim().startsWith('http')
      : docName && heading.trim()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()} style={{ width: 460 }}>
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-link"></span>
            <div>
              <div className="export-title-text">插入链接</div>
              <div className="export-title-desc">选择链接类型</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="export-body">
          {/* Mode tabs */}
          <div className="link-mode-tabs">
            <button
              className={`link-mode-tab ${mode === 'external' ? 'active' : ''}`}
              onClick={() => setMode('external')}
            >
              <span className="remix ri-global-line"></span>
              <span>外部网站</span>
            </button>
            <button
              className={`link-mode-tab ${mode === 'document' ? 'active' : ''}`}
              onClick={() => setMode('document')}
            >
              <span className="remix ri-file-text-line"></span>
              <span>文档或章节</span>
            </button>
          </div>

          {/* Link text label */}
          <div className="export-field">
            <label className="export-label">链接到（文字）</label>
            <input
              className="lfs-input"
              placeholder="显示的文字"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
            />
          </div>

          {mode === 'external' ? (
            <div className="export-field">
              <label className="export-label">URL 地址</label>
              <input
                className="lfs-input"
                placeholder="https:// 或 http://"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
              />
              {linkUrl && !linkUrl.match(/^https?:\/\//) && (
                <span className="link-url-tip">提示：URL 需以 http:// 或 https:// 开头</span>
              )}
            </div>
          ) : (
            <>
              <div className="export-field">
                <label className="export-label">文档</label>
                <LFSCombo
                  value={docName}
                  onChange={setDocName}
                  options={[
                    { value: 'welcome', label: 'welcome.md' },
                    { value: 'notes', label: '技术笔记.md' },
                  ]}
                  placeholder="选择文档..."
                  style={{ minWidth: 200 }}
                />
              </div>
              <div className="export-field">
                <label className="export-label">章节</label>
                <input
                  className="lfs-input"
                  placeholder="# 标题锚点"
                  value={heading}
                  onChange={e => setHeading(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="export-footer">
          <div className="export-hint">
            <span className="remix ri-information-line"></span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>链接将插入到光标位置</span>
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
            <button
              className="settings-save-btn"
              onClick={handleInsert}
              disabled={!canInsert}
            >
              <span className="remix ri-checkbox-fill"></span>
              插入
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
