import React, { useMemo, useState } from 'react'

interface TableDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
  onInsert: (rows: number, cols: number) => void
}

const PRESETS = [
  { id: 'basic', label: '基础表格', desc: '3 x 3 常规内容', icon: 'ri-table-2', rows: 3, cols: 3 },
  { id: 'compare', label: '对比表格', desc: '适合双列比较', icon: 'ri-layout-column-line', rows: 4, cols: 2 },
  { id: 'plan', label: '计划表', desc: '任务与进度排期', icon: 'ri-calendar-check-line', rows: 5, cols: 4 },
  { id: 'data', label: '数据表', desc: '多列结构化数据', icon: 'ri-database-2-line', rows: 6, cols: 5 },
]

export const TableDropdown: React.FC<TableDropdownProps> = ({ open, onToggle, onInsert }) => {
  const [active, setActive] = useState(PRESETS[0].id)
  const preset = PRESETS.find(p => p.id === active) || PRESETS[0]
  const [rows, setRows] = useState(preset.rows)
  const [cols, setCols] = useState(preset.cols)

  const cells = useMemo(() => (
    Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => `${r}-${c}`))
  ), [rows, cols])

  if (!open) return null

  const choosePreset = (id: string) => {
    const next = PRESETS.find(p => p.id === id) || PRESETS[0]
    setActive(id)
    setRows(next.rows)
    setCols(next.cols)
  }

  return (
    <div className="modal-overlay" onClick={() => onToggle(false)}>
      <div className="export-dialog export-dialog-split settings-dialog insert-dialog" onClick={e => e.stopPropagation()}>
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-table-2"></span>
            <div>
              <div className="insert-title">插入表格</div>
              <div className="insert-desc">{rows} 行 x {cols} 列</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={() => onToggle(false)}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="export-body export-body-split export-body-redesigned insert-dialog-body">
          <div className="export-left insert-left-nav">
            {PRESETS.map(item => (
              <button
                key={item.id}
                className={`insert-nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => choosePreset(item.id)}
              >
                <span className={`remix insert-nav-icon ${item.icon}`}></span>
                <span className="chip-name">{item.label}</span>
                <span className="chip-desc">{item.desc}</span>
              </button>
            ))}
          </div>
          <div className="export-right insert-right-pane">
            <div className="insert-top-panel">
              <div className="table-size-grid">
                <label className="export-field">
                  <span className="export-label">行数</span>
                  <input className="lfs-input" type="number" min={1} max={20} value={rows} onChange={e => setRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
                </label>
                <label className="export-field">
                  <span className="export-label">列数</span>
                  <input className="lfs-input" type="number" min={1} max={10} value={cols} onChange={e => setCols(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
                </label>
              </div>
            </div>
            <div className="insert-preview-panel table-preview-panel">
              <table className="table-insert-preview">
                <tbody>
                  {cells.map((row, r) => (
                    <tr key={r}>
                      {row.map(cell => <td key={cell}>{r === 0 ? '标题' : '内容'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="export-footer">
          <div className="export-hint">
            <span className="remix ri-information-line"></span>
            <span>表格将插入到当前光标位置</span>
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={() => onToggle(false)}>关闭</button>
            <button className="settings-save-btn" onClick={() => onInsert(rows, cols)}>
              <span className="remix ri-add-line"></span>
              插入
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
