declare module 'page-flip' {
  interface PageFlipSettings {
    width: number
    height: number
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startZIndex?: number
    autoSize?: boolean
    maxShadowOpacity?: number
    showCover?: boolean
    mobileScrollSupport?: boolean
    swipeDistance?: number
    clickEventForward?: boolean
    useMouseEvents?: boolean
    showPageCorners?: boolean
    disableFlipByClick?: boolean
  }
  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings)
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void
    loadFromImages(urls: string[]): void
    updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void
    updateFromImages(urls: string[]): void
    destroy(): void
    flipNext(corner?: 'top' | 'bottom'): void
    flipPrev(corner?: 'top' | 'bottom'): void
    flip(page: number, corner?: 'top' | 'bottom'): void
    turnToPage(page: number): void
    turnToNextPage(): void
    turnToPrevPage(): void
    getPageCount(): number
    getCurrentPageIndex(): number
    on(event: 'flip', cb: (e: { data: number }) => void): void
    on(event: 'changeOrientation', cb: (e: { data: 'portrait' | 'landscape' }) => void): void
    on(event: 'changeState', cb: (e: { data: string }) => void): void
    on(event: 'init', cb: (e: { data: { page: number; mode: 'portrait' | 'landscape' } }) => void): void
    getPageCollection(): any
    getRender(): any
    getFlipController(): any
    getUI(): any
    getState(): string
    getOrientation(): 'portrait' | 'landscape'
    getBoundsRect(): any
    getSettings(): PageFlipSettings
  }
}
