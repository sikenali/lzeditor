import React, { useState, useEffect, useRef } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import 'highlight.js/styles/github.css'
import 'highlight.js/styles/monokai.css'

// Top 20 most popular languages (TIOBE + GitHub + Stack Overflow 2024)
const LANGUAGES = [
  'python', 'java', 'c', 'c++', 'csharp',
  'javascript', 'go', 'typescript', 'rust', 'swift',
  'kotlin', 'ruby', 'php', 'sql', 'bash',
  'html', 'css', 'json', 'shell', 'plaintext',
]

const DEFAULTS: Record<string, string> = {
  python:    'print("Hello, World!")',
  java:      'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}',
  'c':         'int main() {\n  printf("Hello, World!\\n");\n  return 0;\n}',
  'c++':       '#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}',
  csharp:    'class Program {\n  static void Main() {\n    Console.WriteLine("Hello, World!");\n  }\n}',
  javascript:'console.log("Hello, World!");',
  go:        'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}',
  typescript:'console.log("Hello, World!");',
  rust:      'fn main() {\n    println!("Hello, World!");\n}',
  swift:     'print("Hello, World!")',
  kotlin:    'fun main() {\n    println("Hello, World!")\n}',
  ruby:      'puts "Hello, World!"',
  php:       '<?php\necho "Hello, World!";\n?>',
  sql:       'SELECT \'Hello, World!\' AS greeting;',
  bash:      'echo "Hello, World!"',
  html:      '<!DOCTYPE html>\n<html>\n<head><title>Hello</title></head>\n<body>\n  <p>Hello, World!</p>\n</body>\n</html>',
  css:       '/* Hello, World! */\nbody {\n  color: #333;\n  font-family: sans-serif;\n}',
  json:      '{\n  "message": "Hello, World!"\n}',
  shell:     'echo "Hello, World!"',
}

const THEMES = [
  { id: 'atom-one-dark', name: 'VS Code Dark' },
  { id: 'github', name: 'GitHub Light' },
  { id: 'monokai', name: 'Monokai' },
]

interface CodeDialogProps {
  onClose: () => void
  onInsert: (code: string, language: string) => void
}

export const CodeDialog: React.FC<CodeDialogProps> = ({ onClose, onInsert }) => {
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState(DEFAULTS['python'] ?? '')
  const [themeId, setThemeId] = useState('atom-one-dark')
  const [previewHtml, setPreviewHtml] = useState('')
  const [showBeautify, setShowBeautify] = useState(false)
  const [themeCSS, setThemeCSS] = useState('')
  const themeStyleRef = useRef<HTMLStyleElement | null>(null)
  const beautifyRef = useRef<HTMLDivElement>(null)

  // Load theme CSS via dynamic import
  useEffect(() => {
    const load = async () => {
      try {
        // @vite-ignore
        const mod = await import(`highlight.js/styles/${themeId}.css`)
        setThemeCSS((mod as any).default || '')
      } catch {
        setThemeCSS('')
      }
    }
    load()
  }, [themeId])

  // Inject theme CSS into document head
  useEffect(() => {
    if (themeStyleRef.current) themeStyleRef.current.remove()
    if (!themeCSS) return
    const el = document.createElement('style')
    el.setAttribute('data-code-theme', themeId)
    el.textContent = themeCSS
    document.head.appendChild(el)
    themeStyleRef.current = el
    return () => { el.remove() }
  }, [themeCSS, themeId])

  // Close beautify panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (beautifyRef.current && !beautifyRef.current.contains(e.target as Node)) {
        setShowBeautify(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Update preview whenever code or language changes
  useEffect(() => {
    try {
      const result = hljs.highlight(code || ' ', { language })
      setPreviewHtml(result.value)
    } catch {
      setPreviewHtml(escapeHtml(code))
    }
  }, [code, language])

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    setCode(DEFAULTS[lang] ?? '')
  }

  const handleInsert = () => {
    if (!code.trim()) return
    onInsert(code.trim(), language)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-code-box-line"></span>
            <div>
              <div className="export-title-text">插入代码</div>
              <div className="export-title-desc">选择语言，编写或粘贴代码</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="export-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Language selector */}
          <div className="export-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="export-label" style={{ whiteSpace: 'nowrap' }}>代码语言</label>
            <select
              className="lfs-input"
              value={language}
              onChange={e => handleLanguageChange(e.target.value)}
              style={{ flex: 1, cursor: 'pointer' }}
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Code textarea */}
          <div className="export-field" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <label className="export-label">代码内容</label>
            <textarea
              className="lfs-input"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={`输入 ${language} 代码...`}
              spellCheck={false}
              style={{
                minHeight: 160,
                resize: 'vertical',
                fontFamily: '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace',
                fontSize: 13,
                lineHeight: 1.6,
                tabSize: 2,
              }}
            />
          </div>

          {/* Preview section */}
          <div className="export-field" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="export-label" style={{ margin: 0 }}>预览</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>主题：</span>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    className={`theme-chip ${themeId === t.id ? 'active' : ''}`}
                    onClick={() => setThemeId(t.id)}
                    title={t.name}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="code-preview" style={{ marginTop: 8 }}>
              <pre><code className="hljs" dangerouslySetInnerHTML={{ __html: previewHtml }} /></pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="export-footer">
          <div className="code-footer-left">
            <button
              className="beautify-btn"
              onClick={() => setShowBeautify(!showBeautify)}
              title="美化代码 — 切换高亮样式"
            >
              <span className="remix ri-palette-line"></span>
              <span>美化代码</span>
              <span className={`beautify-arrow ${showBeautify ? 'open' : ''}`}>▼</span>
            </button>
            {showBeautify && (
              <div className="beautify-panel" ref={beautifyRef}>
                <div className="beautify-content">
                  <div className="beautify-group-title">选择代码高亮主题</div>
                  <div className="beautify-grid">
                    {THEMES.map(t => (
                      <button
                        key={t.id}
                        className={`beautify-card ${themeId === t.id ? 'active' : ''}`}
                        onClick={() => { setThemeId(t.id); setShowBeautify(false); }}
                      >
                        <div className="beautify-card-preview" style={{ background: t.id === 'github' ? '#f6f8fa' : t.id === 'atom-one-dark' ? '#282c34' : '#272822' }}>
                          <code className="hljs" style={{ fontSize: 10, padding: 6, display: 'block', fontFamily: 'Consolas, monospace' }}>
                            {t.id === 'github' ? 'print("hello")'
                             : t.id === 'atom-one-dark' ? 'console.log("hi")'
                             : 'puts "hello"'}
                          </code>
                        </div>
                        <span className="beautify-card-name">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
            <button
              className="settings-save-btn"
              onClick={handleInsert}
              disabled={!code.trim()}
            >
              <span className="remix ri-checkbox-fill"></span>
              插入
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
