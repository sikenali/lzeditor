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

function makeCells(rows: number, cols: number): string[][] {
  const data: string[][] = []
  for (let r = 0; r < rows; r++) {
    const row: string[] = []
    for (let c = 0; c < cols; c++) {
      row.push(r === 0 ? '标题' : '内容')
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

  // ── Drag reorder handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, r: number) => {
    dragSrcIdx.current = r
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(r))
    const tr = (e.currentTarget as HTMLElement).closest('tr')
    if (tr) { tr.classList.add('dragging'); dragRowEl.current = tr }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, r: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const tr = (e.currentTarget as HTMLElement).closest('tr')
    if (tr && dragRowEl.current !== tr) tr.classList.add('drag-over')
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
    document.querySelectorAll('.table-editable-row').forEach(tr => tr.classList.remove('dragging', 'drag-over'))
    dragRowEl.current = null
  }, [])

  // ── Column actions ──
  const handleAddCol = useCallback(() => {
    const next = cols + 1
    if (next > 10) return
    setCells(prev => prev.map(row => [...row, '内容']))
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

          {/* Right: table preview */}
          <div className="export-right insert-right-pane">
            {/* Info row */}
            <div className="table-info-row">
              <span className="table-hint">
                <span className="remix ri-information-line"></span>
                双击单元格输入内容 · Tab 切换下一列 · Esc 退出编辑
              </span>
              <span className="table-spec-badge">
                <span className="remix ri-table-2"></span>
                {cols} 列 · {rows} 行
              </span>
            </div>

            {/* Table wrapper */}
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
                      onDrop={e => handleDrop(e, r)}
                      onDragEnd={clearDragStyles}
                    >
                      {/* Drag handle column */}
                      <td className="table-drag-col">
                        <span className="remix ri-draggable ri-grip-vertical"></span>
                      </td>

                      {/* Data cells */}
                      {row.map((cell, c) => {
                        const isH = hoveredCell?.r === r && hoveredCell?.c === c
                        return (
                          <td
                            key={c}
                            className={`table-editable-cell${r === 0 ? ' is-header-cell' : ''}${c === cols - 1 ? ' is-last-cell' : ''}`}
                            onMouseEnter={() => setHoveredCell({ r, c })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            {/* Delete column button — shows on hover on last column header */}
                            {c === cols - 1 && r === 0 && (
                              <button
                                className="table-col-del-btn"
                                onClick={() => handleDeleteCol(c)}
                                title="删除列"
                                style={{ display: isH ? '' : 'none' }}
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
                            {/* Delete row button — shows on drag handle hover */}
                            {isH && r > 0 && (
                              <button
                                className="table-row-del-btn"
                                onClick={() => handleDeleteRow(r)}
                                title="删除行"
                              >
                                <span className="remix ri-close-line"></span>
                              </button>
                            )}
                          </td>
                        )
                      })}

                      {/* Add column button */}
                      <td className="table-col-add-col">
                        <button className="table-col-add-btn" onClick={handleAddCol} title="添加列">
                          <span className="remix ri-add-line"></span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Add row row */}
                  <tr className="table-add-row-trigger">
                    <td className="table-drag-col"></td>
                    <td colSpan={cols + 1}>
                      <button className="table-add-row-btn" onClick={handleAddRow} title="添加行">
                        <span className="remix ri-add-line"></span>
                        <span>添加行</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Shortcut hints */}
            <div className="table-shortcut-hints">
              <span className="shortcut-item"><kbd>Tab</kbd><span>下一列</span></span>
              <span className="shortcut-item"><kbd>⇧ Tab</kbd><span>上一列</span></span>
              <span className="shortcut-item"><kbd>Enter</kbd><span>单元格内换行</span></span>
              <span className="shortcut-item"><kbd>Esc</kbd><span>退出编辑</span></span>
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
