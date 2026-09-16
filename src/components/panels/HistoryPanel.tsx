import React, { useState } from 'react'

const SAMPLE_VERSIONS = [
  { id: 'v3', time: '2024-05-20 14:32', desc: '添加了 AI 写作助手功能', author: '我', height: 48 },
  { id: 'v2', time: '2024-05-19 09:15', desc: '优化了编辑器性能', author: '我', height: 32 },
  { id: 'v1', time: '2024-05-18 22:08', desc: '初始版本，暗夜霓虹主题', author: '我', height: 64 },
]

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedVersion, setSelectedVersion] = useState('v3')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-title">
            <span className="remix" style={{ fontSize: 18, color: 'var(--accent-primary)' }}>\uEE16</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(242,248,251,1)' }}>版本历史</div>
              <div style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>3 个快照</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix">\uEB99</span>
          </button>
        </div>

        <div className="history-body">
          {/* Version info bar */}
          <div className="history-version-bar">
            <div className="history-version-item">
              <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}>\uEA8D</span>
              <span style={{ fontSize: 13, color: 'rgba(125,139,153,1)' }}>版本:</span>
              <span style={{ fontSize: 13, color: 'rgba(255,228,92,1)' }}>v3</span>
            </div>
            <div className="history-version-item">
              <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}>\uEB24</span>
              <span style={{ fontSize: 13, color: 'rgba(139,152,165,1)' }}>2024-05-20 14:32</span>
            </div>
            <button className="history-btn history-btn-secondary">
              <span className="remix" style={{ fontSize: 14 }}>\uF064</span>
              <span>回滚</span>
            </button>
            <button className="history-btn history-btn-primary">
              <span className="remix" style={{ fontSize: 14 }}>\uEB99</span>
              <span>重放</span>
            </button>
          </div>

          {/* Snapshot histogram */}
          <div className="history-histogram">
            {[48, 32, 64, 24, 56, 40, 48, 32, 64, 48, 32, 56].map((h, i) => (
              <div key={i} className="histogram-bar-wrapper">
                <div
                  className={`histogram-bar ${i === 2 ? 'active' : ''}`}
                  style={{ height: `${h}px`, backgroundColor: i === 2 ? 'rgba(57,255,158,1)' : 'rgba(38,49,60,1)' }}
                />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="history-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'rgba(18,51,38,1)', border: '1px solid rgba(57,255,158,0.3)' }} />
              <span style={{ fontSize: 11, color: 'rgba(125,139,153,1)' }}>新增内容</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'rgba(255,228,92,1)' }} />
              <span style={{ fontSize: 11, color: 'rgba(125,139,153,1)' }}>当前快照</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'rgba(38,49,60,1)', border: '1px solid rgba(51,64,76,1)' }} />
              <span style={{ fontSize: 11, color: 'rgba(125,139,153,1)' }}>保留内容</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'rgba(255,138,138,1)' }} />
              <span style={{ fontSize: 11, color: 'rgba(125,139,153,1)' }}>删除内容</span>
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
