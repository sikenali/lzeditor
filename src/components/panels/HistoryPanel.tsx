import React, { useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const docTitle = useEditorStore((s) => s.docTitle)
  const versions = useEditorStore((s) => s.versions)
  const setDocHTML = useEditorStore((s) => s.setDocHTML)
  const setMdContent = useEditorStore((s) => s.setMdContent)
  const editor = useEditorStore((s) => s.editor)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)

  const sortedVersions = useMemo(() =>
    [...versions].sort((a, b) => Number(b.id) - Number(a.id)),
    [versions]
  )

  const selected = sortedVersions.find(v => v.id === selectedVersion) ?? sortedVersions[0] ?? null
  const currentIdx = sortedVersions.findIndex(v => v.id === selected?.id)

  const handleRollback = () => {
    if (!selected) return
    if (editor) {
      editor.commands.setContent(selected.html)
    }
    setDocHTML(selected.html)
    setMdContent(selected.md)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-title">
            <span className="remix history-title-icon ri-history-fill"></span>
            <div>
              <div className="history-title-text">历史记录</div>
              <div className="history-title-desc">{docTitle || 'untitled.md'} · 默认保留最近 10 次</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="history-body">
          <aside className="history-list">
            {sortedVersions.length === 0 ? (
              <div className="history-empty">暂无历史记录</div>
            ) : (
              sortedVersions.map((v, i) => (
                <button
                  key={v.id}
                  className={`history-item${selected?.id === v.id ? ' active' : ''}`}
                  onClick={() => setSelectedVersion(v.id)}
                >
                  <span className="history-item-index">#{i + 1}</span>
                  <span className="history-item-main">
                    <span className="history-item-time">{v.date} {v.time}</span>
                    <span className="history-item-desc">{v.desc}</span>
                  </span>
                  <span className="history-item-changes">{v.changes} 字</span>
                </button>
              ))
            )}
          </aside>

          <section className="history-preview">
            <div className="history-version-bar">
              <div className="history-version-meta">
                <span className="remix history-meta-icon ri-file-text-line"></span>
                <span className="history-meta-label">版本</span>
                <span className="history-meta-value">#{currentIdx !== -1 ? currentIdx + 1 : versions.length}</span>
                <span className="history-meta-sep">·</span>
                <span className="remix history-meta-icon ri-calendar-event-fill"></span>
                <span className="history-meta-date">{selected?.date ?? '-'} {selected?.time ?? ''}</span>
              </div>
            </div>
            <div className="history-preview-card">
              {selected ? (
                <div className="history-preview-doc" dangerouslySetInnerHTML={{ __html: selected.html || '<p>空快照</p>' }} />
              ) : (
                <div className="history-preview-empty">暂无可预览快照</div>
              )}
            </div>
          </section>
        </div>

        <div className="history-footer">
          <div className="history-footer-text">
            <span className="remix ri-bookmark-fill"></span>
            <span>共 {sortedVersions.length} 个快照 · 最新 {selected?.time ?? '无'}</span>
          </div>
          <div className="history-version-actions">
            <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
            <button className="settings-save-btn" onClick={handleRollback} disabled={!selected}>
              <span className="remix ri-rewind-back-fill"></span>
              <span>回滚到此版本</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
