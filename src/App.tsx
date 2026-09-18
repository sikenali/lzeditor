import React, { useState } from 'react'
import { LZEditor } from './components/editor/LZEditor'
import { Toolbar } from './components/layout/Toolbar'
import { DocumentMetaBar } from './components/layout/DocumentMetaBar'
import { StatusBar } from './components/layout/StatusBar'
import { SettingsDialog } from './components/panels/SettingsDialog'
import { ExportDialog } from './components/panels/ExportDialog'
import { HistoryPanel } from './components/panels/HistoryPanel'
import { ReadMode } from './components/panels/ReadMode'
import { LibraryPanel } from './components/panels/LibraryPanel'
import { FilePanel } from './components/panels/FilePanel'
import { PreviewPanel } from './components/panels/PreviewPanel'
import { SidebarOutline } from './components/sidebar/SidebarOutline'
import { SidebarPreview } from './components/sidebar/SidebarPreview'
import { AIPanel } from './components/editor/AIPanel'
import { useEditorStore } from './store/editorStore'
import { useTheme } from './hooks/useTheme'

function App() {
  useTheme()
  const openPanel = useEditorStore(s => s.openPanel)
  const isReadMode = useEditorStore(s => s.isReadMode)
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)

  const closePanel = () => useEditorStore.getState().setOpenPanel('none')

  return (
    <div className="app">
      <Toolbar />
      <DocumentMetaBar />
      <div className="app-main">
        <div className="app-layout">
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
      <AIPanel />
    </div>
  )
}

export default App
