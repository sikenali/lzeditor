import React, { useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const HistoryPanel: React.FC<{ onClose?: () => void; inline?: boolean }> = ({ onClose, inline }) => {
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
  const currentIndex = sortedVersions.findIndex(v => v.id === selected?.id)
  const maxChanges = useMemo(() =>
    Math.max(...sortedVersions.map(v => v.changes), 1),
    [sortedVersions]
  )

  const handleRollback = () => {
    if (!selected) return
    if (editor) editor.commands.setContent(selected.html)
    setDocHTML(selected.html)
    setMdContent(selected.md)
    onClose?.()
  }

  if (inline) {
    return (
      <div className="history-bottom-bar">
        <div className="history-bottom-inner">
          <div className="history-toolbar">
            <div className="history-toolbar-info">
              <span className="remix ri-history-fill"></span>
              <span>{docTitle || 'untitled.md'} · 自动保存</span>
            </div>
            <div className="history-toolbar-actions">
              <button className="history-action-btn" onClick={handleRollback}>
                <span className="remix ri-rewind-back-fill"></span>
                <span>回滚</span>
              </button>
              <button className="history-action-btn">
                <span className="remix ri-replay-fill"></span>
                <span>重播</span>
              </button>
              <button className="history-action-btn" onClick={() => onClose?.()}>
                <span className="remix ri-close-line"></span>
                <span>关闭</span>
              </button>
            </div>
          </div>

          {sortedVersions.length > 0 && (
            <div className="history-timeline">
              {sortedVersions.map((v, i) => {
                const isActive = i === currentIndex
                const barH = Math.max((v.changes / maxChanges) * 64, 6)
                return (
                  <div key={v.id} className={`history-bar${isActive ? ' active' : ''}`}>
                    <div className="history-bar-body" style={{ height: `${barH}px`, background: isActive ? 'var(--accent-primary)' : undefined, borderColor: isActive ? 'var(--accent-primary)' : undefined }}>
                      <div className="history-bar-base" style={{ height: isActive ? `${barH * 0.35}px` : '8px', background: isActive ? 'var(--accent-primary)' : undefined }} />
                    </div>
                    <span className={`history-bar-label${isActive ? ' active' : ''}`}>{sortedVersions.length - i}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="history-meta">
            {sortedVersions[0] && (
              <>
                <span className="remix ri-calendar-event-fill"></span>
                <span>{sortedVersions[0].date} {sortedVersions[0].time}</span>
                <span className="history-sep">·</span>
                <span>{sortedVersions[0].changes} 字</span>
                <span className="history-sep">·</span>
                <span>共 {sortedVersions.length} 个快照</span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <div className="history-header-left">
          <span className="history-header-icon"><span className="remix ri-history-fill"></span></span>
          <div>
            <div className="history-header-title">历史记录</div>
            <div className="history-header-desc">{docTitle || 'untitled.md'} · 自动保存</div>
          </div>
        </div>
        <button className="history-close-btn" onClick={onClose}>
          <span className="remix ri-close-line"></span>
        </button>
      </div>

      <div className="history-body">
        <div className="history-version-list">
          {sortedVersions.length === 0 ? (
            <div className="history-empty">暂无历史记录</div>
          ) : (
            sortedVersions.map((v, i) => {
              const isCurrent = i === currentIndex
              return (
                <button
                  key={v.id}
                  className={`history-version-item${isCurrent ? ' current' : ''}`}
                  onClick={() => setSelectedVersion(v.id)}
                >
                  <div className="history-version-meta">
                    <span className="history-version-num">v{i + 1}</span>
                    <span className="history-version-time">{v.date} {v.time}</span>
                    <span className="history-version-desc">{v.desc}</span>
                  </div>
                  <span className="history-version-changes">{v.changes} 字</span>
                </button>
              )
            })
          )}
        </div>

        <div className="history-preview">
          <div className="history-preview-header">
            <span className="remix ri-file-text-line"></span>
            <span>版本 #{currentIndex !== -1 ? currentIndex + 1 : versions.length}</span>
            <span className="history-preview-sep">·</span>
            <span className="remix ri-calendar-event-fill"></span>
            <span className="history-preview-date">{selected?.date ?? '-'} {selected?.time ?? ''}</span>
          </div>
          <div className="history-preview-card">
            {selected ? (
              <div className="history-preview-doc" dangerouslySetInnerHTML={{ __html: selected.html || '<p>空快照</p>' }} />
            ) : (
              <div className="history-preview-empty">
                <span className="remix ri-file-text-line"></span>
                <span>暂无可预览快照</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="history-footer">
        <div className="history-footer-info">
          <span className="remix ri-bookmark-fill"></span>
          <span>共 {sortedVersions.length} 个快照</span>
          {selected && <span className="history-footer-sep">·</span>}
          {selected && <span>最新 {selected.date} {selected.time}</span>}
        </div>
        <div className="history-footer-actions">
          <button className="history-btn history-btn-close" onClick={onClose}>关闭</button>
          <button className="history-btn history-btn-rollback" onClick={handleRollback} disabled={!selected}>
            <span className="remix ri-rewind-back-fill"></span>
            <span>回滚到此版本</span>
          </button>
        </div>
      </div>
    </div>
  )
}
