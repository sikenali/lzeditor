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

  const commitShortHash = (id: string) => {
    const n = parseInt(id, 10)
    return n.toString(16).slice(-6)
  }

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

  const handleBarClick = (id: string) => {
    setSelectedVersion(id)
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

      {/* ── 下部：版本信息 + 时间线柱状图 ── */}
      {sortedVersions.length > 0 && (
        <div className="history-timeline-bar">
          {/* 版本信息头 */}
          {selected && (
            <div className="history-version-info">
              <span className="history-version-label">
                <span className="remix ri-git-commit-line history-version-hash-icon"></span>
                <span className="history-version-num">版本 #{currentIndex !== -1 ? currentIndex + 1 : versions.length}</span>
                <span className="history-version-hash">({commitShortHash(selected.id)})</span>
                <span className="history-version-date">{selected.date} {selected.time}</span>
              </span>
              <div className="history-version-actions">
                <button className="history-action-btn" onClick={handleRollback}>
                  <span className="remix ri-arrow-go-back-line"></span>
                  <span>回滚</span>
                </button>
                <button className="history-action-btn" onClick={() => {}}>
                  <span className="remix ri-restart-line"></span>
                  <span>重播</span>
                </button>
                <button className="history-action-btn" onClick={onClose}>
                  <span className="remix ri-close-line"></span>
                  <span>关闭</span>
                </button>
              </div>
            </div>
          )}
          {/* 时间线柱状图 */}
          <div className="history-timeline">
            {sortedVersions.map((v, i) => {
              const isActive = i === currentIndex
              const barH = Math.max((v.changes / maxChanges) * 56, 4)
              return (
                <div
                  key={v.id}
                  className={`history-bar${isActive ? ' active' : ''}`}
                  onClick={() => handleBarClick(v.id)}
                >
                  <div
                    className="history-bar-body"
                    style={{ height: `${barH}px` }}
                  >
                    <div
                      className="history-bar-base"
                      style={{ height: '100%' }}
                    />
                  </div>
                  <span className="history-bar-label">{sortedVersions.length - i}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
