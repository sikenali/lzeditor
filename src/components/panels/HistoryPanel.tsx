import React, { useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const HistoryPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
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

  const handleRollback = () => {
    if (!selected) return
    if (editor) editor.commands.setContent(selected.html)
    setDocHTML(selected.html)
    setMdContent(selected.md)
    onClose?.()
  }

  return (
    <div className="history-main-panel">
      {/* ── Read content area ── */}
      <div className="history-scroll-area">
        {sortedVersions.length === 0 ? (
          <div className="history-empty-state">
            <span className="remix ri-history-line"></span>
            <div>暂无历史记录</div>
          </div>
        ) : (
          <div className="history-version-list">
            {sortedVersions.map((v, i) => {
              const isActive = i === currentIndex
              return (
                <button
                  key={v.id}
                  className={`history-version-row${isActive ? ' active' : ''}`}
                  onClick={() => setSelectedVersion(v.id)}
                >
                  <div className="history-version-num">v{sortedVersions.length - i}</div>
                  <div className="history-version-info">
                    <div className="history-version-date">{v.date} {v.time}</div>
                    <div className="history-version-desc">{v.desc || `${v.changes} 字修改`}</div>
                  </div>
                  <div className="history-version-changes">
                    <span>{v.changes} 字</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {selected && (
          <div className="history-preview-area">
            <div className="history-preview-header">
              <span className="remix ri-file-text-line"></span>
              <span>预览 — v{currentIndex !== -1 ? currentIndex + 1 : versions.length}</span>
              <span className="history-preview-sep">·</span>
              <span className="remix ri-calendar-event-fill"></span>
              <span>{selected.date} {selected.time}</span>
            </div>
            <div className="history-preview-doc">
              <div dangerouslySetInnerHTML={{ __html: selected.html || '<p class="history-preview-empty">空快照</p>' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom toolbar (matches style panel treatment) ── */}
      <div className="history-bottom-toolbar">
        <div className="history-toolbar-info">
          <span className="remix ri-history-fill"></span>
          <span>{docTitle || 'untitled.md'} · 自动保存</span>
          <span className="history-sep">·</span>
          <span>共 {sortedVersions.length} 个快照</span>
        </div>
        <div className="history-toolbar-actions">
          <button className="history-action-btn" onClick={() => onClose?.()}>
            <span className="remix ri-close-line"></span>
            <span>关闭</span>
          </button>
          <button
            className="history-action-btn history-action-btn--primary"
            onClick={handleRollback}
            disabled={!selected}
          >
            <span className="remix ri-rewind-back-fill"></span>
            <span>回滚到此版本</span>
          </button>
        </div>
      </div>
    </div>
  )
}
