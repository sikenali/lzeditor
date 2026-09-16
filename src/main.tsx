import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useSettingsStore, loadSettingsFromStorage, DEFAULT_SETTINGS } from './store/settingsStore'
import { applyTheme } from './hooks/useTheme'
import './styles/globals.css'
import './styles/layout.css'
import './styles/settings-dialog.css'
import './styles/panels.css'
import './styles/read-mode.css'
import './styles/app.css'

// Restore persisted settings and apply theme synchronously before first
// paint to avoid a flash of wrong theme.
const saved = loadSettingsFromStorage()
useSettingsStore.setState({ ...DEFAULT_SETTINGS, ...saved })
applyTheme(useSettingsStore.getState().theme, useSettingsStore.getState().accentColor)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
