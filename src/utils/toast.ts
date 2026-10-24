/**
 * Toast notification system — conforms to DESIGN.md §9.
 *
 * - Position: top-center, 20px from top, translateX(-50%), z-index 10000
 * - Width: min(420px, 90vw), min 200px
 * - Padding: 12px 16px 12px 18px
 * - Radius: var(--radius-md) = 10px
 * - Border: 0.7px solid var(--color-border)
 * - Background: var(--color-bg-white)
 * - Left color bar 3×20px radius 2px (per type)
 * - Durations: success/error/warning 2.5s, info 2.0s
 * - Enter: translateY(-12px)→0 0.25s; Leave: opacity 1→0 + translateY(-8px) 0.25s
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  type?: ToastType
  duration?: number
}

let container: HTMLDivElement | null = null
let keyframesInjected = false

function getContainer(): HTMLDivElement {
  if (!container) {
    container = document.createElement('div')
    container.className = 'lz-toast-container'
    Object.assign(container.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '10000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      pointerEvents: 'none',
    })
    document.body.appendChild(container)
  }
  return container
}

function ensureKeyframes(): void {
  if (keyframesInjected) return
  keyframesInjected = true
  const style = document.createElement('style')
  style.id = 'lz-toast-keyframes'
  style.textContent = `
    @keyframes lzToastIn {
      from { opacity: 0; transform: translateY(-12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes lzToastOut {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-8px); }
    }
  `
  document.head.appendChild(style)
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 2500,
  error: 2500,
  warning: 2500,
  info: 2000,
}

const BAR_COLOR: Record<ToastType, string> = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
}

function injectBarColor(bar: HTMLDivElement, type: ToastType): void {
  bar.style.background = BAR_COLOR[type]
}

export function toast(message: string, options: ToastOptions | number = {}): void {
  ensureKeyframes()

  const normalized: ToastOptions = typeof options === 'number'
    ? { type: 'success', duration: options }
    : options
  const type: ToastType = normalized.type ?? 'success'
  const duration = normalized.duration ?? DEFAULT_DURATION[type]

  const el = document.createElement('div')
  el.className = 'lz-toast'
  el.setAttribute('role', 'status')
  el.style.position = 'relative'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.width = 'min(420px, 90vw)'
  el.style.minWidth = '200px'
  el.style.padding = '12px 16px 12px 18px'
  el.style.borderRadius = 'var(--radius-md)'
  el.style.border = '0.7px solid var(--color-border)'
  el.style.background = 'var(--color-bg-white)'
  el.style.color = 'var(--color-text-primary)'
  el.style.fontSize = '14px'
  el.style.fontWeight = '500'
  el.style.boxShadow = 'var(--shadow-md)'
  el.style.animation = 'lzToastIn 0.25s ease forwards'
  el.style.pointerEvents = 'auto'
  el.style.overflow = 'hidden'

  const bar = document.createElement('div')
  bar.style.position = 'absolute'
  bar.style.left = '0'
  bar.style.top = '50%'
  bar.style.transform = 'translateY(-50%)'
  bar.style.width = '3px'
  bar.style.height = '20px'
  bar.style.borderRadius = '2px'
  injectBarColor(bar, type)
  el.appendChild(bar)

  const text = document.createElement('span')
  text.textContent = message
  el.appendChild(text)

  getContainer().appendChild(el)

  window.setTimeout(() => {
    el.style.animation = 'lzToastOut 0.25s ease forwards'
    window.setTimeout(() => el.remove(), 250)
  }, duration)
}
