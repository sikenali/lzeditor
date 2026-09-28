import React, { useRef, useEffect } from 'react'

interface Props {
  onClose: () => void
}

export const OpenKnowledgePanel: React.FC<Props> = ({ onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handler)
    }
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="lz-open-knowledge-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className="lz-open-knowledge-panel"
        style={{
          width: '92vw',
          maxWidth: 1200,
          height: '88vh',
          maxHeight: 800,
          background: 'var(--background-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          background: 'var(--chrome-surface)',
        }}>
          <span className="remix ri-openai-fill" style={{ fontSize: 20, color: 'var(--accent-primary)', flexShrink: 0 }}></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>AI 助手</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Powered by openknowledge.a</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src="https://openknowledge.a"
          title="AI 助手"
          style={{
            flex: 1, border: 'none', background: '#fff',
            minHeight: 0,
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
