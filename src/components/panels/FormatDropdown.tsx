import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const FORMAT_ITEMS = [
  { label: '标题 1', action: 'h1' },
  { label: '标题 2', action: 'h2' },
  { label: '标题 3', action: 'h3' },
  { label: '标题 4', action: 'h4' },
  { label: '标题 5', action: 'h5' },
  { sep: true },
  { label: '自动标题', action: 'auto' },
  { label: '清除标题', action: 'clear' },
  { sep: true },
  { label: '分割线', action: 'hr' },
  { label: '链接', action: 'link' },
  { label: '图片', action: 'image' },
  { sep: true },
  { label: '有序列表', action: 'ol' },
  { label: '无序列表', action: 'ul' },
  { label: '任务列表', action: 'task' },
]

export const FormatDropdown: React.FC = () => {
  const [open, setOpen] = useState(false)
  const editorRef = useEditorStore((s: any) => s.editorRef)

  const handleAction = (action: string) => {
    if (!editorRef) return
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    switch (action) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': {
        const h = document.createElement(action)
        h.textContent = sel.toString() || `标题 ${action[1]}`
        range.deleteContents()
        range.insertNode(h)
        break
      }
      case 'clear':
        if (sel.rangeCount) {
          const el = sel.getRangeAt(0).commonAncestorContainer.parentElement
          if (el?.tagName?.startsWith('H')) {
            const p = document.createElement('p')
            p.textContent = el.textContent
            el.replaceWith(p)
          }
        }
        break
      case 'hr': {
        const hr = document.createElement('hr')
        range.insertNode(hr)
        range.setStartAfter(hr)
        break
      }
      case 'link': {
        const url = prompt('请输入链接地址:')
        if (url) {
          const a = document.createElement('a')
          a.href = url
          a.target = '_blank'
          a.textContent = sel.toString() || url
          range.deleteContents()
          range.insertNode(a)
        }
        break
      }
      case 'image': {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e: any) => {
          const file = e.target.files[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              const img = document.createElement('img')
              img.src = ev.target?.result as string
              img.style.maxWidth = '100%'
              range.deleteContents()
              range.insertNode(img)
            }
            reader.readAsDataURL(file)
          }
        }
        input.click()
        break
      }
      case 'ol': {
        const ol = document.createElement('ol')
        ol.innerHTML = '<li>列表项</li><li>列表项</li>'
        range.deleteContents()
        range.insertNode(ol)
        break
      }
      case 'ul': {
        const ul = document.createElement('ul')
        ul.innerHTML = '<li>列表项</li><li>列表项</li>'
        range.deleteContents()
        range.insertNode(ul)
        break
      }
      case 'task': {
        const ul = document.createElement('ul')
        ul.className = 'task-list'
        ul.innerHTML = '<li class="task-item"><input type="checkbox"> 待办事项</li><li class="task-item"><input type="checkbox"> 待办事项</li>'
        range.deleteContents()
        range.insertNode(ul)
        break
      }
      case 'auto':
        // Auto heading detection - simplified
        break
    }
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className="toolbar-btn"
        onClick={() => setOpen(!open)}
        title="格式"
        style={{ flexDirection: 'row', gap: 4, padding: '6px 10px' }}
      >
        <span className="remix toolbar-icon ri-text-wrap"></span>
        <span className="toolbar-label">格式</span>
        <span className={`remix toolbar-arrow ${open ? 'open' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="toolbar-dropdown">
          {FORMAT_ITEMS.map((item, i) =>
            item.sep
              ? <div key={i} className="toolbar-dropdown-sep" />
              : <button key={i} className="toolbar-dropdown-item" onClick={() => handleAction(item.action!)}>
                  <span>{item.label}</span>
                </button>
          )}
        </div>
      )}
    </div>
  )
}
