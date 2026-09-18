import React, { useState, useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface FormulaDialogProps {
  onClose: () => void
  onInsert: (formula: string) => void
}

const QUICK_FORMULAS = [
  {
    name: '基础运算',
    items: [
      { label: '分数', formula: '\\frac{a}{b}' },
      { label: '根号', formula: '\\sqrt{x}' },
      { label: 'n次根', formula: '\\sqrt[n]{x}' },
      { label: '加减乘除', formula: 'a \\pm b \\times c \\div d' },
    ]
  },
  {
    name: '指数与对数',
    items: [
      { label: '幂运算', formula: 'a^{n} + b^{n}' },
      { label: '对数', formula: '\\log_a b' },
      { label: '自然对数', formula: '\\ln x' },
      { label: '常用对数', formula: '\\lg x' },
    ]
  },
  {
    name: '三角函数',
    items: [
      { label: '正弦', formula: '\\sin \\theta' },
      { label: '余弦', formula: '\\cos \\theta' },
      { label: '正切', formula: '\\tan \\theta' },
      { label: '恒等式', formula: '\\sin^2 \\theta + \\cos^2 \\theta = 1' },
    ]
  },
  {
    name: '求和与积分',
    items: [
      { label: '求和', formula: '\\sum_{i=1}^{n} x_i' },
      { label: '乘积', formula: '\\prod_{i=1}^{n} x_i' },
      { label: '极限', formula: '\\lim_{x \\to \\infty} f(x)' },
      { label: '定积分', formula: '\\int_{a}^{b} f(x) dx' },
    ]
  },
  {
    name: '矩阵与行列式',
    items: [
      { label: '向量', formula: '\\vec{v} = \\begin{pmatrix} a \\\\ b \\end{pmatrix}' },
      { label: '矩阵', formula: 'A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: '行列式', formula: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
      { label: '转置', formula: 'A^T' },
    ]
  },
  {
    name: '特殊符号',
    items: [
      { label: '希腊字母 αβγ', formula: '\\alpha, \\beta, \\gamma, \\delta' },
      { label: '无穷大', formula: '\\infty' },
      { label: '偏导', formula: '\\frac{\\partial f}{\\partial x}' },
      { label: '空集', formula: '\\emptyset' },
    ]
  },
]

export const FormulaDialog: React.FC<FormulaDialogProps> = ({ onClose, onInsert }) => {
  const [formula, setFormula] = useState('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState(false)
  const [showQuickRef, setShowQuickRef] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const quickRefRef = useRef<HTMLDivElement>(null)

  // Compute preview via useEffect to avoid setState during render
  useEffect(() => {
    if (!formula.trim()) {
      setPreviewHtml('')
      setPreviewError(false)
      return
    }
    try {
      setPreviewError(false)
      setPreviewHtml(katex.renderToString(formula, { throwOnError: false, displayMode: true }))
    } catch {
      setPreviewError(true)
      setPreviewHtml('<span style="color: #ff6b6b;">公式语法错误</span>')
    }
  }, [formula])

  const handleInsert = () => {
    if (!formula.trim()) return
    onInsert(formula.trim())
    onClose()
  }

  // Close quick ref when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (quickRefRef.current && !quickRefRef.current.contains(e.target as Node)) {
        setShowQuickRef(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = ta.value
    ta.value = value.substring(0, start) + text + value.substring(end)
    ta.selectionStart = ta.selectionEnd = start + text.length
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog formula-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-function-fill"></span>
            <div>
              <div className="export-title-text">插入公式</div>
              <div className="export-title-desc">输入 LaTeX 公式代码，实时预览</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="export-body">
          {/* Formula input */}
          <div className="formula-field">
            <label className="export-label">公式代码 (LaTeX)</label>
            <textarea
              ref={textareaRef}
              className="formula-input"
              value={formula}
              onChange={e => setFormula(e.target.value)}
              placeholder={'输入 LaTeX 公式...'}
              spellCheck={false}
              rows={3}
            />
          </div>

          {/* Preview */}
          <div className="formula-preview-area">
            <label className="export-label">预览</label>
            <div className="formula-preview">
              {formula.trim() ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <span className="formula-placeholder">在此输入公式查看预览...</span>
              )}
              {previewError && formula.trim() && (
                <span className="formula-error">公式语法错误，请检查 LaTeX 语法</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="export-footer">
          <div className="formula-footer-left">
            <button
              className="quick-ref-btn"
              onClick={() => setShowQuickRef(!showQuickRef)}
              title="公式速查表"
            >
              <span className="remix ri-book-open-line"></span>
              <span>公式速查</span>
              <span className={`quick-ref-arrow ${showQuickRef ? 'open' : ''}`}>▼</span>
            </button>
            {showQuickRef && (
              <div className="quick-ref-panel" ref={quickRefRef}>
                <div className="quick-ref-content">
                  {QUICK_FORMULAS.map((group, gi) => (
                    <div key={gi} className="quick-ref-group">
                      <div className="quick-ref-group-title">{group.name}</div>
                      <div className="quick-ref-items">
                        {group.items.map((item, i) => (
                          <button
                            key={i}
                            className="quick-ref-item"
                            onClick={() => {
                              insertAtCursor(item.formula)
                              setShowQuickRef(false)
                            }}
                            title={item.label}
                          >
                            <span className="quick-ref-label">{item.label}</span>
                            <code className="quick-ref-code">{item.formula}</code>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
            <button
              className="settings-save-btn"
              onClick={handleInsert}
              disabled={!formula.trim() || previewError}
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
