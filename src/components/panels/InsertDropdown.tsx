import React from 'react'
import { useEditorStore } from '../../store/editorStore'

interface InsertDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
}

const INSERT_ITEMS = [
  { icon: 'ri-toc', label: '目录', action: 'toc' },
  { icon: 'ri-quotation-text', label: '引言', action: 'quote' },
  { icon: 'ri-footprint', label: '脚注', action: 'footnote' },
  { sep: true },
  { icon: 'ri-separator', label: '分割线', action: 'hr' },
  { icon: 'ri-double-quotes-l', label: '块引用', action: 'blockquote' },
  { icon: 'ri-code-box-line', label: '代码块', action: 'code' },
  { icon: 'ri-function-fill', label: '数学公式', action: 'math' },
]

export const InsertDropdown: React.FC<InsertDropdownProps> = ({ open, onToggle }) => {
  const editorRef = useEditorStore((s: any) => s.editorRef)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)

  const handleAction = (action: string) => {
    if (!editorRef) return
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null

    switch (action) {
      case 'toc': {
        const p = document.createElement('p')
        p.textContent = '[TOC]'
        p.style.cssText = 'color:var(--text-muted);font-size:11px;font-family:monospace;'
        range?.insertNode(p)
        break
      }
      case 'quote': {
        const bq = document.createElement('blockquote')
        bq.textContent = sel?.toString() || '引用内容'
        bq.style.cssText = 'border-left:3px solid var(--accent-primary);padding:8px 16px;margin:8px 0;background:var(--accent-a3);border-radius:0 8px 8px 0;'
        range?.deleteContents(); range?.insertNode(bq)
        break
      }
      case 'footnote': {
        const sup = document.createElement('sup')
        sup.textContent = '[^1]'
        sup.style.cssText = 'color:var(--accent-primary);'
        range?.insertNode(sup)
        break
      }
      case 'hr': {
        const hr = document.createElement('hr')
        hr.style.cssText = 'border:none;border-top:1px solid var(--border-subtle);margin:12px 0;'
        range?.insertNode(hr)
        break
      }
      case 'blockquote': {
        const bq = document.createElement('blockquote')
        bq.textContent = sel?.toString() || '块引用内容'
        bq.style.cssText = 'border-left:3px solid var(--amber);padding:12px 20px;margin:12px 0;background:var(--bg-quote);border-radius:0 10px 10px 0;font-style:italic;color:var(--text-secondary);'
        range?.deleteContents(); range?.insertNode(bq)
        break
      }
      case 'code': {
        const code = prompt('请输入代码内容:')
        if (code !== null && range) {
          const pre = document.createElement('pre')
          pre.style.cssText = 'background:var(--bg-code);padding:14px 18px;border-radius:8px;font-family:monospace;font-size:13px;overflow-x:auto;margin:10px 0;border:1px solid var(--border-subtle);'
          const codeEl = document.createElement('code')
          codeEl.textContent = code
          pre.appendChild(codeEl)
          range.deleteContents(); range.insertNode(pre)
        }
        break
      }
      case 'math': {
        const formula = prompt('输入数学公式 (LaTeX):', 'E = mc^2')
        if (formula && range) {
          const span = document.createElement('span')
          span.textContent = `$${formula}$`
          span.style.cssText = 'background:var(--bg-code);padding:2px 8px;border-radius:4px;font-family:monospace;font-size:14px;color:var(--amber);border:1px solid var(--border-subtle);'
          range.insertNode(span)
        }
        break
      }
    }
    setDocHTML(editorRef.innerHTML)
    const text = editorRef.innerText || ''
    setWordCount(text.split(/\s+/).filter(Boolean).length)
    onToggle(false)
  }

  return (
    <div className="toolbar-dd-wrap">
    <button className={`toolbar-btn ${open ? 'active' : ''} toolbar-btn--dd`} onClick={() => onToggle(!open)} title="插入">
      <span className="remix toolbar-icon ri-add-circle-line"></span>
      <span className={`toolbar-dd-arrow ${open ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); onToggle(!open) }} style={{ cursor: 'pointer' }}>▼</span>
      <span className="toolbar-label">插入</span>
    </button>
    {open && (
        <div className="toolbar-dropdown">
          {INSERT_ITEMS.map((item, i) =>
            item.sep
              ? <div key={i} className="toolbar-dropdown-sep" />
              : <button key={i} className="toolbar-dropdown-item" onClick={() => handleAction(item.action!)}>
                  {item.icon && <span className={`remix ${item.icon}`}></span>}
                  <span>{item.label}</span>
                </button>
          )}
        </div>
      )}
    </div>
  )
}
