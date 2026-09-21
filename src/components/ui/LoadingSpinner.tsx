import React from 'react'

export const LoadingSpinner: React.FC<{ size?: number; color?: string; fullScreen?: boolean }> = ({
  size = 24,
  color = 'var(--accent-primary)',
  fullScreen = false,
}) => (
  <div
    className={`loading-spinner${fullScreen ? ' loading-spinner--fullscreen' : ''}`}
    style={{ width: size, height: size, color }}
  >
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  </div>
)
