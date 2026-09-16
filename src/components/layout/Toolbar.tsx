import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'
import { LinkDialog } from '../panels/LinkDialog'
import { ImageDialog } from '../panels/ImageDialog'
import { FormatDropdown } from '../panels/FormatDropdown'
import { TableDropdown } from '../panels/TableDropdown'
import { InsertDropdown } from '../panels/InsertDropdown'
import { SupSubDropdown } from '../panels/SupSubDropdown'

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
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const [supsubOpen, setSupsubOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const applyCmd = (cmd: string) => {
    if (!editorRef) return
    document.execCommand(cmd, false)
    editorRef.focus()
    setDocHTML(editorRef.innerHTML)
    const text = editorRef.innerText || ''
    setWordCount(text.split(/\s+/).filter(Boolean).length)
  }

  const handleNewFile = () => setTitle(`untitled-${Date.now()}.md`)

  const insertImageFromUrl = (url: string, alt: string) => {
    if (!editorRef) return
    const img = document.createElement('img')
    img.src = url
    img.alt = alt
    img.style.maxWidth = '100%'
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null
    if (range) { range.insertNode(img); range.setStartAfter(img); range.collapse(true) }
    else editorRef.appendChild(img)
    editorRef.focus()
    setDocHTML(editorRef.innerHTML)
  }

  const handleImageUpload = (file: File) => {
    if (!editorRef) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      insertImageFromUrl(ev.target?.result as string, file.name)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div className="toolbar">
        {/* ── Left: 文档库/新建/大纲/预览 ── */}
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${openPanel === 'library' ? 'active' : ''}`}
            onClick={() => setOpenPanel(openPanel === 'library' ? 'none' : 'library')}
            title="文档库"
          >
            <span className="remix toolbar-icon ri-archive-2-line"></span>
            <span className="toolbar-label">文档库</span>
          </button>
          <button className="toolbar-btn" onClick={handleNewFile} title="新建文档">
            <span className="remix toolbar-icon ri-file-add-line"></span>
            <span className="toolbar-label">新建</span>
          </button>
          <button
            className={`toolbar-btn ${showOutline ? 'active' : ''}`}
            onClick={() => setShowOutline(!showOutline)}
            title="大纲"
          >
            <span className="remix toolbar-icon ri-list-unordered"></span>
            <span className="toolbar-label">大纲</span>
          </button>

          {/* 预览 with dropdown */}
          <div className="toolbar-dd-wrap">
            <button
              className={`toolbar-btn ${showPreview ? 'active' : ''}`}
              onClick={() => { setShowPreview(!showPreview); setPreviewOpen(false) }}
              title="预览"
            >
              <span className="remix toolbar-icon ri-eye-2-fill"></span>
              <span className="toolbar-label">预览</span>
            </button>
            <span
              className={`toolbar-dd-arrow ${previewOpen ? 'open' : ''}`}
              onClick={(e) => { e.stopPropagation(); setPreviewOpen(!previewOpen) }}
              style={{ cursor: 'pointer' }}
            >{previewOpen ? '▶' : '▼'}</span>
            {previewOpen && (
              <div className="toolbar-dropdown">
                <button className="toolbar-dropdown-item" onClick={() => { setShowPreview(true); setPreviewOpen(false) }}>
                  <span className="remix ri-layout-right-2-fill"></span>
                  <span>即时预览</span>
                </button>
                <button className="toolbar-dropdown-item" onClick={() => { setOpenPanel('preview'); setPreviewOpen(false) }}>
                  <span className="remix ri-eye-fill"></span>
                  <span>预览 · 样式集</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Middle: 格式化 + 插入 ── */}
        <div className="toolbar-group toolbar-group--middle">
          <button className="toolbar-btn" onClick={() => applyCmd('bold')} title="粗体">
            <span className="remix toolbar-icon ri-bold"></span>
            <span className="toolbar-label">粗体</span>
          </button>
          <button className="toolbar-btn" onClick={() => applyCmd('italic')} title="斜体">
            <span className="remix toolbar-icon ri-italic"></span>
            <span className="toolbar-label">斜体</span>
          </button>
          <button className="toolbar-btn" onClick={() => applyCmd('underline')} title="下划线">
            <span className="remix toolbar-icon ri-underline"></span>
            <span className="toolbar-label">下划线</span>
          </button>
          <button className="toolbar-btn" onClick={() => applyCmd('strikeThrough')} title="删除线">
            <span className="remix toolbar-icon ri-strikethrough"></span>
            <span className="toolbar-label">删除线</span>
          </button>
          <button className="toolbar-btn" onClick={() => {
            const sel = window.getSelection()
            if (sel?.rangeCount) { const r = sel.getRangeAt(0); const s = document.createElement('span'); s.style.cssText='background:var(--accent-a40);padding:0 2px;border-radius:2px'; r.surroundContents(s) }
          }} title="高亮">
            <span className="remix toolbar-icon ri-highlight"></span>
            <span className="toolbar-label">高亮</span>
          </button>
          <FormatDropdown open={formatOpen} onToggle={setFormatOpen} />

          {/* 图片 with dialog */}
          <div className="toolbar-dd-wrap">
            <button className="toolbar-btn" onClick={() => setShowImageDialog(true)} title="图片">
              <span className="remix toolbar-icon ri-image-line"></span>
              <span className="toolbar-label">图片</span>
            </button>
          </div>

          {/* 链接 with dialog */}
          <div className="toolbar-dd-wrap">
            <button className="toolbar-btn" onClick={() => setShowLinkDialog(true)} title="链接">
              <span className="remix toolbar-icon ri-link"></span>
              <span className="toolbar-label">链接</span>
            </button>
          </div>

          {/* 角标 with dropdown */}
          <SupSubDropdown open={supsubOpen} onToggle={setSupsubOpen} onSup={() => applyCmd('superscript')} onSub={() => applyCmd('subscript')} />

          {/* 表格 with dropdown */}
          <TableDropdown open={tableOpen} onToggle={setTableOpen} onInsert={(r, c) => {
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
            setTableOpen(false)
          }} />

          <InsertDropdown open={insertOpen} onToggle={setInsertOpen} />
        </div>

        {/* ── Right: AI/阅读/历史/导出/设置 ── */}
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
      {showImageDialog && <ImageDialog onClose={() => setShowImageDialog(false)} onInsert={insertImageFromUrl} onUpload={handleImageUpload} />}
    </>
  )
}
