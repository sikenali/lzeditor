import React, { useEffect, useRef, useState, useMemo } from 'react'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getTypographyTheme } from '../../styles/typography-themes'
import { DEFAULT_CONTENT } from '../../components/editor/constants'

const STYLE_SETS = [
  { id: 'default', name: 'Default', accent: '#1a73e8' },
  { id: 'ocean', name: 'Ocean', accent: '#0ea5e9' },
  { id: 'plain', name: 'Plain', accent: '#64748b' },
  { id: 'summer', name: 'Summer', accent: '#b43a2e' },
] as const

export const StyleMainPanel: React.FC = () => {
  const docTitle = useEditorStore((s) => s.docTitle)
  const docHTML = useEditorStore((s) => s.docHTML)
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const fontSize = useEditorStore((s) => s.fontSize)
  const previewMode = useEditorStore((s: any) => s.previewMode)
  const setPreviewMode = useEditorStore((s: any) => s.setPreviewMode)
  const setAppMode = useEditorStore((s) => s.setAppMode)

  const bodyRef = useRef<HTMLDivElement>(null)
  const [activeStyle, setActiveStyle] = useState('default')
  const [isCodeMode, setIsCodeMode] = useState(previewMode === 'code')

  const effectiveMd = useMemo(() => {
    if (mdContent) return mdContent
    if (docsMd[activeDocId || 'welcome']) return docsMd[activeDocId || 'welcome']
    try {
      const raw = localStorage.getItem(`lzeditor-doc-${activeDocId || 'welcome'}`)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.md) return d.md
      }
    } catch {}
    return ''
  }, [activeDocId, mdContent, docsMd])

  const renderedHtml = useMemo(() => {
    if (!effectiveMd) return ''
    try {
      return remark().use(remarkGfm).use(remarkHtml).processSync(effectiveMd).toString()
    } catch {
      return effectiveMd
    }
  }, [effectiveMd])

  const initialHtml = useMemo(() => {
    if (docHTML) return docHTML
    try {
      const raw = localStorage.getItem(`lzeditor-doc-${activeDocId || 'welcome'}`)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.html) return d.html
      }
      const old = localStorage.getItem('lzeditor-doc')
      if (old) {
        const d = JSON.parse(old)
        if (d.html) return d.html
      }
    } catch {}
    return ''
  }, [docHTML, activeDocId])

  const defaultHtml = useMemo(() => {
    try {
      return remark().use(remarkGfm).use(remarkHtml).processSync(DEFAULT_CONTENT).toString()
    } catch {
      return DEFAULT_CONTENT
    }
  }, [])

  const [effectiveHtml, setEffectiveHtml] = useState(initialHtml || defaultHtml)
  useEffect(() => {
    setEffectiveHtml(docHTML || initialHtml || defaultHtml)
  }, [docHTML, initialHtml, defaultHtml])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const theme = getTypographyTheme(typographyTheme || 'classic')
    if (theme && el) {
      el.style.cssText = ''
      const css = theme.css
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.(lz-editor-content|read-article-body|preview-doc|export-preview-body)/g, '.read-article-body')
      const styleEl = document.getElementById('lz-styleread-typography-css') as HTMLStyleElement | null
      if (styleEl) styleEl.remove()
      const styleTag = document.createElement('style')
      styleTag.id = 'lz-styleread-typography-css'
      styleTag.textContent = css
      document.head.appendChild(styleTag)
    }
  }, [typographyTheme, effectiveHtml])

  const activeStyleData = STYLE_SETS.find(s => s.id === activeStyle) ?? STYLE_SETS[0]

  const handleFullscreen = () => {
    const el = document.documentElement
    if (!el.requestFullscreen) return
    if (!document.fullscreenElement) el.requestFullscreen()
    else document.exitFullscreen()
  }

  const handleScrollTop = () => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="style-main-panel">
        {/* ── Read content area ── */}
        <div ref={bodyRef} className="style-read-scroll">
          <div className="style-read-article" style={{ maxWidth: 760 }}>
            <div className="main-read-header">
              <div className="main-read-tags">
                <span className="read-tag read-tag-tech">Markdown</span>
              </div>
              <h1 className="read-article-title">{docTitle}</h1>
              <div className="read-meta">
                <div className="read-avatar" style={{ backgroundImage: 'url(https://i.pravatar.cc/70?img=12)' }} />
                <div className="read-author-info">
                  <div className="read-author-name">LZEditor</div>
                  <div className="read-author-date">{new Date().toLocaleDateString('zh-CN')}</div>
                </div>
                <div className="read-divider-v" />
              </div>
            </div>
            {isCodeMode ? (
              <pre className="style-code-block"><code>{effectiveMd || '# Welcome to LZEditor\n\n请切换到编辑模式后查看预览内容...'}</code></pre>
            ) : (
              <div
                className="read-article-body"
                style={{ fontSize: `${fontSize}px`, lineHeight: '1.9', '--style-accent': activeStyleData.accent } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: renderedHtml || '<p style="color:var(--text-muted);text-align:center;padding:60px;">暂无内容</p>' }}
              />
            )}
          </div>
        </div>

        {/* ── Style Panel (matches design 065a3800) ── */}
        <div className="style-panel">
          <div className="style-panel-inner">
            {/* Toolbar */}
            <div className="style-toolbar">
              <div className="style-label-group">
                <span className="style-label-text">文档样式:</span>
                <button className="style-select-btn">
                  <span>{activeStyleData.name}</span>
                  <span className="remix ri-arrow-down-s-line"></span>
                </button>
              </div>
              <button className="style-action-btn" title="隐藏预览">
                <span className="remix ri-eye-off-line"></span>
                <span>隐藏</span>
              </button>
              <button className="style-action-btn" title="导出样式">
                <span className="remix ri-download-2-line"></span>
                <span>导出</span>
              </button>
              <button
                className={`preview-mode-btn ${isCodeMode ? 'active' : ''}`}
                onClick={() => { setIsCodeMode(!isCodeMode); setPreviewMode(isCodeMode ? 'render' : 'code') }}
                title="切换源码模式"
              >
                <span className="remix ri-code-s-line"></span>
                <span>源码</span>
              </button>
              <div style={{ flex: 1 }} />
              <button className="style-action-btn" onClick={() => setAppMode('edit')} title="关闭">
                <span className="remix ri-close-line"></span>
                <span>关闭</span>
              </button>
            </div>

            {/* Style cards */}
            <div className="style-cards">
              {STYLE_SETS.map(s => (
                <button
                  key={s.id}
                  className={`style-card${s.id === activeStyle ? ' active' : ''}`}
                  onClick={() => setActiveStyle(s.id)}
                >
                  <div
                    className="style-card-thumb"
                    style={{ borderColor: s.id === activeStyle ? s.accent : 'rgba(204,204,204,1)' }}
                  >
                    <div className="thumb-line thumb-line-title" style={{ color: s.accent }}>Lorem ipsum</div>
                    <div className="thumb-line" />
                    <div className="thumb-line" />
                    <div className="thumb-line thumb-line-short" />
                    <div className="thumb-line thumb-line-sub">Etiam fringilla</div>
                    <div className="thumb-line" />
                    <div className="thumb-line" />
                    <div className="thumb-line thumb-line-short" />
                    <div className="thumb-line thumb-line-sub">Aliquam semper</div>
                    <div className="thumb-sep" />
                    <div className="thumb-line thumb-line-author">Thomas antoine</div>
                    <div className="thumb-line thumb-line-short" />
                  </div>
                  <div className="style-card-name" style={s.id === activeStyle ? { color: s.accent } : undefined}>
                    {s.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fixed floating nav — always visible at bottom center ── */}
      <div className="main-nav-float" style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)' }}>
        <button className="nav-float-btn" title="上一页">
          <span className="remix ri-arrow-left-s-line"></span>
        </button>
        <button className="nav-float-btn" title="下一页">
          <span className="remix ri-arrow-right-s-line"></span>
        </button>
        <button className="nav-float-btn" title="回到顶部" onClick={handleScrollTop}>
          <span className="remix ri-arrow-up-s-line"></span>
        </button>
        <button className="nav-float-btn" title="全屏" onClick={handleFullscreen}>
          <span className="remix ri-fullscreen-line"></span>
        </button>
      </div>
    </>
  )
}
