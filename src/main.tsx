import React from 'react'
import ReactDOM from 'react-dom/client'
import 'katex/dist/katex.min.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useSettingsStore, loadSettingsFromStorage, DEFAULT_SETTINGS } from './store/settingsStore'
import { applyTheme } from './hooks/useTheme'
import { applyTypographyTheme } from './styles/typography-themes'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/ui.css'
import './styles/globals.css'
import './styles/layout.css'
import './styles/settings-dialog.css'
import './styles/panels.css'
import './styles/read-mode.css'
import './styles/code-mode.css'
import './styles/floating.css'
import './styles/app.css'
import './styles/welcome-screen.css'
import { registerDemoPlugins } from './plugins/demo'
import { exposePluginApiForDevelopment } from './plugins'

// 内置示例插件：演示贡献点接线（纯增量，不碰现有功能）
registerDemoPlugins()
// 开发构建把插件 API 挂到 window.__lzPlugins，便于插件/控制台调试
exposePluginApiForDevelopment()

// Restore persisted settings and apply theme synchronously before first
// paint to avoid a flash of wrong theme.
const saved = loadSettingsFromStorage()
useSettingsStore.setState({ ...DEFAULT_SETTINGS, ...saved })
const state = useSettingsStore.getState()
applyTheme(state.theme, state.accentColor)
applyTypographyTheme(state.typographyTheme || 'classic')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
