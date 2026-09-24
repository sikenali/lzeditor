import React, { useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'

interface InsertDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
}

const INSERT_ITEMS = [
  { icon: 'ri-menu-line', label: '目录', action: 'toc' },
  { icon: 'ri-double-quotes-l', label: '引言', action: 'quote' },
  { icon: 'ri-bookmark-line', label: '脚注', action: 'footnote' },
  { sep: true },
  { icon: 'ri-separator', label: '分割线', action: 'hr' },
  { icon: 'ri-double-quotes-r', label: '块引用', action: 'blockquote' },
  { icon: 'ri-code-box-line', label: '代码块', action: 'code' },
  { icon: 'ri-function-fill', label: '数学公式', action: 'math' },
]

export const InsertDropdown: React.FC<InsertDropdownProps> = ({ open, onToggle }) => {
  const editorRef = useEditorStore((s: any) => s.editorRef)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)
  const navMode = useSettingsStore((s) => s.navMode)
  const btnRef = useRef<HTMLButtonElement>(null)
  const ddRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (navMode !== 'left' || !open || !ddRef.current) {
      if (ddRef.current) { ddRef.current.style.position = ''; ddRef.current.style.left = ''; ddRef.current.style.top = '' }
      return
    }
    const trigger = btnRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const el = ddRef.current
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    el.style.top = '-9999px'
    requestAnimationFrame(() => {
      const mw = el.offsetWidth || 180
      const mh = el.offsetHeight || 240
      el.style.left = `${Math.min(rect.right + 4, vw - mw - 8)}px`
      el.style.top = `${Math.min(rect.top, vh - mh - 8)}px`
    })
  }, [open, navMode])

  useEffect(() => {
    if (!open && ddRef.current) { ddRef.current.style.position = ''; ddRef.current.style.left = ''; ddRef.current.style.top = '' }
  }, [open])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        onToggle(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onToggle])

  const handleAction = (action: string) => {
    if (!editorRef) return
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null

    switch (action) {
      case 'toc': {
        const block = document.createElement('blockquote')
        block.className = 'lz-insert lz-insert-toc'
        block.dataset.insert = 'toc'
        block.innerHTML = '<p><strong>目录</strong></p><p>[TOC]</p>'
        range?.insertNode(block)
        break
      }
      case 'quote': {
        const bq = document.createElement('blockquote')
        bq.className = 'lz-insert lz-insert-quote'
        bq.dataset.insert = 'quote'
        bq.textContent = sel?.toString() || '引用内容'
        range?.deleteContents(); range?.insertNode(bq)
        break
      }
      case 'footnote': {
        const sup = document.createElement('sup')
        sup.className = 'lz-insert-footnote-ref'
        sup.dataset.insert = 'footnote'
        sup.textContent = '[^1]'
        range?.insertNode(sup)
        break
      }
      case 'hr': {
        const hr = document.createElement('hr')
        hr.className = 'lz-insert-rule'
        hr.dataset.insert = 'rule'
        range?.insertNode(hr)
        break
      }
      case 'blockquote': {
        const bq = document.createElement('blockquote')
        bq.className = 'lz-insert lz-insert-quote'
        bq.dataset.insert = 'quote'
        bq.textContent = sel?.toString() || '块引用内容'
        range?.deleteContents(); range?.insertNode(bq)
        break
      }
      case 'code': {
        const code = prompt('请输入代码内容:')
        if (code !== null && range) {
          const pre = document.createElement('pre')
          pre.className = 'lz-insert-code'
          pre.dataset.insert = 'code'
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
          span.className = 'lz-insert-math'
          span.dataset.insert = 'math'
          span.textContent = `$${formula}$`
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
    <button ref={btnRef} className={`toolbar-btn ${open ? 'active' : ''}`} onClick={() => onToggle(!open)} title="插入">
      <span className="remix toolbar-icon ri-add-circle-line"></span>
      <span className="toolbar-label">插入</span>
    </button>
    {open && (
        <div className="toolbar-dropdown" ref={ddRef}>
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
