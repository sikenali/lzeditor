import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'
import { LinkDialog } from '../panels/LinkDialog'
import { TableDropdown } from '../panels/TableDropdown'
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
  const setDocPath = useEditorStore((s: any) => s.setDocPath)
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)

  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [previewMode, setPreviewMode] = useState<'instant' | 'full'>('instant')

  // ── Format actions ──
  const applyFormat = (fn: (editor: any) => void) => {
    if (!editorRef) return
    setTimeout(() => {
      fn(editorRef)
      const html = editorRef.innerHTML
      setDocHTML(html)
      const text = editorRef.innerText || ''
      setWordCount(text.split(/\s+/).filter(Boolean).length)
    }, 0)
  }

  const bold = () => applyFormat(el => {
    document.execCommand('bold', false)
    el.focus()
  })
  const italic = () => applyFormat(el => {
    document.execCommand('italic', false)
    el.focus()
  })
  const underline = () => applyFormat(el => {
    document.execCommand('underline', false)
    el.focus()
  })
  const highlight = () => {
    const sel = window.getSelection()
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0)
      const span = document.createElement('span')
      span.style.cssText = 'background:var(--accent-a30);color:var(--text-primary);padding:1px 4px;border-radius:3px;'
      range.surroundContents(span)
    }
  }
  const strikethrough = () => applyFormat(el => {
    document.execCommand('strikeThrough', false)
    el.focus()
  })

  const supscript = () => applyFormat(el => {
    document.execCommand('superscript', false)
    el.focus()
  })
  const subscript = () => applyFormat(el => {
    document.execCommand('subscript', false)
    el.focus()
  })

  // ── Left tools ──
  const handleLibrary = () => setOpenPanel(openPanel === 'library' ? 'none' : 'library')
  const handleNewFile = () => {
    const name = `untitled-${Date.now()}.md`
    setTitle(name)
    setDocPath('')
  }
  const handleOutline = () => setShowOutline(!showOutline)
  const handlePreview = () => {
    if (showPreview) { setShowPreview(false); setOpenPanel('none') }
    else { setPreviewMode('instant'); setShowPreview(true) }
  }
  const handlePreviewMenu = (mode: 'instant' | 'full') => {
    setPreviewMode(mode)
    if (mode === 'instant') setShowPreview(true)
    else setOpenPanel(openPanel === 'preview' ? 'none' : 'preview')
  }

  // ── Image ──
  const handleImage = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file && editorRef) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          applyFormat(el => {
            const img = document.createElement('img')
            img.src = ev.target?.result as string
            img.style.maxWidth = '100%'
            el.appendChild(img)
            el.focus()
          })
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  // ── Link ──
  const handleLink = () => setShowLinkDialog(true)

  // ── Code ──
  const handleCodeInline = () => {
    const sel = window.getSelection()
    if (sel?.rangeCount) {
      const text = sel.toString()
      const code = document.createElement('code')
      code.style.cssText = 'background:var(--bg-code);padding:1px 6px;border-radius:4px;font-family:var(--font-mono);font-size:0.9em;color:var(--amber);border:1px solid var(--border-subtle);'
      code.textContent = text || '代码'
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(code)
    }
  }

  // ── Right tools ──
  const handleAI = () => useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })
  const handleRead = () => setReadMode((v: boolean) => !v)
  const handleHistory = () => setOpenPanel(openPanel === 'history' ? 'none' : 'history')
  const handleExport = () => setOpenPanel(openPanel === 'export' ? 'none' : 'export')
  const handleSettings = () => setOpenPanel(openPanel === 'settings' ? 'none' : 'settings')

  return (
    <>
      <div className="toolbar">
        {/* ── Left: 文档库/新建/大纲/预览 ── */}
        <div className="toolbar-group">
          <button className={`toolbar-btn ${openPanel === 'library' ? 'active' : ''}`} onClick={handleLibrary} title="文档库">
            <span className="remix toolbar-icon ri-archive-2-line"></span>
            <span className="toolbar-label">文档库</span>
          </button>
          <button className="toolbar-btn" onClick={handleNewFile} title="新建文档">
            <span className="remix toolbar-icon ri-file-add-line"></span>
            <span className="toolbar-label">新建</span>
          </button>
          <button className={`toolbar-btn ${showOutline ? 'active' : ''}`} onClick={handleOutline} title="大纲">
            <span className="remix toolbar-icon ri-list-unordered"></span>
            <span className="toolbar-label">大纲</span>
          </button>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button className={`toolbar-btn ${showPreview ? 'active' : ''}`} onClick={handlePreview} title="预览">
              <span className="remix toolbar-icon ri-eye-2-fill"></span>
              <span className="toolbar-label">预览</span>
            </button>
            <button
              className="toolbar-btn toolbar-dropdown-trigger"
              onClick={(e) => { e.stopPropagation(); handlePreviewMenu(previewMode === 'instant' ? 'full' : 'instant') }}
              title={previewMode === 'instant' ? '即时预览' : '完整预览'}
              style={{ padding: '6px 6px', minWidth: 28 }}
            >
              <span className="remix toolbar-icon ri-arrow-down-s-line" style={{ fontSize: 14 }}></span>
            </button>
          </div>
        </div>

        {/* ── Middle: 格式化 + 插入 ── */}
        <div className="toolbar-group toolbar-group--middle">
          <button className="toolbar-btn" onClick={bold} title="粗体">
            <span className="remix toolbar-icon ri-bold"></span>
            <span className="toolbar-label">粗体</span>
          </button>
          <button className="toolbar-btn" onClick={italic} title="斜体">
            <span className="remix toolbar-icon ri-italic"></span>
            <span className="toolbar-label">斜体</span>
          </button>
          <button className="toolbar-btn" onClick={strikethrough} title="删除线">
            <span className="remix toolbar-icon ri-strikethrough"></span>
            <span className="toolbar-label">删除线</span>
          </button>
          <button className="toolbar-btn" onClick={highlight} title="高亮">
            <span className="remix toolbar-icon ri-highlight"></span>
            <span className="toolbar-label">高亮</span>
          </button>
          <FormatDropdown />
          <button className="toolbar-btn" onClick={handleImage} title="图片">
            <span className="remix toolbar-icon ri-image-line"></span>
            <span className="toolbar-label">图片</span>
          </button>
          <button className="toolbar-btn" onClick={handleLink} title="链接">
            <span className="remix toolbar-icon ri-link"></span>
            <span className="toolbar-label">链接</span>
          </button>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button className="toolbar-btn" onClick={handleCodeInline} title="代码">
              <span className="remix toolbar-icon ri-code-fill"></span>
              <span className="toolbar-label">代码</span>
            </button>
            <button className="toolbar-btn toolbar-dropdown-trigger" onClick={(e) => { e.stopPropagation(); supscript() }} title="上角标" style={{ padding: '6px 6px', minWidth: 28 }}>
              <span className="remix toolbar-icon ri-superscript"></span>
            </button>
          </div>
          <TableDropdown />
          <InsertDropdown />
        </div>

        {/* ── Right: AI/阅读/历史/导出/设置 ── */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={handleAI} title="AI">
            <span className="remix toolbar-icon ri-openai-fill"></span>
            <span className="toolbar-label">AI</span>
          </button>
          <button className={`toolbar-btn ${useEditorStore.getState().isReadMode ? 'active' : ''}`} onClick={handleRead} title="阅读">
            <span className="remix toolbar-icon ri-book-open-fill"></span>
            <span className="toolbar-label">阅读</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'history' ? 'active' : ''}`} onClick={handleHistory} title="历史">
            <span className="remix toolbar-icon ri-history-fill"></span>
            <span className="toolbar-label">历史</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'export' ? 'active' : ''}`} onClick={handleExport} title="导出">
            <span className="remix toolbar-icon ri-download-2-line"></span>
            <span className="toolbar-label">导出</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'settings' ? 'active' : ''}`} onClick={handleSettings} title="设置">
            <span className="remix toolbar-icon ri-settings-3-fill"></span>
            <span className="toolbar-label">设置</span>
          </button>
        </div>
      </div>

      {showLinkDialog && <LinkDialog onClose={() => setShowLinkDialog(false)} />}
    </>
  )
}
