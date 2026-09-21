import React, { useCallback, useEffect, useMemo, useState } from 'react'

interface TableDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
  onInsert: (rows: number, cols: number, data: string[][]) => void
}

const PRESETS = [
  { id: 'basic', label: '基础表格', desc: '3 × 3 常规内容', icon: 'ri-table-2', rows: 3, cols: 3 },
  { id: 'compare', label: '对比表格', desc: '适合双列比较', icon: 'ri-layout-column-line', rows: 4, cols: 2 },
  { id: 'plan', label: '计划表', desc: '任务与进度排期', icon: 'ri-calendar-check-line', rows: 5, cols: 4 },
  { id: 'data', label: '数据表', desc: '多列结构化数据', icon: 'ri-database-2-line', rows: 6, cols: 5 },
]

function makeCells(rows: number, cols: number, defaults?: string[][]): string[][] {
  const data: string[][] = []
  for (let r = 0; r < rows; r++) {
    const row: string[] = []
    for (let c = 0; c < cols; c++) {
      row.push(defaults?.[r]?.[c] ?? (r === 0 ? '标题' : '内容'))
    }
    data.push(row)
  }
  return data
}

export const TableDropdown: React.FC<TableDropdownProps> = ({ open, onToggle, onInsert }) => {
  const [active, setActive] = useState(PRESETS[0].id)
  const preset = PRESETS.find(p => p.id === active) || PRESETS[0]
  const [rows, setRows] = useState(preset.rows)
  const [cols, setCols] = useState(preset.cols)
  const [cells, setCells] = useState(() => makeCells(preset.rows, preset.cols))
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null)

  const updateCell = useCallback((r: number, c: number, val: string) => {
    setCells(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = val
      return next
    })
  }, [])

  const focusCell = useCallback((r: number, c: number) => {
    const cell = document.querySelector(`[data-tc="${r}-${c}"]`) as HTMLElement | null
    if (cell) cell.focus()
    setActiveCell({ r, c })
  }, [])

  useEffect(() => {
    setActiveCell(null)
  }, [rows, cols])

  const choosePreset = useCallback((id: string) => {
    const next = PRESETS.find(p => p.id === id) || PRESETS[0]
    setActive(id)
    setRows(next.rows)
    setCols(next.cols)
    setCells(makeCells(next.rows, next.cols))
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const nextC = e.shiftKey
        ? Math.max(0, c - 1)
        : c < cols - 1 ? c + 1 : (r < rows - 1 ? 0 : -1)
      const nextR = e.shiftKey
        ? (c === 0 ? Math.max(0, r - 1) : r)
        : (nextC === -1 ? (r < rows - 1 ? r + 1 : r) : (c < cols - 1 ? r : (r < rows - 1 ? r + 1 : r)))
      if (nextC >= 0 && nextR >= 0) focusCell(nextR, nextC)
    } else if (e.key === 'Escape') {
      ;(e.target as HTMLElement).blur()
      setActiveCell(null)
    }
  }, [cols, rows, focusCell])

  const handleAddRow = () => {
    const nextRows = rows + 1
    if (nextRows > 20) return
    setCells(prev => [...prev, Array(cols).fill('内容')])
    setRows(nextRows)
  }

  const handleInsert = () => {
    onInsert(rows, cols, cells)
    onToggle(false)
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={() => onToggle(false)}>
      <div className="export-dialog export-dialog-split settings-dialog insert-dialog table-insert-dialog" onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-table-2"></span>
            <div>
              <div className="insert-title">插入表格</div>
              <div className="insert-desc">在光标处插入表格并编辑内容</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={() => onToggle(false)}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="export-body export-body-split export-body-redesigned insert-dialog-body table-insert-body">
          {/* Left: presets */}
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

          {/* Right */}
          <div className="export-right insert-right-pane">
            {/* Size controls */}
            <div className="table-insert-top">
              <div className="table-size-grid">
                <label className="export-field">
                  <span className="export-label">行数</span>
                  <input className="lfs-input" type="number" min={1} max={20} value={rows}
                    onChange={e => { const v = Math.max(1, Math.min(20, Number(e.target.value) || 1)); setRows(v); setCells(makeCells(v, cols, cells)) }} />
                </label>
                <label className="export-field">
                  <span className="export-label">列数</span>
                  <input className="lfs-input" type="number" min={1} max={10} value={cols}
                    onChange={e => { const v = Math.max(1, Math.min(10, Number(e.target.value) || 1)); setCols(v); setCells(makeCells(rows, v, cells)) }} />
                </label>
              </div>
            </div>

            {/* Editable table preview */}
            <div className="table-editable-area">
              <div className="table-editable-info">
                <span className="table-editable-hint">
                  <span className="remix ri-information-line"></span>
                  双击单元格输入内容 · Tab 切换下一列 · Esc 退出编辑
                </span>
                <span className="table-spec-badge">
                  <span className="remix ri-table-2"></span>
                  {cols} 列 · {rows} 行
                </span>
              </div>
              <div className="table-editable-wrapper">
                <table className="table-editable">
                  <tbody>
                    {cells.map((row, r) => (
                      <tr key={r} className={`table-editable-row${r === 0 ? ' is-header' : ''}${r === rows - 1 ? ' is-last' : ''}`}>
                        {row.map((cell, c) => (
                          <td key={c} className={`table-editable-cell${r === 0 ? ' is-header-cell' : ''}`}>
                            <div
                              className="table-cell-editor"
                              data-tc={`${r}-${c}`}
                              contentEditable={!r}
                              suppressContentEditableWarning
                              dangerouslySetInnerHTML={{ __html: cell }}
                              onInput={e => updateCell(r, c, (e.currentTarget as HTMLElement).innerText || '')}
                              onFocus={() => setActiveCell({ r, c })}
                              onKeyDown={e => handleKeyDown(e, r, c)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="table-add-row-btn" onClick={handleAddRow}>
                  <span className="remix ri-add-line"></span>
                  <span>添加一行</span>
                </button>
              </div>
              <div className="table-shortcut-hints">
                <span className="shortcut-item"><kbd>Tab</kbd><span>下一列</span></span>
                <span className="shortcut-item"><kbd>⇧ Tab</kbd><span>上一列</span></span>
                <span className="shortcut-item"><kbd>Esc</kbd><span>退出编辑</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="export-footer">
          <div className="export-hint">
            <span className="remix ri-information-line"></span>
            <span>插入后自动套用当前样式集，可随时在文档中编辑</span>
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={() => onToggle(false)}>关闭</button>
            <button className="settings-save-btn" onClick={handleInsert}>
              <span className="remix ri-add-line"></span>
              插入
              <span className="insert-key-hint">↵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
