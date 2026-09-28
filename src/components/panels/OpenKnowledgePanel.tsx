import React, { useRef, useEffect } from 'react'

interface Props {
  onClose: () => void
}

export const OpenKnowledgePanel: React.FC<Props> = ({ onClose }) => {
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
    <div className="lz-ok-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={handleBackdropClick}>
      <div className="lz-ok-panel" ref={containerRef} style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--background)',
      }}>
        {/* Header */}
        <div className="lz-ok-header" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          background: 'var(--chrome-surface)',
          backdropFilter: 'blur(12px)',
        }}>
          <span className="remix ri-openai-fill" style={{ fontSize: 22, color: 'var(--accent-primary)', flexShrink: 0 }}></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>AI 助手</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>OpenKnowledge · Claude · Codex · OpenCode</div>
          </div>
          <button
            className="lz-ok-close"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--accent-a10)'; (e.target as HTMLElement).style.color = 'var(--accent-primary)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'var(--bg-hover)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
          >
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        {/* Iframe */}
        <iframe
          src="https://openknowledge.ai"
          title="OpenKnowledge AI"
          style={{
            flex: 1,
            border: 'none',
            background: '#fff',
            minHeight: 0,
          }}
          allow="clipboard-read; clipboard-write; microphone"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  )
}
