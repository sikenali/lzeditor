import React, { useEffect, useMemo, useState } from 'react'
import hljs from 'highlight.js'
import { CODE_THEMES } from '../../styles/code-themes'
import { UnifiedDialog, UDSection, UDSettingRow } from '../ui/UnifiedDialog'
import { LFSCombo } from '../../components/ui/LFSCombo'

const LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'go', 'rust',
  'swift', 'kotlin', 'c', 'c++', 'ruby', 'php', 'sql', 'bash', 'html', 'css', 'json',
]

const DEFAULTS: Record<string, string> = {
  python: 'print("Hello, World!")',
  javascript: 'console.log("Hello, World");',
  typescript: 'const msg: string = "Hello, World";\nconsole.log(msg);',
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

const THEME_OPTIONS = CODE_THEMES.map(t => ({
  id: t.id,
  name: t.name,
  icon: t.dark ? 'ri-moon-line' : 'ri-sun-line',
}))

interface CodeDialogProps {
  onClose: () => void
  onInsert: (code: string, language: string) => void
}

export const CodeDialog: React.FC<CodeDialogProps> = ({ onClose, onInsert }) => {
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState(DEFAULTS.python)
  const [themeId, setThemeId] = useState('atom-one-dark')
  const [macStyle, setMacStyle] = useState(false)

  useEffect(() => {
    const link = document.querySelector('link[data-code-dialog-theme]') as HTMLLinkElement | null
    link?.remove()
    const el = document.createElement('link')
    el.rel = 'stylesheet'
    el.href = `https://cdn.jsdelivr.net/npm/highlight.js/styles/${themeId}.min.css`
    el.setAttribute('data-code-dialog-theme', themeId)
    document.head.appendChild(el)
    return () => el.remove()
  }, [themeId])

  const previewHtml = useMemo(() => {
    try { return hljs.highlight(code || ' ', { language }).value } catch { return code }
  }, [code, language])

  const currentTheme = CODE_THEMES.find(t => t.id === themeId) || CODE_THEMES[0]

  const handleInsert = () => {
    if (!code.trim()) return
    onInsert(code.trim(), language)
    onClose()
  }

  return (
    <UnifiedDialog
      onClose={onClose} icon="ri-code-box-line"
      title="插入代码块" subtitle={`${language} · ${THEME_OPTIONS.find(t => t.id === themeId)?.name || ''}`}
      size="lg"
      rightContent={(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 主题选择 */}
          <UDSection label="高亮主题">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {THEME_OPTIONS.map(t => (
                <button
                  key={t.id}
                  className={`ud-btn${themeId === t.id ? ' ud-btn--primary' : ''}`}
                  onClick={() => setThemeId(t.id)}
                  style={{ flexDirection: 'column', gap: 6, padding: '14px 10px', justifyContent: 'center' }}
                >
                  <span className={`remix ${t.icon}`} style={{ fontSize: 18 }}></span>
                  <span style={{ fontSize: 12 }}>{t.name}</span>
                </button>
              ))}
            </div>
          </UDSection>

          {/* 语言 + Mac 样式 */}
          <UDSection label="选项设置">
            <UDSettingRow icon="ri-code-box-line" label="编程语言" desc="代码高亮语言">
              <LFSCombo value={language} onChange={setLanguage} options={LANGUAGES.map(l => ({ value: l, label: l }))} style={{ minWidth: 160 }} />
            </UDSettingRow>
            <UDSettingRow icon="ri-apple-fill" label="Mac 窗口样式" desc="代码块添加红黄绿三点装饰栏">
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={macStyle} onChange={e => setMacStyle(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }} />
              </label>
            </UDSettingRow>
          </UDSection>

          {/* 编辑器 */}
          <UDSection label="代码编辑器">
            <textarea
              className="ud-input"
              value={code} onChange={e => setCode(e.target.value)}
              spellCheck={false}
              placeholder={`输入 ${language} 代码...`}
              style={{ minHeight: 160, fontFamily: 'var(--font-mono)', fontSize: 12, resize: 'vertical' }}
            />
          </UDSection>

          {/* 预览 */}
          <UDSection label="预览">
            {macStyle ? (
              <pre style={{ background: currentTheme.macBg, borderRadius: 10, overflow: 'hidden', margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(0,0,0,0.15)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>{language}</span>
                </div>
                <div style={{ padding: '12px 16px', overflow: 'auto' }}>
                  <code className="hljs" dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ fontSize: 12, lineHeight: 1.6 }} />
                </div>
              </pre>
            ) : (
              <pre style={{ background: 'var(--bg-code)', borderRadius: 8, padding: '12px 16px', margin: 0, overflow: 'auto' }}>
                <code className="hljs" dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ fontSize: 12, lineHeight: 1.6 }} />
              </pre>
            )}
          </UDSection>
        </div>
      )}
      hint="代码块将插入到当前光标位置" submitText="插入代码块"
      onSubmit={handleInsert} submitDisabled={!code.trim()}
    />
  )
}
