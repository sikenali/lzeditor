import React, { useState } from 'react'
import { LZEditor } from './components/editor/LZEditor'
import { TitleBar } from './components/layout/TitleBar'
import { Toolbar } from './components/layout/Toolbar'
import { DocumentMetaBar } from './components/layout/DocumentMetaBar'
import { StatusBar } from './components/layout/StatusBar'
import { SettingsDialog } from './components/panels/SettingsDialog'
import { ExportDialog } from './components/panels/ExportDialog'
import { HistoryPanel } from './components/panels/HistoryPanel'
import { ReadMode } from './components/panels/ReadMode'
import { useEditorStore } from './store/editorStore'

function App() {
  const openPanel = useEditorStore(s => s.openPanel)
  const isReadMode = useEditorStore(s => s.isReadMode)

  return (
    <div className="app">
      <TitleBar />
      <Toolbar />
      <DocumentMetaBar />
      <div className="app-main">
        <LZEditor />
      </div>
      <StatusBar />

      {openPanel === 'settings' && <SettingsDialog onClose={() => useEditorStore.getState().setOpenPanel('none')} />}
      {openPanel === 'export' && <ExportDialog onClose={() => useEditorStore.getState().setOpenPanel('none')} />}
      {openPanel === 'history' && <HistoryPanel onClose={() => useEditorStore.getState().setOpenPanel('none')} />}
      {isReadMode && <ReadMode onClose={() => useEditorStore.getState().setReadMode(false)} />}
    </div>
  )
}

export default App
