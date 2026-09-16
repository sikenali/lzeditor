import React from 'react'
import { useEditorStore } from '../../store/editorStore'

interface FormatDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
}

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

export const FormatDropdown: React.FC<FormatDropdownProps> = ({ open, onToggle }) => {
  const editorRef = useEditorStore((s: any) => s.editorRef)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)

  const handleAction = (action: string) => {
    if (!editorRef) return
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null

    switch (action) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': {
        const tag = action as `h${1|2|3|4|5}`
        const el = document.createElement(tag)
        el.textContent = sel?.toString() || `标题 ${action[1]}`
        range?.deleteContents()
        range?.insertNode(el)
        break
      }
      case 'clear': {
        const el = range?.commonAncestorContainer?.parentElement
        if (el?.tagName?.match(/^H[1-5]$/)) {
          const p = document.createElement('p')
          p.textContent = el.textContent
          el.replaceWith(p)
        }
        break
      }
      case 'hr': {
        const hr = document.createElement('hr')
        range?.insertNode(hr)
        break
      }
      case 'link': {
        const url = prompt('请输入链接地址:')
        if (url && range) {
          const a = document.createElement('a')
          a.href = url; a.target = '_blank'
          a.textContent = sel?.toString() || url
          a.style.color = 'var(--accent-primary)'
          range.deleteContents(); range.insertNode(a)
        }
        break
      }
      case 'image': {
        const input = document.createElement('input')
        input.type = 'file'; input.accept = 'image/*'
        input.onchange = (e: any) => {
          const file = e.target.files[0]
          if (file && range) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              const img = document.createElement('img')
              img.src = ev.target?.result as string
              img.style.maxWidth = '100%'
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
        range?.deleteContents(); range?.insertNode(ol)
        break
      }
      case 'ul': {
        const ul = document.createElement('ul')
        ul.innerHTML = '<li>列表项</li><li>列表项</li>'
        range?.deleteContents(); range?.insertNode(ul)
        break
      }
      case 'task': {
        const ul = document.createElement('ul')
        ul.innerHTML = '<li class="task-item"><input type="checkbox"> 待办事项</li><li class="task-item"><input type="checkbox"> 待办事项</li>'
        range?.deleteContents(); range?.insertNode(ul)
        break
      }
    }
    setDocHTML(editorRef.innerHTML)
    const text = editorRef.innerText || ''
    setWordCount(text.split(/\s+/).filter(Boolean).length)
    onToggle(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button className="toolbar-btn" onClick={() => onToggle(!open)} title="格式">
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
