import React, { useState } from 'react'

const SAMPLE_VERSIONS = [
  { id: 'v3', time: '2024-05-20 14:32', desc: '添加了 AI 写作助手功能', author: '我' },
  { id: 'v2', time: '2024-05-19 09:15', desc: '优化了编辑器性能', author: '我' },
  { id: 'v1', time: '2024-05-18 22:08', desc: '初始版本，暗夜霓虹主题', author: '我' },
]

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedVersion, setSelectedVersion] = useState('v3')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-title">
            <span className="remix" style={{ fontSize: 18, color: 'var(--accent-primary)' }}>\uE617</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>版本历史</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{SAMPLE_VERSIONS.length} 个快照</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix">\uE61C</span>
          </button>
        </div>

        <div className="history-body">
          <div className="history-list">
            {SAMPLE_VERSIONS.map((v, i) => (
              <div
                key={v.id}
                className={`history-item ${selectedVersion === v.id ? 'active' : ''}`}
                onClick={() => setSelectedVersion(v.id)}
              >
                <div className="history-item-left">
                  <div className="history-item-dot" />
                  <div>
                    <div className="history-item-version">v{i + 1}</div>
                    <div className="history-item-desc">{v.desc}</div>
                  </div>
                </div>
                <div className="history-item-right">
                  <div className="history-item-time">{v.time}</div>
                  <div className="history-item-author">{v.author}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="history-diff">
            <div className="diff-header">
              <span className="remix" style={{ fontSize: 14, color: 'var(--accent-primary)' }}>\uE8E9</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>版本差异</span>
            </div>
            <div className="diff-content">
              <div className="diff-line diff-added">
                <span className="diff-marker">+</span>
                <span>Sed hendrerit ligula in tempus</span>
              </div>
              <div className="diff-line diff-removed">
                <span className="diff-marker">-</span>
                <span>mollis vestibulum eros</span>
              </div>
              <div className="diff-line diff-neutral">
                <span>eros. Aliquam pellentesque vehicula.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="history-footer">
          <button className="settings-cancel-btn">还原此版本</button>
          <button className="settings-save-btn">下载快照</button>
        </div>
      </div>
    </div>
  )
}
