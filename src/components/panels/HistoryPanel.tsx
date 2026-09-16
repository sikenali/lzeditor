import React, { useState } from 'react'

const SAMPLE_VERSIONS = [
  { id: 'v16', time: '2026-09-16 14:32', desc: '完善了欢迎页内容', author: '我', changes: 48 },
  { id: 'v15', time: '2026-09-15 09:15', desc: '接入 Calicat 设计稿', author: '我', changes: 32 },
  { id: 'v14', time: '2026-09-14 22:08', desc: '重构颜色系统', author: '我', changes: 64 },
  { id: 'v13', time: '2026-09-13 18:30', desc: '添加 AI 面板', author: '我', changes: 24 },
  { id: 'v12', time: '2026-09-12 15:20', desc: '导出功能开发', author: '我', changes: 56 },
  { id: 'v11', time: '2026-09-11 11:45', desc: '主题系统重构', author: '我', changes: 40 },
  { id: 'v10', time: '2026-09-10 09:00', desc: '初始提交', author: '我', changes: 48 },
]

const DIFF_LINES = [
  { type: 'neutral', text: '## 快速开始' },
  { type: 'removed', text: '- **Markdown 编辑** — 实时预览，所见即所得' },
  { type: 'added', text: '- **Markdown 编辑** — 实时预览，所见即所得，支持双人协作' },
  { type: 'neutral', text: '' },
  { type: 'neutral', text: '### 核心功能' },
  { type: 'removed', text: '- ~~vestibulum~~ eros.' },
  { type: 'added', text: '- 新增 **vehicula** sapien 特性' },
  { type: 'neutral', text: '' },
  { type: 'neutral', text: '```bash' },
  { type: 'neutral', text: '$ npm run dev' },
  { type: 'added', text: '$ npm run electron:build  # 新增打包命令' },
  { type: 'neutral', text: '```' },
]

const HISTOGRAM_DATA = [32, 48, 24, 56, 40, 48, 32, 64, 48, 32, 56, 48, 24, 40, 48, 32]

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedVersion, setSelectedVersion] = useState('v16')

  const selected = SAMPLE_VERSIONS.find(v => v.id === selectedVersion)!

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
            {SAMPLE_VERSIONS.map(v => (
              <div
                key={v.id}
                className={`history-item ${selectedVersion === v.id ? 'active' : ''}`}
                onClick={() => setSelectedVersion(v.id)}
              >
                <div className="history-item-dot" />
                <div>
                  <div className="history-item-version">{v.id}</div>
                  <div className="history-item-desc">{v.desc}</div>
                </div>
                <div className="history-item-right">
                  <div className="history-item-time">{v.time.split(' ')[1]}</div>
                  <div className="history-item-author">{v.author}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: diff content */}
          <div className="history-diff">
            {/* Version info bar */}
            <div className="history-version-bar">
              <div className="history-version-item">
                <span className="remix ri-ball-pen-fill"></span>
                <span>版本:</span>
                <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{selected.id}</span>
              </div>
              <div className="history-version-item">
                <span className="remix ri-calendar-event-fill"></span>
                <span>{selected.time}</span>
              </div>
              <div style={{ flex: 1 }} />
              <button className="history-btn history-btn-secondary">
                <span className="remix ri-rewind-back-fill"></span>
                <span>回滚</span>
              </button>
              <button className="history-btn history-btn-primary">
                <span className="remix ri-play-fill"></span>
                <span>重放</span>
              </button>
            </div>

            {/* Snapshot histogram */}
            <div className="history-histogram">
              {HISTOGRAM_DATA.map((h, i) => (
                <div key={i} className="histogram-bar-wrapper">
                  <div
                    className={`histogram-bar ${i === HISTOGRAM_DATA.length - 1 ? 'active' : ''}`}
                    style={{ height: `${h}px` }}
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
                <span className="legend-dot" style={{ background: 'var(--red-soft)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>删除内容</span>
              </div>
            </div>

            {/* Diff content */}
            <div className="diff-content">
              {DIFF_LINES.map((line, i) => (
                <div key={i} className={`diff-line diff-${line.type}`}>
                  <span className="diff-marker">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                  </span>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="history-footer">
          <button className="settings-cancel-btn" onClick={onClose}>取消</button>
          <button className="settings-save-btn">下载快照</button>
        </div>
      </div>
    </div>
  )
}
