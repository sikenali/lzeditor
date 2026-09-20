/** Simple toast notification system — no external dependency. */

let container: HTMLDivElement | null = null
let id = 0

function getContainer(): HTMLDivElement {
  if (!container) {
    container = document.createElement('div')
    container.className = 'lz-toast-container'
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '64px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    })
    document.body.appendChild(container)
  }
  return container
}

export function toast(message: string, duration = 2500): void {
  const el = document.createElement('div')
  el.className = 'lz-toast'
  el.textContent = message
  Object.assign(el.style, {
    background: 'var(--accent-primary)',
    color: 'var(--accent-foreground, #fff)',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    animation: 'lzToastIn 0.2s cubic-bezier(0.32,0.72,0,1) forwards',
    pointerEvents: 'auto',
    whiteSpace: 'nowrap',
  })
  getContainer().appendChild(el)
  setTimeout(() => {
    el.style.animation = 'lzToastOut 0.2s ease forwards'
    setTimeout(() => el.remove(), 200)
  }, duration)
}

// Inject keyframes once
if (!document.getElementById('lz-toast-keyframes')) {
  const style = document.createElement('style')
  style.id = 'lz-toast-keyframes'
  style.textContent = `
    @keyframes lzToastIn {
      from { opacity: 0; transform: translateY(8px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes lzToastOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(4px) scale(0.96); }
    }
  `
  document.head.appendChild(style)
}
