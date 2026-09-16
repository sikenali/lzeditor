import React, { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const ReadMode: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const docTitle = useEditorStore((s) => s.docTitle)
  const docPath = useEditorStore((s) => s.docPath)
  const docHTML = useEditorStore((s) => s.docHTML)
  const wordCount = useEditorStore((s) => s.wordCount)
  const fontSize = useEditorStore((s) => s.fontSize)
  const readProgress = useEditorStore((s) => s.readProgress)
  const setFontSize = useEditorStore((s) => s.setFontSize)
  const setReadProgress = useEditorStore((s) => s.setReadProgress)

  const bodyRef = useRef<HTMLDivElement>(null)

  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const handleScroll = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const scrollTop = el.scrollTop
    const scrollHeight = el.scrollHeight - el.clientHeight
    const progress = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
    setReadProgress(Math.min(100, Math.max(0, progress)))
  }, [setReadProgress])

  const handleFontSizeChange = (delta: number) => {
    setFontSize(Math.min(24, Math.max(13, fontSize + delta)))
  }

  const scrollToTop = () => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setReadProgress(0)
  }

  return (
    <div className="read-mode-overlay">
      <div className="read-mode-container" onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div className="read-mode-topbar">
          <div className="read-mode-left">
            <span className="remix ri-book-open-fill"></span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>阅读模式 · Read Mode</span>
          </div>
          <div className="read-mode-center">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{docPath || docTitle || 'untitled.md'}</span>
            <span className="read-divider" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>预计阅读 {readingTime} 分钟</span>
            <span className="read-divider" />
            <span style={{ fontSize: 12, color: 'var(--accent-primary)' }}>已读 {readProgress}%</span>
          </div>
          <div className="read-mode-right">
            <div className="font-size-control">
              <span className="remix ri-subtract" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => handleFontSizeChange(-1)} />
              <div className="font-slider" onClick={(e) => e.stopPropagation()}>
                <span
                  className="font-slider-fill"
                  style={{ width: `${Math.max(0, Math.min(54, (fontSize - 13) / (24 - 13) * 54))}px` }}
                />
                <span
                  className="font-slider-dot"
                  style={{ left: `${Math.max(0, Math.min(54, (fontSize - 13) / (24 - 13) * 54))}px` }}
                />
              </div>
              <span className="remix ri-add" style={{ fontSize: 14, cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => handleFontSizeChange(1)} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 24, textAlign: 'center' }}>{fontSize}px</span>
            </div>
            <button className="read-exit-btn" onClick={onClose}>
              <span className="remix ri-close-line"></span>
              <span>退出阅读</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="read-progress-bar">
          <div className="read-progress-fill" style={{ width: `${readProgress}%` }} />
        </div>

        {/* Article body */}
        <div
          ref={bodyRef}
          className="read-mode-body"
          onScroll={handleScroll}
        >
          <div className="read-article">
            <div className="read-article-header">
              <h1 className="read-article-title">{docTitle}</h1>
              <div className="read-meta">
                <div className="read-avatar" />
                <div>
                  <div className="read-author">LZEditor</div>
                  <div className="read-date">{new Date().toLocaleDateString('zh-CN')}</div>
                </div>
                <div className="read-divider-v" />
                <div className="read-views">
                  <span className="remix ri-time-line"></span>
                  <span>{readingTime} 分钟阅读</span>
                </div>
              </div>
            </div>

            <div
              className="read-article-body"
              dangerouslySetInnerHTML={{ __html: docHTML }}
              style={{ fontSize: `${fontSize}px` }}
            />

            <div className="read-footer">
              <div className="read-tags-footer">
                <span className="remix ri-price-tag-3-line"></span>
                <span className="read-tag-sm">markdown</span>
                <span className="read-tag-sm">writing</span>
                <span className="read-tag-sm">editor</span>
              </div>
              <div className="read-footer-actions">
                <button className="read-back-top-btn" onClick={scrollToTop}>
                  <span className="remix ri-arrow-up-line"></span>
                  <span>回到顶部</span>
                </button>
                <button className="read-edit-btn" onClick={onClose}>
                  <span className="remix ri-edit-line"></span>
                  <span>继续编辑</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
