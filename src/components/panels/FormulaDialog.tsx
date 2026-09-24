import React, { useState, useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { UnifiedDialog, UDSection, UDInput } from '../ui/UnifiedDialog'

const EXAMPLES = [
  { label: '二次公式', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', icon: 'ri-function-fill' },
  { label: '积分', formula: '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}', icon: 'ri-function-fill' },
  { label: '导数', formula: '\\frac{d}{dx}x^n = nx^{n-1}', icon: 'ri-leaf-fill' },
  { label: '化学方程式', formula: '2H_2 + O_2 \\rightarrow 2H_2O', icon: 'ri-flask-fill' },
] as const

export const FormulaDialog: React.FC<{ onClose: () => void; onInsert: (formula: string) => void }> = ({ onClose, onInsert }) => {
  const [formula, setFormula] = useState<string>(EXAMPLES[0].formula)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = previewRef.current
    if (!el || !formula.trim()) return
    try {
      el.innerHTML = ''
      katex.render(formula, el, { throwOnError: false, displayMode: true })
    } catch {}
  }, [formula])

  const handleInsert = () => {
    if (!formula.trim()) return
    onInsert(formula.trim())
    onClose()
  }

  return (
    <UnifiedDialog
      onClose={onClose} icon="ri-function-fill"
      title="数学公式" subtitle="使用 LaTeX 语法输入公式"
      size="md"
      rightContent={(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <UDSection label="公式模板">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {EXAMPLES.map(ex => (
                <button key={ex.label} className={`ud-btn${formula === ex.formula ? ' ud-btn--primary' : ''}`}
                  onClick={() => setFormula(ex.formula)} style={{ flexDirection: 'column', gap: 4, padding: '10px 8px' }}>
                  <span className={`remix ${ex.icon}`} style={{ fontSize: 18 }}></span>
                  <span style={{ fontSize: 11 }}>{ex.label}</span>
                </button>
              ))}
            </div>
          </UDSection>
          <UDSection label="公式编辑器">
            <UDInput
              value={formula} onChange={e => setFormula(e.target.value)}
              placeholder="输入 LaTeX 公式，如 E = mc^2"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </UDSection>
          <UDSection label="实时预览">
            <div ref={previewRef} style={{
              background: 'var(--bg-code)', borderRadius: 8, padding: '16px 20px',
              minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflowX: 'auto'
            }} />
          </UDSection>
        </div>
      )}
      hint="公式将以内联数学元素插入"
      submitText="插入公式"
      onSubmit={handleInsert} submitDisabled={!formula.trim()}
    />
  )
}
