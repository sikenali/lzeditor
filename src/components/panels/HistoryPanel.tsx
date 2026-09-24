import React, { useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const HistoryPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
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

  return (
    <div className="history-main-panel">
      {/* ── 上部：版本预览 ── */}
      <div className="history-scroll-area">
        {sortedVersions.length === 0 ? (
          <div className="history-empty-state">
            <span className="remix ri-history-line"></span>
            <div>暂无历史记录</div>
          </div>
        ) : selected ? (
          <>
            <div className="history-preview-header">
              <span className="remix ri-file-text-line"></span>
              <span>版本 #{currentIndex !== -1 ? currentIndex + 1 : versions.length}</span>
              <span className="history-preview-sep">·</span>
              <span className="remix ri-calendar-event-fill"></span>
              <span>{selected.date} {selected.time}</span>
              <span className="history-preview-sep">·</span>
              <span>{selected.changes} 字</span>
            </div>
            <div className="history-preview-doc">
              <div dangerouslySetInnerHTML={{ __html: selected.html || '<p class="history-preview-empty">空快照</p>' }} />
            </div>
          </>
        ) : (
          <div className="history-empty-state">
            <span className="remix ri-history-line"></span>
            <div>暂无历史记录</div>
          </div>
        )}
      </div>

      {/* ── 下部：时间线柱状图 ── */}
      {sortedVersions.length > 0 && (
        <div className="history-timeline-bar">
          <div className="history-timeline">
            {sortedVersions.map((v, i) => {
              const isActive = i === currentIndex
              const barH = Math.max((v.changes / maxChanges) * 64, 6)
              return (
                <div key={v.id} className={`history-bar${isActive ? ' active' : ''}`}>
                  <div
                    className="history-bar-body"
                    style={{ height: `${barH}px`, background: isActive ? 'var(--accent-primary)' : undefined, borderColor: isActive ? 'var(--accent-primary)' : undefined }}
                  >
                    <div
                      className="history-bar-base"
                      style={{ height: isActive ? `${barH * 0.35}px` : '8px', background: isActive ? 'var(--accent-primary)' : undefined }}
                    />
                  </div>
                  <span className={`history-bar-label${isActive ? ' active' : ''}`}>{sortedVersions.length - i}</span>
                </div>
              )
            })}
          </div>
          {/* ── 底部操作栏 ── */}
          <div className="history-bottom-actions">
            <button className="history-action-btn" onClick={() => onClose?.()} title="关闭">
              <span className="remix ri-close-line"></span>
              <span>关闭</span>
            </button>
            <button
              className="history-action-btn history-action-btn--primary"
              onClick={handleRollback}
              disabled={!selected}
              title="回滚到此版本"
            >
              <span className="remix ri-rewind-back-fill"></span>
              <span>回滚到此版本</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
