import React from 'react'

interface TableDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
  onInsert: (rows: number, cols: number) => void
}

const TABLE_OPS = [
  { icon: 'ri-table-2', label: '插入表格', action: 'insert' as const },
  { sep: true },
  { icon: 'ri-insert-column-left', label: '插入列', action: 'col' as const },
  { icon: 'ri-arrow-left-s-line', label: '向左移动列', action: 'moveL' as const },
  { icon: 'ri-arrow-right-s-line', label: '向右移动列', action: 'moveR' as const },
  { icon: 'ri-insert-row-bottom', label: '插入行', action: 'row' as const },
  { icon: 'ri-delete-row', label: '删除行', action: 'delRow' as const },
  { sep: true },
  { icon: 'ri-delete-bin-line', label: '删除表格', action: 'delTable' as const },
  { icon: 'ri-expand-height', label: '自动调整列宽', action: 'autoW' as const },
]

export const TableDropdown: React.FC<TableDropdownProps> = ({ open, onToggle, onInsert }) => (
  <div className="toolbar-dd-wrap">
    <button className="toolbar-btn" onClick={() => onToggle(!open)} title="表格">
      <span className="remix toolbar-icon ri-table-2"></span>
      <span className="toolbar-label">表格</span>
    </button>
    <span
      className={`remix toolbar-dd-arrow ${open ? 'open' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(!open) }}
      style={{ cursor: 'pointer' }}
    >▶</span>
    {open && (
      <div className="toolbar-dropdown">
        {TABLE_OPS.map((op, i) =>
          op.sep
            ? <div key={i} className="toolbar-dropdown-sep" />
            : <button
                key={i}
                className="toolbar-dropdown-item"
                onClick={() => {
                  if (op.action === 'insert') {
                    const r = parseInt(prompt('行数:', '3') || '3')
                    const c = parseInt(prompt('列数:', '3') || '3')
                    onInsert(r, c)
                  } else {
                    // TODO: implement other table ops
                  }
                  onToggle(false)
                }}
              >
                {op.icon && <span className={`remix ${op.icon}`}></span>}
                <span>{op.label}</span>
              </button>
        )}
      </div>
    )}
  </div>
)
