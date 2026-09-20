import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { LFSCombo } from '../../components/ui/LFSCombo'

type LinkMode = 'external' | 'document'

export const LinkDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const editor = useEditorStore((s: any) => s.editor)
  const [mode, setMode] = useState<LinkMode>('external')
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [docName, setDocName] = useState('')
  const [heading, setHeading] = useState('')

  const handleInsert = () => {
    if (!editor) return
    const href = mode === 'external' ? linkUrl.trim() : `#${heading}`
    if (!href) return

    const { from, to } = editor.state.selection
    const hasSelection = from !== to
    const text = linkText || (mode === 'external' ? linkUrl : heading)

    const chain = editor.chain().focus()
    if (hasSelection || text) {
      if (text && !hasSelection) chain.insertContent(text)
      chain.setLink({ href, target: '_blank', rel: 'noopener noreferrer' }).run()
    }
    onClose()
  }

  const canInsert =
    mode === 'external'
      ? linkUrl.trim().startsWith('http')
      : docName && heading.trim()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog insert-dialog" onClick={e => e.stopPropagation()}>
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

        <div className="insert-dialog-body">
          <div className="insert-left-nav">
            <button
              className={`insert-nav-item ${mode === 'external' ? 'active' : ''}`}
              onClick={() => setMode('external')}
            >
              <span className="remix insert-nav-icon ri-global-line"></span>
              <span className="insert-nav-name">外部网站</span>
              <span className="insert-nav-desc">跳转到网页 URL</span>
            </button>
            <button
              className={`insert-nav-item ${mode === 'document' ? 'active' : ''}`}
              onClick={() => setMode('document')}
            >
              <span className="remix insert-nav-icon ri-file-text-line"></span>
              <span className="insert-nav-name">文档或章节</span>
              <span className="insert-nav-desc">链接到内部标题锚点</span>
            </button>
          </div>
          <div className="insert-right-pane">
            <div className="insert-preview-panel">
              <div className="export-field">
                <label className="export-label">显示文字</label>
                <input className="lfs-input" placeholder="显示的文字" value={linkText} onChange={e => setLinkText(e.target.value)} />
              </div>
              {mode === 'external' ? (
                <div className="export-field">
                  <label className="export-label">URL 地址</label>
                  <input className="lfs-input" placeholder="https:// 或 http://" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
                  {linkUrl && !linkUrl.match(/^https?:\/\//) && <span className="link-url-tip">提示：URL 需以 http:// 或 https:// 开头</span>}
                </div>
              ) : (
                <>
                  <div className="export-field">
                    <label className="export-label">文档</label>
                    <LFSCombo
                      value={docName}
                      onChange={setDocName}
                      options={[{ value: 'welcome', label: 'welcome.md' }, { value: 'notes', label: '技术笔记.md' }]}
                      placeholder="选择文档..."
                      style={{ minWidth: 200 }}
                    />
                  </div>
                  <div className="export-field">
                    <label className="export-label">章节</label>
                    <input className="lfs-input" placeholder="# 标题锚点" value={heading} onChange={e => setHeading(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="insert-dialog-actions">
              <div className="export-hint">
                <span className="remix ri-information-line"></span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>链接将插入到光标位置</span>
              </div>
              <div className="export-actions">
                <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
                <button className="settings-save-btn" onClick={handleInsert} disabled={!canInsert}>
                  <span className="remix ri-add-line"></span>
                  插入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
