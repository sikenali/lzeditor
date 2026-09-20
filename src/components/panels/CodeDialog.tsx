import React, { useEffect, useMemo, useState } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import 'highlight.js/styles/github.css'
import 'highlight.js/styles/monokai.css'
import { CODE_THEMES } from '../../styles/code-themes'

const LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'go', 'rust',
  'swift', 'kotlin', 'c', 'c++', 'csharp', 'ruby',
  'php', 'sql', 'bash', 'html', 'css', 'json', 'shell', 'plaintext',
]

const DEFAULTS: Record<string, string> = {
  python: 'print("Hello, World!")',
  javascript: 'console.log("Hello, World");',
  typescript: 'const message: string = "Hello, World";\nconsole.log(message);',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World");\n  }\n}',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, World")\n}',
  rust: 'fn main() {\n    println!("Hello, World");\n}',
  bash: 'echo "Hello, World"',
  html: '<main>\n  <h1>Hello, World</h1>\n</main>',
  css: 'body {\n  font-family: system-ui, sans-serif;\n}',
  json: '{\n  "message": "Hello, World"\n}',
  sql: "SELECT 'Hello, World' AS message;",
  plaintext: 'Hello, World',
}

const THEME_OPTIONS = [
  { id: 'atom-one-dark', name: 'Atom 暗色', desc: '深色高对比', icon: 'ri-moon-line' },
  { id: 'github', name: 'GitHub 亮色', desc: '清爽浅色代码', icon: 'ri-github-line' },
  { id: 'monokai', name: 'Monokai', desc: '经典暗色主题', icon: 'ri-contrast-2-line' },
  { id: 'atom-one-light', name: 'Atom 亮色', desc: '柔和浅色主题', icon: 'ri-sun-line' },
  { id: 'vs2015', name: 'VS 2015', desc: 'Visual Studio 暗色', icon: 'ri-code-s-slash-line' },
  { id: 'xcode', name: 'Xcode', desc: 'Apple 风格亮色', icon: 'ri-apple-line' },
]

interface CodeDialogProps {
  onClose: () => void
  onInsert: (code: string, language: string) => void
}

export const CodeDialog: React.FC<CodeDialogProps> = ({ onClose, onInsert }) => {
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState(DEFAULTS.python)
  const [themeId, setThemeId] = useState('atom-one-dark')
  const [macCodeBlock, setMacCodeBlock] = useState(false)

  useEffect(() => {
    const existing = document.querySelector('link[data-code-dialog-theme]') as HTMLLinkElement | null
    existing?.remove()
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://cdn.jsdelivr.net/npm/highlight.js/styles/${themeId}.min.css`
    link.setAttribute('data-code-dialog-theme', themeId)
    document.head.appendChild(link)
    return () => link.remove()
  }, [themeId])

  const previewHtml = useMemo(() => {
    try {
      return hljs.highlight(code || ' ', { language }).value
    } catch {
      return escapeHtml(code)
    }
  }, [code, language])

  const currentTheme = CODE_THEMES.find(t => t.id === themeId) || CODE_THEMES[0]

  const handleLanguageChange = (next: string) => {
    setLanguage(next)
    setCode(DEFAULTS[next] || DEFAULTS.plaintext)
  }

  const handleInsert = () => {
    if (!code.trim()) return
    onInsert(code.trim(), language)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog export-dialog-split settings-dialog insert-dialog" onClick={e => e.stopPropagation()}>
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-code-box-line"></span>
            <div>
              <div className="insert-title">插入代码块</div>
              <div className="insert-desc">{language} · {THEME_OPTIONS.find(t => t.id === themeId)?.name}</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="export-body export-body-split export-body-redesigned insert-dialog-body">
          <div className="export-left insert-left-nav">
            {THEME_OPTIONS.map(theme => (
              <button
                key={theme.id}
                className={`insert-nav-item ${themeId === theme.id ? 'active' : ''}`}
                onClick={() => setThemeId(theme.id)}
              >
                <span className={`remix insert-nav-icon ${theme.icon}`}></span>
                <span className="chip-name">{theme.name}</span>
                <span className="chip-desc">{theme.desc}</span>
              </button>
            ))}
          </div>

          <div className="export-right insert-right-pane code-insert-pane">
            <div className="insert-top-panel code-insert-controls">
              <label className="export-field">
                <span className="export-label">代码语言</span>
                <select className="lfs-input" value={language} onChange={e => handleLanguageChange(e.target.value)}>
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </label>
              <label className="option-toggle code-mac-toggle">
                <span className="option-toggle-label">Mac 窗口样式</span>
                <span className={`toggle-dot ${macCodeBlock ? 'on' : ''}`} onClick={() => setMacCodeBlock(!macCodeBlock)} />
              </label>
            </div>

            <div className="code-insert-editor">
              <textarea
                className="formula-input code-insert-textarea"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={`输入 ${language} 代码...`}
                spellCheck={false}
              />
            </div>

            <div className="insert-preview-panel code-insert-preview">
              {macCodeBlock ? (
                <pre className="mac-code-block" style={{ background: currentTheme.macBg }}>
                  <div className="mac-code-bar">
                    <span className="mac-code-dot red" />
                    <span className="mac-code-dot yellow" />
                    <span className="mac-code-dot green" />
                    <span className="mac-code-lang">{language}</span>
                  </div>
                  <div className="mac-code-body">
                    <code className="hljs" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                </pre>
              ) : (
                <pre><code className="hljs" dangerouslySetInnerHTML={{ __html: previewHtml }} /></pre>
              )}
            </div>

          </div>
        </div>
        <div className="export-footer">
          <div className="export-hint">
            <span className="remix ri-information-line"></span>
            <span>代码块将插入到当前光标位置</span>
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
            <button className="settings-save-btn" onClick={handleInsert} disabled={!code.trim()}>
              <span className="remix ri-add-line"></span>
              插入
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
