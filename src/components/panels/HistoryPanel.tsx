import React, { useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
        <div className="history-version-bar">
          <div className="history-version-meta">
            <span className="remix history-meta-icon ri-ball-pen-fill"></span>
            <span className="history-meta-label">版本</span>
            <span className="history-meta-value">#{currentIdx !== -1 ? currentIdx + 1 : versions.length}</span>
            <span className="history-meta-sep">·</span>
            <span className="remix history-meta-icon ri-calendar-event-fill"></span>
            <span className="history-meta-date">{selected?.date} {selected?.time}</span>
          </div>
          <div className="history-version-actions">
            <button className="history-btn-rollback" onClick={handleRollback} disabled={!selected}>
              <span className="remix ri-rewind-back-fill"></span>
              <span>回滚</span>
            </button>
            <button className="history-btn-replay" disabled>
              <span className="remix ri-play-fill"></span>
              <span>重放</span>
            </button>
          </div>
        </div>

        {/* Version list */}
        <div className="history-list">
          {sortedVersions.length === 0 ? (
            <div className="history-empty">暂无历史记录</div>
          ) : (
            sortedVersions.map((v, i) => (
              <div
                key={v.id}
                className={`history-item${selected?.id === v.id ? ' active' : ''}`}
                onClick={() => setSelectedVersion(v.id)}
              >
                <span className="history-item-time">{v.date} {v.time}</span>
                <span className="history-item-desc">{v.desc}</span>
                <span className="history-item-changes">{v.changes} 字符</span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="history-footer">
          <span className="remix ri-bookmark-fill" style={{ fontSize: 14, color: 'var(--amber)' }}></span>
          <span className="history-footer-text">共 {sortedVersions.length} 个快照 · 最新 {selected?.time ?? '无'}</span>
          <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
