import React, { useCallback, useEffect, useRef, useState } from 'react'

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
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null)

  // ── Drag reorder ──
  const dragSrcIdx = useRef<number | null>(null)
  const dragRowEl = useRef<HTMLTableRowElement | null>(null)

  const updateCell = useCallback((r: number, c: number, val: string) => {
    setCells(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = val
      return next
    })
  }, [])

  const focusCell = useCallback((r: number, c: number) => {
    const el = document.querySelector<HTMLDivElement>(`[data-tc="${r}-${c}"]`)
    if (el) el.focus()
    setActiveCell({ r, c })
  }, [])

  useEffect(() => {
    setActiveCell(null)
    setHoveredCell(null)
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
      let nc = e.shiftKey ? c - 1 : c + 1
      let nr = r
      if (e.shiftKey) {
        if (nc < 0) { nc = cols - 1; nr = Math.max(0, r - 1) }
      } else {
        if (nc >= cols) { nc = 0; nr = Math.min(rows - 1, r + 1) }
      }
      if (nr >= 0 && nr < rows) focusCell(nr, nc)
    } else if (e.key === 'Escape') {
      ;(e.target as HTMLElement).blur()
      setActiveCell(null)
    }
  }, [cols, rows, focusCell])

  const handleDragStart = useCallback((e: React.DragEvent, r: number) => {
    dragSrcIdx.current = r
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(r))
    const tr = (e.currentTarget as HTMLElement).closest('tr')
    if (tr) {
      tr.classList.add('dragging')
      dragRowEl.current = tr
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, r: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const tr = (e.currentTarget as HTMLElement).closest('tr')
    if (tr && dragRowEl.current !== tr) {
      tr.classList.add('drag-over')
    }
  }, [])

  const handleDragLeaveRow = useCallback((e: React.DragEvent, r: number) => {
    const tr = (e.currentTarget as HTMLElement).closest('tr')
    if (tr) tr.classList.remove('drag-over')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetR: number) => {
    e.preventDefault()
    const srcR = dragSrcIdx.current
    if (srcR === null || srcR === targetR) return
    setCells(prev => {
      const next = prev.map(row => [...row])
      const [moved] = next.splice(srcR, 1)
      next.splice(targetR, 0, moved)
      return next
    })
    dragSrcIdx.current = null
    clearDragStyles()
  }, [])

  const clearDragStyles = useCallback(() => {
    document.querySelectorAll('.table-editable-row').forEach(tr => {
      tr.classList.remove('dragging', 'drag-over')
    })
    dragRowEl.current = null
  }, [])

  const handleDragEnd = useCallback(() => {
    clearDragStyles()
  }, [clearDragStyles])

  // ── Column actions ──
  const handleAddCol = useCallback(() => {
    const next = cols + 1
    if (next > 10) return
    setCells(prev => prev.map(row => [...row, row.length > 0 ? '标题' : '内容']))
    setCols(next)
  }, [cols])

  const handleDeleteCol = useCallback((c: number) => {
    if (cols <= 1) return
    setCells(prev => prev.map(row => row.filter((_, i) => i !== c)))
    setCols(cols - 1)
  }, [cols])

  // ── Row actions ──
  const handleAddRow = useCallback(() => {
    const next = rows + 1
    if (next > 20) return
    setCells(prev => [...prev, Array(cols).fill('内容')])
    setRows(next)
  }, [rows, cols])

  const handleDeleteRow = useCallback((r: number) => {
    if (rows <= 1) return
    setCells(prev => prev.filter((_, i) => i !== r))
    setRows(rows - 1)
  }, [rows])

  const handleInsert = useCallback(() => {
    onInsert(rows, cols, cells)
    onToggle(false)
  }, [rows, cols, cells, onInsert, onToggle])

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
              <div className="insert-desc">{cols} 列 · {rows} 行</div>
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
            {/* Editable table preview */}
            <div className="table-editable-wrapper">
              <table className="table-editable">
                <tbody>
                  {cells.map((row, r) => (
                    <tr
                      key={r}
                      className={`table-editable-row${r === 0 ? ' is-header' : ''}`}
                      draggable
                      onDragStart={e => handleDragStart(e, r)}
                      onDragOver={e => handleDragOver(e, r)}
                      onDragLeave={e => handleDragLeaveRow(e, r)}
                      onDrop={e => handleDrop(e, r)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Drag handle */}
                      <td className="table-drag-handle">
                        <span className="remix ri-draggable ri-grip-vertical" title="拖拽排序"></span>
                      </td>
                      {/* Cells */}
                      {row.map((cell, c) => {
                        const isHovered = hoveredCell?.r === r && hoveredCell?.c === c
                        return (
                          <td
                            key={c}
                            className={`table-editable-cell${r === 0 ? ' is-header-cell' : ''}${c === cols - 1 ? ' is-last-cell' : ''}`}
                            onMouseEnter={() => setHoveredCell({ r, c })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            {/* Delete col btn on last column hover */}
                            {c === cols - 1 && (
                              <button
                                className="table-col-del-btn"
                                onClick={() => handleDeleteCol(c)}
                                title="删除列"
                                style={{ display: isHovered && !r ? '' : 'none' }}
                              >
                                <span className="remix ri-close-line"></span>
                              </button>
                            )}
                            <div
                              className="table-cell-editor"
                              data-tc={`${r}-${c}`}
                              contentEditable
                              suppressContentEditableWarning
                              dangerouslySetInnerHTML={{ __html: cell }}
                              onInput={e => updateCell(r, c, (e.currentTarget as HTMLElement).innerText || '')}
                              onFocus={() => setActiveCell({ r, c })}
                              onKeyDown={e => handleKeyDown(e, r, c)}
                            />
                            {/* Delete row btn on drag handle hover */}
                            {isHovered && r > 0 && (
                              <button
                                className="table-row-del-btn"
                                onClick={() => handleDeleteRow(r)}
                                title="删除行"
                                style={{ display: '' }}
                              >
                                <span className="remix ri-close-line"></span>
                              </button>
                            )}
                          </td>
                        )
                      })}
                      {/* Add column button */}
                      <td className="table-col-add-cell">
                        <button
                          className="table-col-add-btn"
                          onClick={handleAddCol}
                          title="添加列"
                        >
                          <span className="remix ri-add-line"></span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Add row button */}
                  <tr className="table-add-row-trigger">
                    <td className="table-drag-handle"></td>
                    <td colSpan={cols}>
                      <button className="table-add-row-btn" onClick={handleAddRow} title="添加行">
                        <span className="remix ri-add-line"></span>
                        <span>添加行</span>
                      </button>
                    </td>
                    <td className="table-col-add-cell">
                      <button className="table-col-add-btn" onClick={handleAddCol} title="添加列">
                        <span className="remix ri-add-line"></span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
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
