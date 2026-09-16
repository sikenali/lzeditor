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
import { OutlinePanel } from './components/panels/OutlinePanel'
import { PreviewPanel } from './components/panels/PreviewPanel'
import { useEditorStore } from './store/editorStore'
import { useTheme } from './hooks/useTheme'

function App() {
  useTheme()
  const openPanel = useEditorStore(s => s.openPanel)
  const isReadMode = useEditorStore(s => s.isReadMode)

  const closePanel = () => useEditorStore.getState().setOpenPanel('none')

  return (
    <div className="app">
      <Toolbar />
      <DocumentMetaBar />
      <div className="app-main">
        <LZEditor />
      </div>
      <StatusBar />

      {openPanel === 'settings' && <SettingsDialog onClose={closePanel} />}
      {openPanel === 'export' && <ExportDialog onClose={closePanel} />}
      {openPanel === 'history' && <HistoryPanel onClose={closePanel} />}
      {openPanel === 'library' && <LibraryPanel onClose={closePanel} />}
      {openPanel === 'file' && <FilePanel onClose={closePanel} />}
      {openPanel === 'outline' && <OutlinePanel onClose={closePanel} />}
      {openPanel === 'preview' && <PreviewPanel onClose={closePanel} />}
      {isReadMode && <ReadMode onClose={() => useEditorStore.getState().setReadMode(false)} />}
    </div>
  )
}

export default App
