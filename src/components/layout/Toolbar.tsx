import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'
import { LinkDialog } from '../panels/LinkDialog'
import { FormatDropdown } from '../panels/FormatDropdown'
import { InsertDropdown } from '../panels/InsertDropdown'

export const Toolbar: React.FC = () => {
  const openPanel = useEditorStore((s: any) => s.openPanel)
  const showOutline = useEditorStore((s: any) => s.showOutline)
  const showPreview = useEditorStore((s: any) => s.showPreview)
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)
  const setShowPreview = useEditorStore((s: any) => s.setShowPreview)
  const setReadMode = useEditorStore((s: any) => s.setReadMode)
  const editorRef = useEditorStore((s: any) => s.editorRef)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)

  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)

  const applyCmd = (cmd: string) => {
    if (!editorRef) return
    document.execCommand(cmd, false)
    editorRef.focus()
    setDocHTML(editorRef.innerHTML)
    const text = editorRef.innerText || ''
    setWordCount(text.split(/\s+/).filter(Boolean).length)
  }

  const handleNewFile = () => setTitle(`untitled-${Date.now()}.md`)

  const handleImage = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file && editorRef) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const img = document.createElement('img')
          img.src = ev.target?.result as string
          img.style.maxWidth = '100%'
          editorRef.appendChild(img)
          editorRef.focus()
          setDocHTML(editorRef.innerHTML)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleCodeInline = () => {
    const sel = window.getSelection()
    if (sel?.rangeCount && editorRef) {
      const text = sel.toString()
      const code = document.createElement('code')
      code.textContent = text || '代码'
      code.style.cssText = 'background:var(--bg-code);padding:1px 5px;border-radius:3px;font-family:var(--font-mono);font-size:0.9em;color:var(--amber);border:1px solid var(--border-subtle);'
      const range = sel.getRangeAt(0)
      range.deleteContents(); range.insertNode(code)
      editorRef.focus()
      setDocHTML(editorRef.innerHTML)
    }
  }

  return (
    <>
      <div className="toolbar">
        {/* ── Left ── */}
        <div className="toolbar-group">
          <button className={`toolbar-btn ${openPanel === 'library' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'library' ? 'none' : 'library')} title="文档库">
            <span className="remix toolbar-icon ri-archive-2-line"></span>
            <span className="toolbar-label">文档库</span>
          </button>
          <button className="toolbar-btn" onClick={handleNewFile} title="新建文档">
            <span className="remix toolbar-icon ri-file-add-line"></span>
            <span className="toolbar-label">新建</span>
          </button>
          <button className={`toolbar-btn ${showOutline ? 'active' : ''}`} onClick={() => setShowOutline(!showOutline)} title="大纲">
            <span className="remix toolbar-icon ri-list-unordered"></span>
            <span className="toolbar-label">大纲</span>
          </button>
          <button className={`toolbar-btn ${showPreview ? 'active' : ''}`} onClick={() => { setShowPreview(!showPreview) }} title="预览">
            <span className="remix toolbar-icon ri-eye-2-fill"></span>
            <span className="toolbar-label">预览</span>
          </button>
        </div>

        {/* ── Middle ── */}
        <div className="toolbar-group toolbar-group--middle">
          <button className="toolbar-btn" onClick={() => applyCmd('bold')} title="粗体"><span className="remix toolbar-icon ri-bold"></span><span className="toolbar-label">粗体</span></button>
          <button className="toolbar-btn" onClick={() => applyCmd('italic')} title="斜体"><span className="remix toolbar-icon ri-italic"></span><span className="toolbar-label">斜体</span></button>
          <button className="toolbar-btn" onClick={() => applyCmd('strikeThrough')} title="删除线"><span className="remix toolbar-icon ri-strikethrough"></span><span className="toolbar-label">删除线</span></button>
          <button className="toolbar-btn" onClick={() => {
            const sel = window.getSelection()
            if (sel?.rangeCount) { const r = sel.getRangeAt(0); const s = document.createElement('span'); s.style.cssText='background:var(--accent-a40);padding:0 2px;border-radius:2px'; r.surroundContents(s) }
          }} title="高亮"><span className="remix toolbar-icon ri-highlight"></span><span className="toolbar-label">高亮</span></button>
          <FormatDropdown open={formatOpen} onToggle={setFormatOpen} />
          <button className="toolbar-btn" onClick={handleImage} title="图片"><span className="remix toolbar-icon ri-image-line"></span><span className="toolbar-label">图片</span></button>
          <button className="toolbar-btn" onClick={() => setShowLinkDialog(true)} title="链接"><span className="remix toolbar-icon ri-link"></span><span className="toolbar-label">链接</span></button>
          {/* 代码 + 上/下角标 */}
          <div style={{ position: 'relative' }}>
            <button className="toolbar-btn" onClick={handleCodeInline} title="代码">
              <span className="remix toolbar-icon ri-code-fill"></span>
              <span className="toolbar-label">代码</span>
            </button>
            <button className="toolbar-btn" style={{ position: 'absolute', top: -4, right: -4, padding: '2px 4px', minWidth: 24 }} onClick={() => applyCmd('superscript')} title="上角标">
              <span className="remix" style={{ fontSize: 10 }}>x²</span>
            </button>
            <button className="toolbar-btn" style={{ position: 'absolute', bottom: -4, right: -4, padding: '2px 4px', minWidth: 24 }} onClick={() => applyCmd('subscript')} title="下角标">
              <span className="remix" style={{ fontSize: 10 }}>x₂</span>
            </button>
          </div>
          {/* 表格 */}
          <button className="toolbar-btn" onClick={() => {
            const r = parseInt(prompt('行数:', '3') || '3')
            const c = parseInt(prompt('列数:', '3') || '3')
            if (r > 0 && c > 0 && editorRef) {
              const table = document.createElement('table')
              table.style.cssText = 'border-collapse:collapse;width:100%;margin:8px 0;'
              for (let i = 0; i < r; i++) {
                const tr = document.createElement('tr')
                for (let j = 0; j < c; j++) {
                  const td = document.createElement('td')
                  td.style.cssText = 'border:1px solid var(--border-default);padding:6px 10px;min-width:50px;'
                  td.textContent = i === 0 ? '标题' : ''
                  tr.appendChild(td)
                }
                table.appendChild(tr)
              }
              editorRef.appendChild(table)
              editorRef.focus()
              setDocHTML(editorRef.innerHTML)
            }
          }} title="表格">
            <span className="remix toolbar-icon ri-table-2"></span>
            <span className="toolbar-label">表格</span>
          </button>
          <InsertDropdown open={insertOpen} onToggle={setInsertOpen} />
        </div>

        {/* ── Right ── */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })} title="AI">
            <span className="remix toolbar-icon ri-openai-fill"></span>
            <span className="toolbar-label">AI</span>
          </button>
          <button className={`toolbar-btn ${useEditorStore.getState().isReadMode ? 'active' : ''}`} onClick={() => setReadMode((v: boolean) => !v)} title="阅读">
            <span className="remix toolbar-icon ri-book-open-fill"></span>
            <span className="toolbar-label">阅读</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'history' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'history' ? 'none' : 'history')} title="历史">
            <span className="remix toolbar-icon ri-history-fill"></span>
            <span className="toolbar-label">历史</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'export' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'export' ? 'none' : 'export')} title="导出">
            <span className="remix toolbar-icon ri-download-2-line"></span>
            <span className="toolbar-label">导出</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'settings' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'settings' ? 'none' : 'settings')} title="设置">
            <span className="remix toolbar-icon ri-settings-3-fill"></span>
            <span className="toolbar-label">设置</span>
          </button>
        </div>
      </div>

      {showLinkDialog && <LinkDialog onClose={() => setShowLinkDialog(false)} />}
    </>
  )
}
