import React from 'react'

export interface PanelContainerProps {
  onClose: () => void
  icon?: string
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const PanelContainer: React.FC<PanelContainerProps> = ({
  onClose, icon, title, subtitle, children, footer, size = 'lg', className = ''
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const previousFocus = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    previousFocus.current = document.activeElement as HTMLElement

    // ESC 关闭
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
      if (previousFocus.current) previousFocus.current.focus()
    }
  }, [onClose])

  return (
    <div className="panel-backdrop" onClick={(e) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose()
    }}>
      <div ref={containerRef} className={`panel-container${className ? ' ' + className : ''}`}>
        <div className="panel-header">
          {icon && <span className={`remix panel-icon ${icon}`}></span>}
          <div className="panel-title-group">
            <div className="panel-title">{title}</div>
            {subtitle && <div className="panel-subtitle">{subtitle}</div>}
          </div>
          <button className="panel-close" onClick={onClose} title="关闭">
            <span className="remix ri-close-line"></span>
          </button>
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="panel-footer">{footer}</div>}
      </div>
    </div>
  )
}
