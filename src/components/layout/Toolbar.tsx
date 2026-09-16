import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'

const TOOLS = [
  { icon: 'ri-archive-fill', label: '文库', action: 'library' },
  { icon: 'ri-file-fill', label: '文件', action: 'file' },
  { icon: 'ri-list-unordered', label: '大纲', action: 'outline' },
  { icon: 'ri-eye-2-fill', label: '预览', action: 'preview' },
  // --- gap 36px ---
  { icon: 'ri-image-line', label: '图片', action: 'image' },
  { icon: 'ri-link', label: '链接', action: 'link' },
  { icon: 'ri-code-fill', label: '代码', action: 'code' },
  { icon: 'ri-table-fill', label: '表格', action: 'table' },
  // --- gap 36px ---
  { icon: 'ri-openai-fill', label: 'AI', action: 'ai' },
  { icon: 'ri-book-open-fill', label: '阅读', action: 'read' },
  { icon: 'ri-history-fill', label: '历史', action: 'history' },
  { icon: 'ri-download-2-line', label: '导出', action: 'export' },
  { icon: 'ri-settings-3-fill', label: '设置', action: 'settings' },
]

const LEFT_TOOLS = TOOLS.slice(0, 4)
const MIDDLE_TOOLS = TOOLS.slice(4, 8)
const RIGHT_TOOLS = TOOLS.slice(8)

export const Toolbar: React.FC = () => {
  const openPanel = useEditorStore((s: any) => s.openPanel)
  const isReadMode = useEditorStore((s: any) => s.isReadMode)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setPreview = useEditorStore((s: any) => s.setPreview)
  const setReadMode = useEditorStore((s: any) => s.setReadMode)
  const editorRef = useEditorStore((s: any) => s.editorRef)

  const handleClick = (action: string) => {
    switch (action) {
      case 'library':
        setOpenPanel(openPanel === 'library' ? 'none' : 'library')
        break
      case 'file':
        setOpenPanel(openPanel === 'file' ? 'none' : 'file')
        break
      case 'outline':
        setOpenPanel(openPanel === 'outline' ? 'none' : 'outline')
        break
      case 'preview':
        setPreview((v: boolean) => !v)
        break
      case 'image': {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e: any) => {
          const file = e.target.files[0]
          if (file && editorRef?.current) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              const img = ev.target?.result as string
              // Insert image at current cursor position
              const sel = window.getSelection()
              if (sel?.rangeCount) {
                const range = sel.getRangeAt(0)
                const imgEl = document.createElement('img')
                imgEl.src = img
                imgEl.style.maxWidth = '100%'
                range.deleteContents()
                range.insertNode(imgEl)
                range.setStartAfter(imgEl)
                range.setEndAfter(imgEl)
                sel.removeAllRanges()
                sel.addRange(range)
              }
            }
            reader.readAsDataURL(file)
          }
        }
        input.click()
        break
      }
      case 'link': {
        const url = prompt('请输入链接地址:')
        if (url && editorRef?.current) {
          const sel = window.getSelection()
          if (sel?.rangeCount) {
            const range = sel.getRangeAt(0)
            const text = range.toString() || url
            const a = document.createElement('a')
            a.href = url
            a.target = '_blank'
            a.textContent = text
            range.deleteContents()
            range.insertNode(a)
          }
        }
        break
      }
      case 'code': {
        const code = prompt('请输入代码内容:')
        if (code !== null && editorRef?.current) {
          const sel = window.getSelection()
          if (sel?.rangeCount) {
            const range = sel.getRangeAt(0)
            const pre = document.createElement('pre')
            pre.style.cssText = 'background:var(--bg-code);padding:12px 16px;border-radius:6px;font-family:monospace;font-size:14px;overflow-x:auto;margin:8px 0;'
            const codeEl = document.createElement('code')
            codeEl.textContent = code
            pre.appendChild(codeEl)
            range.deleteContents()
            range.insertNode(pre)
          }
        }
        break
      }
      case 'table': {
        const rows = prompt('输入行数:', '3')
        const cols = prompt('输入列数:', '3')
        if (rows && cols && editorRef?.current) {
          const r = parseInt(rows)
          const c = parseInt(cols)
          if (!isNaN(r) && !isNaN(c) && r > 0 && c > 0) {
            const table = document.createElement('table')
            table.style.cssText = 'border-collapse:collapse;width:100%;margin:8px 0;'
            for (let i = 0; i < r; i++) {
              const tr = document.createElement('tr')
              for (let j = 0; j < c; j++) {
                const td = document.createElement('td')
                td.style.cssText = 'border:1px solid var(--border-color);padding:8px 12px;min-width:60px;'
                td.textContent = i === 0 ? '标题' : ''
                tr.appendChild(td)
              }
              table.appendChild(tr)
            }
            const sel = window.getSelection()
            if (sel?.rangeCount) {
              const range = sel.getRangeAt(0)
              range.deleteContents()
              range.insertNode(table)
            }
          }
        }
        break
      }
      case 'ai':
        useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })
        break
      case 'read':
        setReadMode((v: boolean) => !v)
        break
      case 'history':
        setOpenPanel(openPanel === 'history' ? 'none' : 'history')
        break
      case 'export':
        setOpenPanel(openPanel === 'export' ? 'none' : 'export')
        break
      case 'settings':
        setOpenPanel(openPanel === 'settings' ? 'none' : 'settings')
        break
    }
  }

  const renderGroup = (tools: typeof TOOLS, className: string) => (
    <div className={`toolbar-group ${className}`}>
      {tools.map(t => (
        <button
          key={t.action}
          className={`toolbar-btn ${openPanel === t.action ? 'active' : ''}`}
          onClick={() => handleClick(t.action)}
          title={t.label}
        >
          <span className="remix toolbar-icon">{t.icon}</span>
          <span className="toolbar-label">{t.label}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="toolbar">
      {renderGroup(LEFT_TOOLS, '')}
      {renderGroup(MIDDLE_TOOLS, 'toolbar-group--middle')}
      {renderGroup(RIGHT_TOOLS, '')}
    </div>
  )
}