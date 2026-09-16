import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LZEditor } from './components/editor/LZEditor';
import { TitleBar } from './components/layout/TitleBar';
import { Toolbar } from './components/layout/Toolbar';
import { DocumentMetaBar } from './components/layout/DocumentMetaBar';
import { StatusBar } from './components/layout/StatusBar';
import { SettingsDialog } from './components/panels/SettingsDialog';
import { ExportDialog } from './components/panels/ExportDialog';
import { HistoryPanel } from './components/panels/HistoryPanel';
import { ReadMode } from './components/panels/ReadMode';
import { useEditorStore } from './store/editorStore';
function App() {
    const openPanel = useEditorStore(s => s.openPanel);
    const isReadMode = useEditorStore(s => s.isReadMode);
    return (_jsxs("div", { className: "app", children: [_jsx(TitleBar, {}), _jsx(Toolbar, {}), _jsx(DocumentMetaBar, {}), _jsx("div", { className: "app-main", children: _jsx(LZEditor, {}) }), _jsx(StatusBar, {}), openPanel === 'settings' && _jsx(SettingsDialog, { onClose: () => useEditorStore.getState().setOpenPanel('none') }), openPanel === 'export' && _jsx(ExportDialog, { onClose: () => useEditorStore.getState().setOpenPanel('none') }), openPanel === 'history' && _jsx(HistoryPanel, { onClose: () => useEditorStore.getState().setOpenPanel('none') }), isReadMode && _jsx(ReadMode, { onClose: () => useEditorStore.getState().setReadMode(false) })] }));
}
export default App;
