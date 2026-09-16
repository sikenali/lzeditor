import React, { useState } from 'react'

const SAMPLE_VERSIONS = [
  { id: 'v3', time: '2024-05-20 14:32', desc: '添加了 AI 写作助手功能', author: '我', height: 48 },
  { id: 'v2', time: '2024-05-19 09:15', desc: '优化了编辑器性能', author: '我', height: 32 },
  { id: 'v1', time: '2024-05-18 22:08', desc: '初始版本', author: '我', height: 64 },
]

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedVersion, setSelectedVersion] = useState('v3')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-title">
            <span className="remix ri-history-fill"></span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>版本历史</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>3 个快照</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="history-body">
          {/* Version info bar */}
          <div className="history-version-bar">
            <div className="history-version-item">
              <span className="remix ri-ball-pen-fill"></span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>版本:</span>
              <span style={{ fontSize: 13, color: 'var(--amber)' }}>v3</span>
            </div>
            <div className="history-version-item">
              <span className="remix ri-calendar-event-fill"></span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>2024-05-20 14:32</span>
            </div>
            <button className="history-btn history-btn-secondary">
              <span className="remix ri-history-fill"></span>
              <span>回滚</span>
            </button>
            <button className="history-btn history-btn-primary">
              <span className="remix ri-play-fill"></span>
              <span>重放</span>
            </button>
          </div>

          {/* Snapshot histogram */}
          <div className="history-histogram">
            {[48, 32, 64, 24, 56, 40, 48, 32, 64, 48, 32, 56].map((h, i) => (
              <div key={i} className="histogram-bar-wrapper">
                <div
                  className={`histogram-bar ${i === 2 ? 'active' : ''}`}
                  style={{ height: `${h}px`, backgroundColor: i === 2 ? 'var(--accent-primary)' : 'var(--bg-hover)' }}
                />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="history-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--green-soft)', border: '1px solid var(--accent-a30)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>新增内容</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--amber)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>当前快照</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>保留内容</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--red-text)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>删除内容</span>
            </div>
          </div>
        </div>

        <div className="history-footer">
          <button className="settings-cancel-btn">取消</button>
          <button className="settings-save-btn">下载快照</button>
        </div>
      </div>
    </div>
  )
}
