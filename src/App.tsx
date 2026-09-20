import React, { useState } from 'react'
import { LZEditor } from './components/editor/LZEditor'
import { Toolbar } from './components/layout/Toolbar'
import { DocumentMetaBar } from './components/layout/DocumentMetaBar'
import { StatusBar } from './components/layout/StatusBar'
import { SettingsDialog } from './components/panels/SettingsDialog'
import { ExportDialog } from './components/panels/ExportDialog'
import { HistoryPanel } from './components/panels/HistoryPanel'
import { ReadMode } from './components/panels/ReadMode'
import { CodeMode } from './components/panels/CodeMode'
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
import { useTheme } from './hooks/useTheme'

function App() {
  useTheme()
  const openPanel = useEditorStore(s => s.openPanel)
  const insertPanel = useEditorStore(s => s.insertPanel)
  const isReadMode = useEditorStore(s => s.isReadMode)
  const codeMode = useEditorStore(s => s.codeMode)
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const showLibrary = useEditorStore(s => s.showLibrary)
  const editor = useEditorStore(s => s.editor)

  const closePanel = () => useEditorStore.getState().setOpenPanel('none')
  const closeInsert = () => useEditorStore.getState().setInsertPanel('none')

  const insertImage = (url: string, alt: string) => {
    if (!editor) return
    editor.chain().focus().insertImage({ src: url, alt }).run()
    closeInsert()
  }
  const uploadImage = (file: File) => {
    if (!editor) return
    const reader = new FileReader()
    reader.onload = (ev) => insertImage(ev.target?.result as string, file.name)
    reader.readAsDataURL(file)
    closeInsert()
  }
  const insertCode = (code: string, lang: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text: code }] }).run()
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
  const insertTable = (rows: number, cols: number) => {
    if (!editor || rows <= 0 || cols <= 0) return
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    closeInsert()
  }

  return (
    <div className="app">
      <Toolbar />
      <DocumentMetaBar />
      <div className="app-main">
        <div className="app-layout">
          {showLibrary && <LibraryPanel sidebar />}
          {showOutline && <SidebarOutline />}
          <LZEditor />
          {showPreview && <SidebarPreview />}
        </div>
      </div>
      <StatusBar />

      {openPanel === 'settings' && <SettingsDialog onClose={closePanel} />}
      {openPanel === 'export' && <ExportDialog onClose={closePanel} />}
      {openPanel === 'history' && <HistoryPanel onClose={closePanel} />}
      {openPanel === 'library' && <LibraryPanel onClose={closePanel} />}
      {openPanel === 'file' && <FilePanel onClose={closePanel} />}
      {openPanel === 'preview' && <PreviewPanel onClose={closePanel} />}
      {isReadMode && <ReadMode onClose={() => useEditorStore.getState().setReadMode(false)} />}
      {codeMode && <CodeMode onClose={() => useEditorStore.getState().setCodeMode(false)} />}
      <AIPanel />

      {insertPanel === 'image' && <ImageDialog onClose={closeInsert} onInsert={insertImage} onUpload={uploadImage} />}
      {insertPanel === 'link' && <LinkDialog onClose={closeInsert} />}
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
