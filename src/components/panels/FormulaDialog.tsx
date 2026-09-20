import React, { useEffect, useMemo, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface FormulaDialogProps {
  onClose: () => void
  onInsert: (formula: string) => void
}

const FORMULA_GROUPS = [
  {
    id: 'math',
    name: '数学',
    desc: '常用代数与微积分',
    icon: 'ri-function-fill',
    items: [
      { label: '二次方程', formula: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' },
      { label: '求和', formula: '\\sum_{i=1}^{n} x_i' },
      { label: '积分', formula: '\\int_{a}^{b} f(x)\\,dx' },
      { label: '矩阵', formula: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    ],
  },
  {
    id: 'physics',
    name: '物理',
    desc: '力学、电学、波动',
    icon: 'ri-planet-line',
    items: [
      { label: '质能方程', formula: 'E = mc^2' },
      { label: '牛顿第二定律', formula: 'F = ma' },
      { label: '欧姆定律', formula: 'V = IR' },
      { label: '波动方程', formula: 'v = f\\lambda' },
    ],
  },
  {
    id: 'chemistry',
    name: '化学',
    desc: '分子与反应式',
    icon: 'ri-flask-line',
    items: [
      { label: '水分子', formula: 'H_2O' },
      { label: '二氧化碳', formula: 'CO_2' },
      { label: '反应式', formula: '2H_2 + O_2 \\rightarrow 2H_2O' },
      { label: '酸碱平衡', formula: 'K_a = \\frac{[H^+][A^-]}{[HA]}' },
    ],
  },
  {
    id: 'statistics',
    name: '统计',
    desc: '均值、方差、分布',
    icon: 'ri-bar-chart-line',
    items: [
      { label: '均值', formula: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i' },
      { label: '方差', formula: '\\sigma^2=\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2' },
      { label: '正态分布', formula: 'f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{1}{2}(\\frac{x-\\mu}{\\sigma})^2}' },
    ],
  },
  {
    id: 'symbols',
    name: '符号',
    desc: '集合、逻辑、希腊字母',
    icon: 'ri-asterisk',
    items: [
      { label: '希腊字母', formula: '\\alpha, \\beta, \\gamma, \\delta, \\theta, \\pi' },
      { label: '集合', formula: 'A \\cup B,\\ A \\cap B,\\ A \\subseteq B' },
      { label: '逻辑', formula: 'p \\Rightarrow q,\\ p \\Leftrightarrow q' },
    ],
  },
]

export const FormulaDialog: React.FC<FormulaDialogProps> = ({ onClose, onInsert }) => {
  const [groupId, setGroupId] = useState(FORMULA_GROUPS[0].id)
  const [formula, setFormula] = useState(FORMULA_GROUPS[0].items[0].formula)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeGroup = FORMULA_GROUPS.find(group => group.id === groupId) || FORMULA_GROUPS[0]
  const preview = useMemo(() => {
    if (!formula.trim()) return { html: '', error: false }
    try {
      return { html: katex.renderToString(formula, { throwOnError: false, displayMode: true }), error: false }
    } catch {
      return { html: '<span style="color:#ff6b6b">公式语法错误</span>', error: true }
    }
  }, [formula])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleInsert = () => {
    if (!formula.trim() || preview.error) return
    onInsert(formula.trim())
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog insert-dialog" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon"><span className="remix ri-function-fill"></span></div>
            <div>
              <div className="insert-title">插入公式</div>
              <div className="insert-desc">{activeGroup.name} · LaTeX</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="insert-dialog-body">
          <div className="insert-left-nav formula-left-nav">
            {FORMULA_GROUPS.map(group => (
              <div key={group.id} className="formula-nav-group">
                <button
                  className={`insert-nav-item ${groupId === group.id ? 'active' : ''}`}
                  onClick={() => setGroupId(group.id)}
                >
                  <span className={`remix insert-nav-icon ${group.icon}`}></span>
                  <span className="insert-nav-name">{group.name}</span>
                  <span className="insert-nav-desc">{group.desc}</span>
                </button>
                {groupId === group.id && (
                  <div className="formula-quick-list">
                    {group.items.map(item => (
                      <button key={item.label} className="formula-quick-item" onClick={() => setFormula(item.formula)}>
                        <span>{item.label}</span>
                        <code>{item.formula}</code>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="insert-right-pane">
            <div className="insert-top-panel">
              <label className="export-field">
                <span className="export-label">公式代码</span>
                <textarea
                  ref={textareaRef}
                  className="formula-input"
                  value={formula}
                  onChange={e => setFormula(e.target.value)}
                  placeholder="输入 LaTeX 公式..."
                  spellCheck={false}
                  rows={5}
                />
              </label>
            </div>
            <div className="insert-preview-panel formula-preview-panel">
              {formula.trim() ? (
                <div dangerouslySetInnerHTML={{ __html: preview.html }} />
              ) : (
                <span className="formula-placeholder">在此输入公式查看预览...</span>
              )}
            </div>
            <div className="export-footer">
              <div className="export-hint">
                <span className="remix ri-information-line"></span>
                <span>点击左侧公式可同步到代码与预览</span>
              </div>
              <div className="export-actions">
                <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
                <button className="settings-save-btn" onClick={handleInsert} disabled={!formula.trim() || preview.error}>
                  <span className="remix ri-add-line"></span>
                  插入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
