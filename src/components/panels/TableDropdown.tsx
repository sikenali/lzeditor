import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const TABLE_OPS = [
  { icon: 'ri-table-2', label: '插入表格', action: 'insert' },
  { sep: true },
  { icon: 'ri-arrow-left-line', label: '向左移动列', action: 'move-left' },
  { icon: 'ri-arrow-right-line', label: '向右移动列', action: 'move-right' },
  { icon: 'ri-insert-column-left', label: '插入列', action: 'insert-col' },
  { icon: 'ri-insert-column-right', label: '插入行', action: 'insert-row' },
  { icon: 'ri-delete-column', label: '删除行', action: 'delete-row' },
  { sep: true },
  { icon: 'ri-delete-bin-line', label: '删除表格', action: 'delete-table' },
  { icon: 'ri-expand-height', label: '自动调整列宽', action: 'auto-width' },
]

export const TableDropdown: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [open, setOpen] = useState(false)
  const editorRef = useEditorStore((s: any) => s.editorRef)

  const handleAction = (action: string) => {
    if (!editorRef) return
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    switch (action) {
      case 'insert': {
        const rows = parseInt(prompt('行数:', '3') || '3')
        const cols = parseInt(prompt('列数:', '3') || '3')
        if (rows > 0 && cols > 0) {
          const table = document.createElement('table')
          table.style.cssText = 'border-collapse:collapse;width:100%;margin:8px 0;'
          for (let i = 0; i < rows; i++) {
            const tr = document.createElement('tr')
            for (let j = 0; j < cols; j++) {
              const td = document.createElement('td')
              td.style.cssText = 'border:1px solid var(--border-default);padding:8px 12px;min-width:60px;'
              td.textContent = i === 0 ? '标题' : ''
              tr.appendChild(td)
            }
            table.appendChild(tr)
          }
          range.deleteContents()
          range.insertNode(table)
          range.setStartAfter(table)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
        break
      }
      case 'move-left':
      case 'move-right':
      case 'insert-col':
      case 'insert-row':
      case 'delete-row':
      case 'delete-table':
      case 'auto-width':
        // TODO: implement table manipulation commands
        break
    }
    setOpen(false)
    onClose?.()
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className="toolbar-btn"
        onClick={() => setOpen(!open)}
        title="表格"
        style={{ flexDirection: 'row', gap: 4, padding: '6px 10px' }}
      >
        <span className="remix toolbar-icon ri-table-2"></span>
        <span className="toolbar-label">表格</span>
        <span className={`remix toolbar-arrow ${open ? 'open' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="toolbar-dropdown toolbar-dropdown-right">
          {TABLE_OPS.map((op, i) =>
            op.sep
              ? <div key={i} className="toolbar-dropdown-sep" />
              : <button key={i} className="toolbar-dropdown-item" onClick={() => handleAction(op.action!)}>
                  {op.icon && <span className={`remix ${op.icon}`}></span>}
                  <span>{op.label}</span>
                </button>
          )}
        </div>
      )}
    </div>
  )
}
