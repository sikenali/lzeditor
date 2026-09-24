import React, { useState, useEffect } from 'react'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { Toolbar } from './components/layout/Toolbar'
import { LeftNav } from './components/layout/LeftNav'
import { DocumentMetaBar } from './components/layout/DocumentMetaBar'
import { StatusBar } from './components/layout/StatusBar'
import { SettingsDialog } from './components/panels/SettingsDialog'
import { ExportDialog } from './components/panels/ExportDialog'
import { HistoryPanel } from './components/panels/HistoryPanel'
import { StyleMainPanel } from './components/panels/StyleMainPanel'
import { LZEditor } from './components/editor/LZEditor'
import { SearchPanel } from './components/panels/SearchPanel'
import { LibraryPanel } from './components/panels/LibraryPanel'
import { FilePanel } from './components/panels/FilePanel'
import { PreviewPanel } from './components/panels/PreviewPanel'
import { SidebarOutline } from './components/sidebar/SidebarOutline'
import { SidebarPreview } from './components/sidebar/SidebarPreview'
import { AIPanel } from './components/editor/AIPanel'
import { ImageDialog } from './components/panels/ImageDialog'
import { LinkDialog } from './components/panels/LinkDialog'
import { CodeDialog } from './components/panels/CodeDialog'
import { FormulaDialog } from './components/panels/FormulaDialog'
import { TableDropdown } from './components/panels/TableDropdown'
import { EmojiDialog } from './components/panels/EmojiDialog'
import { ChartDialog } from './components/panels/ChartDialog'
import { useEditorStore } from './store/editorStore'
import { useSettingsStore } from './store/settingsStore'
import { useTheme } from './hooks/useTheme'

function App() {
  useTheme()
  const openPanel = useEditorStore(s => s.openPanel)
  const insertPanel = useEditorStore(s => s.insertPanel)
  const appMode = useEditorStore(s => s.appMode)
  const setAppMode = useEditorStore(s => s.setAppMode)
  const codeMode = useEditorStore(s => s.codeMode)
  const setCodeMode = useEditorStore(s => s.setCodeMode)
  const codeModeCursor = useEditorStore(s => s.codeModeCursor)
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const showLibrary = useEditorStore(s => s.showLibrary)
  const showRightPanel = useEditorStore(s => s.showRightPanel)
  const editor = useEditorStore(s => s.editor)
  const navMode = useSettingsStore(s => s.navMode || 'top')
  const showSearch = useEditorStore(s => s.showSearch)

  // 面板打开时让编辑器失去焦点
  useEffect(() => {
    const hasPanel = openPanel !== 'none' || insertPanel !== 'none' || showSearch
    if (hasPanel && editor) {
      try { editor.commands.blur() } catch {}
    }
  }, [openPanel, insertPanel, showSearch, editor])

  const closePanel = () => useEditorStore.getState().setOpenPanel('none')
  const closeInsert = () => useEditorStore.getState().setInsertPanel('none')

  // 同步 appMode 和 codeMode
  useEffect(() => {
    if (appMode === 'code' && !codeMode) setCodeMode(true)
    if (appMode === 'edit' && codeMode) setCodeMode(false)
  }, [appMode, codeMode, setCodeMode])

  const insertImage = (url: string, alt: string, align?: 'top' | 'left' | 'right') => {
    if (!editor) return
    editor.chain().focus().insertImage({ src: url, alt, align }).run()
    closeInsert()
  }
  const uploadImage = (file: File, align?: 'top' | 'left' | 'right') => {
    if (!editor) return
    const reader = new FileReader()
    reader.onload = (ev) => insertImage(ev.target?.result as string, file.name, align)
    reader.readAsDataURL(file)
    closeInsert()
  }
  const insertMarkdown = (md: string) => {
    const cur = useEditorStore.getState()
    const pos = cur.codeModeCursor ?? 0
    const content = cur.mdContent
    const newContent = content.slice(0, pos) + md + content.slice(pos)
    useEditorStore.getState().setMdContent(newContent)
    const docId = cur.activeDocId
    if (docId) {
      try {
        const html = remark().use(remarkGfm).use(remarkHtml).processSync(newContent).toString()
        useEditorStore.getState().updateDoc({ md: newContent, html, docsMd: { [docId]: newContent } })
        localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md: newContent, html, savedAt: Date.now() }))
      } catch {}
    }
    closeInsert()
  }
  const insertCode = (code: string, lang: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text: code }] }).run()
    closeInsert()
  }
  const insertLink = (text: string, url: string, newTab?: boolean) => {
    if (!editor) return
    const linkContent = {
      type: 'link',
      attrs: { href: url, ...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }
    }
    if (text.trim() && text !== url) {
      editor.chain().focus().setTextSelection({ from: editor.state.selection.from, to: editor.state.selection.to }).insertContent(text).run()
      editor.chain().focus().setLink(linkContent).run()
    } else {
      editor.chain().focus().extendMarkRange('link').insertContent(linkContent).run()
    }
    closeInsert()
  }
  const insertFormula = (formula: string) => {
    if (!editor) return
    editor.chain().focus().insertMath(formula).run()
    closeInsert()
  }
  const insertChart = (html: string, type: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(html).run()
    closeInsert()
  }
  const insertEmoji = (text: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(text).run()
    closeInsert()
  }
  const insertTable = (rows: number, cols: number, data?: string[][]) => {
    if (!editor || rows <= 0 || cols <= 0) return
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    if (data && data.length > 0) {
      const ed = useEditorStore.getState().editor
      if (ed) {
        let pos = 0
        for (let r = 0; r < data.length; r++) {
          for (let c = 0; c < cols && c < data[r].length; c++) {
            ed.chain().focus().insertTableContent(data[r][c]).run()
            pos++
            if (c < cols - 1) ed.chain().focus().goToNextCell().run()
          }
          if (r < data.length - 1) ed.chain().focus().goToNextRow().run()
        }
      }
    }
    closeInsert()
  }

  // ── 右侧面板内容 ──
  const rightPanelContent = (() => {
    if (appMode === 'history') return <HistoryPanel inline />
    if (appMode === 'style') return <StyleMainPanel />
    if (showOutline) return <SidebarOutline />
    if (showPreview) return <SidebarPreview />
    return null
  })()

  // ── 中心内容 ──
  const centerContent = (() => {
    if (appMode === 'edit' || appMode === 'code') {
      return <LZEditor />
    }
    if (appMode === 'read') {
      return <LZEditor />
    }
    if (appMode === 'history') {
      return <HistoryPanel inline />
    }
    if (appMode === 'style') {
      return <StyleMainPanel />
    }
    return <LZEditor />
  })()

  // ── 顶部布局 ──
  const topLayout = (
    <>
      <Toolbar />
      <DocumentMetaBar />
      <div className="app-main" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {showOutline && !showPreview && <SidebarOutline />}
        {showLibrary && <LibraryPanel sidebar />}
        {centerContent}
        {(showPreview) && appMode !== 'history' && appMode !== 'style' && <SidebarPreview />}
      </div>
      <StatusBar />
    </>
  )

  // ── 左侧布局：大纲 + 左导航 + 中编辑区 + 右面板 ──
  const leftLayout = (
    <div className="app-left-layout">
      {/* 大纲面板 */}
      {showOutline && !showPreview && (
        <div className="app-outline-panel">
          <SidebarOutline />
        </div>
      )}

      {/* 左导航 */}
      <div className="app-left-nav">
        <LeftNav />
      </div>

      {/* 中编辑区 */}
      <div className="app-center">
        <DocumentMetaBar />
        <div className="app-editor-area">
          {centerContent}
        </div>
        <StatusBar className="statusbar-vertical" />
      </div>

      {/* 右面板 */}
      {(showRightPanel || showPreview) && (
        <div className="app-right-panel">
          {appMode === 'history' && <HistoryPanel inline />}
          {appMode === 'style' && <StyleMainPanel />}
          {showPreview && <SidebarPreview />}
        </div>
      )}
    </div>
  )

  return (
    <div className={`app${navMode === 'left' ? ' nav-mode-left' : ''}`} style={{ display: 'flex', flexDirection: navMode === 'left' ? 'row' : 'column', height: '100vh', overflow: 'hidden' }}>
      {navMode === 'left' ? leftLayout : topLayout}

      {openPanel === 'settings' && <SettingsDialog onClose={closePanel} />}
      {openPanel === 'export' && <ExportDialog onClose={closePanel} />}
      {openPanel === 'history' && <HistoryPanel onClose={closePanel} />}
      {openPanel === 'library' && <LibraryPanel onClose={closePanel} />}
      {openPanel === 'file' && <FilePanel onClose={closePanel} />}
      {openPanel === 'preview' && <PreviewPanel onClose={closePanel} />}
      {useEditorStore(s => s.showSearch) && <SearchPanel onClose={() => useEditorStore.getState().setShowSearch(false)} />}

      <AIPanel />

      {insertPanel === 'image' && <ImageDialog onClose={closeInsert} onInsert={insertImage} onUpload={uploadImage} codeModeCursor={codeModeCursor} onInsertMarkdown={insertMarkdown} />}
      {insertPanel === 'link' && <LinkDialog onClose={closeInsert} onInsert={insertLink} codeModeCursor={codeModeCursor} onInsertMarkdown={insertMarkdown} />}
      {insertPanel === 'code' && <CodeDialog onClose={closeInsert} onInsert={insertCode} />}
      {insertPanel === 'formula' && <FormulaDialog onClose={closeInsert} onInsert={insertFormula} />}
      {insertPanel === 'table' && (
        <TableDropdown open={true} onToggle={() => closeInsert()} onInsert={insertTable} />
      )}
      {insertPanel === 'emoji' && <EmojiDialog onClose={closeInsert} onInsert={insertEmoji} />}
      {insertPanel === 'chart' && <ChartDialog onClose={closeInsert} onInsert={insertChart} />}
    </div>
  )
}

export default App
