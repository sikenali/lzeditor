import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const SAMPLE_VERSIONS = [
  { id: 'v16', time: '14:32', date: '2026-09-16', desc: '完善了欢迎页内容', changes: 48 },
  { id: 'v15', time: '09:15', date: '2026-09-15', desc: '接入 Calicat 设计稿', changes: 32 },
  { id: 'v14', time: '22:08', date: '2026-09-14', desc: '重构颜色系统', changes: 64 },
  { id: 'v13', time: '18:30', date: '2026-09-13', desc: '添加 AI 面板', changes: 24 },
  { id: 'v12', time: '15:20', date: '2026-09-12', desc: '导出功能开发', changes: 56 },
  { id: 'v11', time: '11:45', date: '2026-09-11', desc: '主题系统重构', changes: 40 },
  { id: 'v10', time: '09:00', date: '2026-09-10', desc: '初始提交', changes: 48 },
]

const HISTOGRAM_DATA = [32, 48, 24, 56, 40, 48, 32, 64, 48, 32, 56, 48, 24, 40, 48, 32]

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const [selectedVersion, setSelectedVersion] = useState('v16')
  const selected = SAMPLE_VERSIONS.find(v => v.id === selectedVersion)!
  const currentIndex = SAMPLE_VERSIONS.findIndex(v => v.id === selectedVersion)

  const handleRollback = () => {
    setTitle(`回滚到 ${selected.id}: ${selected.desc}`)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="history-header">
          <div className="history-title">
            <span className="remix ri-history-fill"></span>
            <div>
              <div className="history-title-text">版本历史</div>
              <div className="history-title-desc">{SAMPLE_VERSIONS.length} 个快照</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="history-body">
          {/* Left: version list */}
          <div className="history-list">
            {SAMPLE_VERSIONS.map((v, i) => (
              <div
                key={v.id}
                className={`history-item ${selectedVersion === v.id ? 'active' : ''}`}
                onClick={() => setSelectedVersion(v.id)}
              >
                <div className="history-item-dot" />
                <div className="history-item-content">
                  <div className="history-item-version">{v.id}</div>
                  <div className="history-item-desc">{v.desc}</div>
                </div>
                <div className="history-item-meta">
                  <span className="history-item-time">{v.time}</span>
                  <span className="history-item-changes">{v.changes}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: preview + histogram */}
          <div className="history-preview">
            {/* Version info bar */}
            <div className="history-version-bar">
              <div className="history-version-info">
                <span className="remix ri-ball-pen-fill history-version-icon"></span>
                <span className="history-version-label">Version</span>
                <span className="history-version-id">{selected.id.replace('v', '')}.0</span>
                <span className="history-version-sep">·</span>
                <span className="remix ri-calendar-event-fill history-date-icon"></span>
                <span className="history-version-date">{selected.date} {selected.time}</span>
              </div>
              <div className="history-version-actions">
                <button className="history-btn-secondary" onClick={handleRollback}>
                  <span className="remix ri-rewind-back-fill"></span>
                  <span>回滚</span>
                </button>
                <button className="history-btn-primary">
                  <span className="remix ri-play-fill"></span>
                  <span>重放</span>
                </button>
              </div>
            </div>

            {/* Histogram */}
            <div className="history-histogram">
              {HISTOGRAM_DATA.map((h, i) => (
                <div key={i} className="histogram-bar-wrapper">
                  <div
                    className={`histogram-bar ${i === HISTOGRAM_DATA.length - 1 - currentIndex ? 'active' : ''}`}
                    style={{ height: `${h}px` }}
                  >
                    <div className="histogram-bar-shadow" />
                    <div className="histogram-bar-fill" />
                  </div>
                  <span className="histogram-label">{i + 1}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="history-legend">
              <div className="legend-item">
                <span className="legend-dot legend-dot-added" />
                <span>新增字符数</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot-kept" />
                <span>保留字符数</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot-current" />
                <span>当前查看（快照 {currentIndex + 1}）</span>
              </div>
              <div className="legend-item legend-tip">
                <span className="remix ri-information-fill"></span>
                <span>共 {HISTOGRAM_DATA.length} 个快照 · 最新快照 {selected.time}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="history-footer">
          <span className="remix ri-bookmark-fill" style={{ fontSize: 14, color: 'var(--amber)' }}></span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>共 {SAMPLE_VERSIONS.length} 个快照 · 最新 {selected.time}</span>
          <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
