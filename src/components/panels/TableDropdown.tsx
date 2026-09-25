import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PanelContainer, UDSection } from '../ui/PanelContainer'

interface TableDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
  onInsert: (rows: number, cols: number, data: string[][]) => void
}

const TABLE_TYPES = [
  { id: 'with-header', label: '带标题表格', icon: 'ri-table-2', desc: '首行为标题' },
  { id: 'without-header', label: '无标题表格', icon: 'ri-layout-grid-fill', desc: '纯数据表格' },
] as const

function makeCells(rows: number, cols: number, hasHeader: boolean): string[][] {
  const data: string[][] = []
  for (let r = 0; r < rows; r++) {
    const row: string[] = []
    for (let c = 0; c < cols; c++) {
      if (hasHeader && r === 0) row.push('标题')
      else row.push('内容')
    }
    data.push(row)
  }
  return data
}

export const TableDropdown: React.FC<TableDropdownProps> = ({ open, onToggle, onInsert }) => {
  const [tableType, setTableType] = useState<'with-header' | 'without-header'>('with-header')
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [cells, setCells] = useState(() => makeCells(3, 3, true))
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null)
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

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
    setHoveredRow(null)
  }, [rows, cols])

  // 关闭弹窗时清除所有 contentEditable 单元格的焦点，防止插入表格后编辑器抢焦
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const focused = document.activeElement as HTMLElement | null
      if (focused && focused.getAttribute('contenteditable') === 'true') {
        focused.blur()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [open])

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

  const handleChangeTableType = useCallback((type: 'with-header' | 'without-header') => {
    setTableType(type)
    setCells(makeCells(rows, cols, type === 'with-header'))
  }, [rows, cols])

  if (!open) return null

  return (
    <PanelContainer
      onClose={() => onToggle(false)}
      icon="ri-table-2"
      title="插入表格"
      subtitle="选择表格类型并编辑内容"
      size="lg"
      footer={
        <div className="ud-actions">
          <button className="ud-btn ud-btn--ghost" onClick={() => onToggle(false)}>取消</button>
          <button className="ud-btn ud-btn--primary" onClick={handleInsert}>
            插入表格
          </button>
        </div>
      }
    >
      <div className="ud-right-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 表格类型切换 */}
          <div style={{ display: 'flex', gap: 8 }}>
            {TABLE_TYPES.map(t => (
              <button
                key={t.id}
                className={`ud-btn${tableType === t.id ? ' ud-btn--primary' : ''}`}
                onClick={() => handleChangeTableType(t.id)}
                style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
              >
                <span className={`remix ${t.icon}`} style={{ fontSize: 18 }}></span>
                <span style={{ fontSize: 12 }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* 表格预览 */}
          <UDSection label="表格预览">
            <div style={{ overflow: 'auto', maxHeight: 320 }}>
              <table className="table-editable" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {cells.map((row, r) => (
                    <tr
                      key={r}
                      className={`table-editable-row${r === 0 && tableType === 'with-header' ? ' is-header' : ''}`}
                      draggable
                      onMouseEnter={() => setHoveredRow(r)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onDragStart={e => handleDragStart(e, r)}
                      onDragOver={e => handleDragOver(e, r)}
                      onDrop={e => handleDrop(e, r)}
                      onDragEnd={clearDragStyles}
                    >
                      {/* 拖动列 */}
                      <td className="table-drag-col" style={{ width: 24, cursor: 'grab', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span className="remix ri-draggable" style={{ fontSize: 14, color: 'var(--text-muted)', opacity: 0.8, display: 'inline-block' }}></span>
                      </td>

                      {/* 数据单元格 */}
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className={`table-editable-cell${r === 0 && tableType === 'with-header' ? ' is-header-cell' : ''}`}
                          style={{ border: '1px solid var(--border-subtle)', padding: 0 }}
                        >
                          <div
                            className="table-cell-editor"
                            data-tc={`${r}-${c}`}
                            contentEditable
                            suppressContentEditableWarning
                            dangerouslySetInnerHTML={{ __html: cell }}
                            onInput={e => updateCell(r, c, (e.currentTarget as HTMLElement).innerText || '')}
                            onFocus={() => setActiveCell({ r, c })}
                            onKeyDown={e => handleKeyDown(e, r, c)}
                            style={{ padding: '8px 12px', minHeight: 32, outline: 'none' }}
                          />
                        </td>
                      ))}

                      {/* 操作列 */}
                      <td style={{ width: 32, position: 'relative', verticalAlign: 'middle' }}>
                        {r === 0 ? (
                          <button
                            className="table-act-btn"
                            onClick={handleAddCol}
                            title="添加列"
                            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                          >
                            <span className="remix ri-add-line" style={{ fontSize: 14 }}></span>
                          </button>
                        ) : (
                          <button
                            className="table-act-btn"
                            onClick={() => handleDeleteRow(r)}
                            title="删除行"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              display: hoveredRow === r ? '' : 'none'
                            }}
                          >
                            <span className="remix ri-close-line" style={{ fontSize: 14 }}></span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="table-drag-col" style={{ height: 36 }}></td>
                    <td colSpan={cols + 1}>
                      <button
                        className="table-add-row-btn"
                        onClick={handleAddRow}
                        title="添加行"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px dashed var(--border-subtle)',
                          borderRadius: 4,
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          fontSize: 13
                        }}
                      >
                        <span className="remix ri-add-line"></span> 添加行
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 12 }}>
              <span><kbd>Tab</kbd> 下一列</span>
              <span><kbd>⇧Tab</kbd> 上一列</span>
              <span><kbd>Esc</kbd> 退出编辑</span>
            </div>
          </UDSection>
        </div>
      </div>
    </PanelContainer>
  )
}
