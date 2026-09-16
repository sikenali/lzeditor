import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const SAMPLE_VERSIONS = [
  { id: 'v16', time: '14:32', date: '2026-09-16', desc: '完善了欢迎页内容', author: '我', changes: 48, preview: '## 快速开始\n\n- **Markdown 编辑** — 实时预览\n- **AI 写作助手** — 改写、润色' },
  { id: 'v15', time: '09:15', date: '2026-09-15', desc: '接入 Calicat 设计稿', author: '我', changes: 32, preview: '## 设计稿接入\n\n- 图标工具栏优化\n- 颜色系统统一' },
  { id: 'v14', time: '22:08', date: '2026-09-14', desc: '重构颜色系统', author: '我', changes: 64, preview: '## 颜色重构\n\n- 新增语义化颜色 token\n- 支持亮色/暗色主题切换' },
  { id: 'v13', time: '18:30', date: '2026-09-13', desc: '添加 AI 面板', author: '我', changes: 24, preview: '## AI 面板\n\n- 支持改写、润色、续写\n- 浮动工具栏' },
  { id: 'v12', time: '15:20', date: '2026-09-12', desc: '导出功能开发', author: '我', changes: 56, preview: '## 导出功能\n\n- PDF/HTML/DOCX 导出\n- 样式集选择' },
  { id: 'v11', time: '11:45', date: '2026-09-11', desc: '主题系统重构', author: '我', changes: 40, preview: '## 主题系统\n\n- 暗夜霓虹主题\n- 强调色切换' },
  { id: 'v10', time: '09:00', date: '2026-09-10', desc: '初始提交', author: '我', changes: 48, preview: '## 初始版本\n\n- 基础编辑器\n- Markdown 支持' },
]

export const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const [selectedVersion, setSelectedVersion] = useState('v16')
  const selected = SAMPLE_VERSIONS.find(v => v.id === selectedVersion)!

  const handleRollback = () => {
    setTitle(selected.desc + ' (回滚到 ' + selected.id + ')')
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
            {SAMPLE_VERSIONS.map(v => (
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
                  <span className="history-item-time">{v.date} {v.time}</span>
                  <span className="history-item-changes">{v.changes} 字符</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: preview */}
          <div className="history-preview">
            <div className="history-preview-header">
              <div className="history-preview-info">
                <span className="remix ri-ball-pen-fill"></span>
                <span className="history-preview-id">{selected.id}</span>
                <span className="history-preview-date">{selected.date} {selected.time}</span>
                <span className="history-preview-author">by {selected.author}</span>
              </div>
              <div className="history-preview-actions">
                <button className="history-btn-secondary" onClick={handleRollback}>
                  <span className="remix ri-rewind-back-fill"></span>
                  <span>回滚到此版本</span>
                </button>
                <button className="history-btn-primary">
                  <span className="remix ri-file-download-line"></span>
                  <span>下载快照</span>
                </button>
              </div>
            </div>

            <div className="history-preview-divider" />

            <div className="history-preview-content">
              <div className="history-preview-label">
                <span className="remix ri-eye-line"></span>
                <span>内容预览</span>
              </div>
              <pre className="history-preview-text">{selected.preview}</pre>
            </div>
          </div>
        </div>

        <div className="history-footer">
          <span className="remix ri-bookmark-fill" style={{ fontSize: 14, color: 'var(--amber)' }}></span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>共 {SAMPLE_VERSIONS.length} 个快照 · 最新 {selected.time}</span>
          <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
