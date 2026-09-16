import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const SAMPLE_VERSIONS = [
  { id: '9', time: '5:49 AM', date: 'Mar 14, 2017', desc: '完善了欢迎页内容', author: '我', changes: 48 },
  { id: '8', time: '4:32 AM', date: 'Mar 14, 2017', desc: '接入 Calicat 设计稿', author: '我', changes: 32 },
  { id: '7', time: '3:15 AM', date: 'Mar 13, 2017', desc: '重构颜色系统', author: '我', changes: 64 },
  { id: '6', time: '2:08 AM', date: 'Mar 13, 2017', desc: '添加 AI 面板', author: '我', changes: 24 },
  { id: '5', time: '1:45 AM', date: 'Mar 12, 2017', desc: '导出功能开发', author: '我', changes: 56 },
  { id: '4', time: '12:30 AM', date: 'Mar 12, 2017', desc: '主题系统重构', author: '我', changes: 40 },
  { id: '3', time: '11:20 AM', date: 'Mar 11, 2017', desc: '初始提交', author: '我', changes: 48 },
]

// Bar heights from design (max=110px), scaled to CSS percentage
const HISTOGRAM_BARS = [38, 54, 30, 46, 38, 44, 52, 34, 106, 58, 66, 40, 62, 48, 56, 70]

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const [selectedVersion, setSelectedVersion] = useState('9')
  const selected = SAMPLE_VERSIONS.find(v => v.id === selectedVersion)!
  const currentIdx = SAMPLE_VERSIONS.findIndex(v => v.id === selectedVersion)
  const maxBarH = Math.max(...HISTOGRAM_BARS)

  const handleRollback = () => {
    setTitle(`回滚到 ${selected.id}: ${selected.desc}`)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        {/* Version info row */}
        <div className="history-version-bar">
          <div className="history-version-meta">
            <span className="remix history-meta-icon ri-ball-pen-fill"></span>
            <span className="history-meta-label">Version</span>
            <span className="history-meta-value">{selected.id}.0</span>
            <span className="history-meta-sep">·</span>
            <span className="remix history-meta-icon ri-calendar-event-fill"></span>
            <span className="history-meta-date">{selected.date} {selected.time}</span>
          </div>
          <div className="history-version-actions">
            <button className="history-btn-rollback" onClick={handleRollback}>
              <span className="remix ri-rewind-back-fill"></span>
              <span>回滚</span>
            </button>
            <button className="history-btn-replay">
              <span className="remix ri-play-fill"></span>
              <span>重放</span>
            </button>
          </div>
        </div>

        {/* Histogram */}
        <div className="history-histogram">
          {HISTOGRAM_BARS.map((h, i) => {
            const isCurrent = i === currentIdx
            const darkH = Math.round((h / maxBarH) * 88)
            const lightH = h - darkH
            return (
              <div key={i} className={`histogram-col${isCurrent ? ' current' : ''}`}>
                <div className={`histogram-bar${isCurrent ? ' current' : ''}`}>
                  <div className="histogram-bar-dark" style={{ height: `${darkH}px` }} />
                  <div className="histogram-bar-light" style={{ height: `${lightH}px` }} />
                </div>
                <span className="histogram-label">{i + 1}</span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="history-legend">
          <div className="legend-item">
            <span className="legend-swatch legend-swatch-added" />
            <span className="legend-text">新增字符数</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch legend-swatch-kept" />
            <span className="legend-text">保留字符数</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch legend-swatch-current" />
            <span className="legend-text legend-text-current">当前查看（快照 {currentIdx + 1}）</span>
          </div>
          <div className="legend-item legend-tip">
            <span className="remix ri-information-fill"></span>
            <span className="legend-text legend-text-tip">共 {SAMPLE_VERSIONS.length} 个快照 · 最新快照 {selected.time}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="history-footer">
          <span className="remix ri-bookmark-fill" style={{ fontSize: 14, color: 'var(--amber)' }}></span>
          <span className="history-footer-text">共 {SAMPLE_VERSIONS.length} 个快照 · 最新 {selected.time}</span>
          <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
