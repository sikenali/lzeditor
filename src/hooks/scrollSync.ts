/**
 * 编辑器和预览的双向滚动同步。
 *
 * 旧实现按「滚动了百分之多少」换算两边位置：编辑器两行对应预览两百像素，
 * 比例法一偏就是一整块。现在把源码行号和预览里的像素偏移建成一张映射表
 * （renderMarkdown 的 lines 选项给每个顶层块写 data-line），行号与像素一一对应。
 *
 * 成本约定：监听器一律 passive，只记账然后要一帧；一帧只做一次跟随。
 * 映射表按需建，只被会改预览布局的东西失效（重渲、容器尺寸变、图片加载），
 * 绝不被滚动失效。没有「每块每个滚动事件都量一次 DOM」的路径。
 */
import React from 'react'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { buildScrollMap, sourceLineOfClick, type ScrollMap } from '../utils/markdown/lines'

export type Side = 'editor' | 'preview'

/** 一个人真正在滚的那一侧，在最后一次滚动之后 FOLLOW_MS 内独占主导权 */
export const FOLLOW_MS = 100
/** 差不了这么多像素就不值得滚一次 */
const EPSILON_PX = 1
/** 差不了这么多行就不值得滚一次 */
const EPSILON_LINES = 0.02
/**
 * 跟随之后连续 VERIFY_STABLE 帧位置没漂才算稳；最多查 VERIFY_MAX_FRAMES 帧。
 * 预览渲染是懒的，视口外的块高度是估的，真画出来位置会变。
 */
const VERIFY_STABLE = 3
const VERIFY_MAX_FRAMES = 40

/**
 * 判定一次滚动事件要不要跟随。
 * 两个面板互相滚，程序滚一个面板也会触发和人手滚一模一样的事件，
 * 没有规则它们就会无限互相应答。真正在滚的那一侧主导，
 * 主导期间另一侧的事件都是回声，忽略；安静这么久之后另一侧就可以主导了。
 * 时钟传进来，函数保持纯。
 */
export class FollowGuard {
  private leader: Side | null = null
  private until = Number.NEGATIVE_INFINITY
  private mutedUntil = Number.NEGATIVE_INFINITY

  /** `now` 时刻收到 `side` 的滚动事件。true 表示这是一次真滚动，要跟随。 */
  shouldFollow(side: Side, now: number): boolean {
    if (now < this.mutedUntil) return false
    if (this.leader !== null && this.leader !== side && now < this.until) return false
    this.leader = side
    this.until = now + FOLLOW_MS
    return true
  }

  /** 程序即将替 `side` 去滚另一侧（或者它自己）：那个回声要忽略 */
  lead(side: Side, now: number): void {
    this.leader = side
    this.until = now + FOLLOW_MS
  }

  /** 一段时间内忽略所有滚动事件：跳到大标题会把两个面板一起滚 */
  mute(now: number, ms: number): void {
    this.mutedUntil = Math.max(this.mutedUntil, now + ms)
  }

  reset(): void {
    this.leader = null
    this.until = Number.NEGATIVE_INFINITY
    this.mutedUntil = Number.NEGATIVE_INFINITY
  }
}

/** 编辑器这一侧能提供给同步引擎的能力 */
export interface EditorLineBridge {
  /** 编辑器已经被换掉了（CM6 view 销毁过），缓存要失效 */
  readonly destroyed: boolean
  /** 编辑器真正的滚动容器 */
  readonly scroller: HTMLElement
  /** 可视区顶端的源码行号（1-based）。量不出返回 null */
  topVisibleLine(): number | null
  /** 把第 line 行（1-based）滚到可视区顶端 */
  scrollToLine(line: number): void
  /** 光标移到第 line 行（1-based）行首，滚动量取「刚好能看到」，不夺焦点 */
  goToLine(line: number): void
}

/**
 * 本编辑器把 .cm-editor / .cm-scroller 设成 height:auto + overflow:visible，
 * CM6 自己的 scrollDOM 滚不动，真正滚的是外层 .lz-editor-content。
 * 从 CM6 往上找第一个能滚的祖先。
 */
function scrollerAbove(view: EditorView): HTMLElement {
  let el = view.scrollDOM.parentElement
  while (el) {
    const style = getComputedStyle(el)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') return el
    el = el.parentElement
  }
  return view.scrollDOM
}

/** 从编辑器容器子树里找 CM6 view（挂在 .cm6-editor-container 的 _cm6View 上） */
function findEditorView(root: HTMLElement): EditorView | null {
  const stack: HTMLElement[] = [root]
  while (stack.length) {
    const el = stack.pop() as HTMLElement
    const view = (el as { _cm6View?: EditorView })._cm6View
    if (view) return view
    for (const child of Array.from(el.children)) stack.push(child as HTMLElement)
  }
  return null
}

const BRIDGES = new WeakMap<HTMLElement, EditorLineBridge>()

/** 取编辑器滚动容器对应的行桥，找不到就建一个并缓存；view 销毁后自动重建 */
export function lineBridgeOf(editorRoot: HTMLElement | null): EditorLineBridge | null {
  if (!editorRoot) return null
  const cached = BRIDGES.get(editorRoot)
  if (cached && !cached.destroyed) return cached

  const view = findEditorView(editorRoot)
  if (!view) return null
  const scroller = scrollerAbove(view)
  // doc.lines 在每次量位置前都读，编辑过程中行数会变
  const clampLine = (line: number): number =>
    Math.min(Math.max(1, Math.floor(line)), view.state.doc.lines)
  const bridge: EditorLineBridge = {
    // destroyed 是 EditorView 的私有字段，用 DOM 还挂不挂着当信号
    get destroyed() {
      return !view.contentDOM.isConnected
    },
    scroller,
    topVisibleLine() {
      if (!view.contentDOM.isConnected || !scroller.clientHeight) return null
      const rect = scroller.getBoundingClientRect()
      // precise: false → 位置不在已渲染的 DOM 里也给个估计值
      const pos = view.posAtCoords({ x: rect.left + 8, y: rect.top + 8 }, false)
      if (pos === null) return null
      return view.state.doc.lineAt(pos).number
    },
    scrollToLine(line) {
      if (!view.contentDOM.isConnected) return
      const coords = view.coordsAtPos(view.state.doc.line(clampLine(line)).from)
      if (!coords) return
      scroller.scrollTop = Math.max(0, coords.top - scroller.getBoundingClientRect().top)
    },
    goToLine(line) {
      if (!view.contentDOM.isConnected) return
      const from = view.state.doc.line(clampLine(line)).from
      // 只移光标不动焦点：预览里点一下是导航，不是抢编辑器
      view.dispatch({ selection: EditorSelection.cursor(from), userEvent: 'select' })
      const coords = view.coordsAtPos(from)
      if (!coords) return
      // nearest：出界多少滚多少，别把整块推到顶端
      const rect = scroller.getBoundingClientRect()
      if (coords.top < rect.top) scroller.scrollTop -= rect.top - coords.top
      else if (coords.bottom > rect.bottom) scroller.scrollTop += coords.bottom - rect.bottom
    },
  }
  BRIDGES.set(editorRoot, bridge)
  return bridge
}

export interface ScrollSyncOptions {
  /** 编辑器的滚动容器 */
  editor: HTMLElement
  /** 预览里滚动的容器 */
  scroller: HTMLElement
  /** 装渲染块的元素（data-line 在它身上） */
  article: HTMLElement
  /** 预览里点一下：跳到那一行源码。行号 1-based */
  onSourceLine?: (line: number) => void
}

export class ScrollSync {
  private readonly options: ScrollSyncOptions
  private readonly guard = new FollowGuard()
  private readonly now = (): number => performance.now()

  private map: ScrollMap | null = null
  /** 文章在滚动内容里的起点，用映射表量出来的 */
  private articleTop = 0
  private frame = 0
  private pending: Side | null = null
  private verifyFrame = 0
  private verifyFrames = 0
  private verifyStable = 0
  private verifySide: Side = 'editor'
  private readonly stopListeners: Array<() => void> = []
  private disposed = false

  constructor(options: ScrollSyncOptions) {
    this.options = options
    options.scroller.addEventListener('scroll', this.onPreviewScroll, { passive: true })
    options.editor.addEventListener('scroll', this.onEditorScroll, { passive: true })
    this.stopListeners.push(() => {
      options.scroller.removeEventListener('scroll', this.onPreviewScroll)
      options.editor.removeEventListener('scroll', this.onEditorScroll)
    })

    // 图片加载（或加载失败换成占位图）会改块的高度 → 映射表失效
    const onMedia = (): void => {
      this.map = null
    }
    options.article.addEventListener('load', onMedia, true)
    options.article.addEventListener('error', onMedia, true)
    this.stopListeners.push(() => {
      options.article.removeEventListener('load', onMedia, true)
      options.article.removeEventListener('error', onMedia, true)
    })

    // 预览重渲（innerHTML 整个换掉）也会改块的高度
    const observer = new MutationObserver(() => {
      this.map = null
    })
    observer.observe(options.article, { childList: true, subtree: true })
    this.stopListeners.push(() => observer.disconnect())

    // 容器尺寸一变，块的相对位置就变了
    const resize = new ResizeObserver(() => {
      this.map = null
    })
    resize.observe(options.scroller)
    this.stopListeners.push(() => resize.disconnect())

    if (options.onSourceLine) {
      const onClick = (e: MouseEvent): void => {
        const line = sourceLineOfClick(e, options.article)
        if (line === null) return
        // 这次跳转会把两个面板都滚，回声要压住
        this.guard.mute(this.now(), 400)
        options.onSourceLine?.(line + 1)
      }
      options.article.addEventListener('click', onClick)
      this.stopListeners.push(() => options.article.removeEventListener('click', onClick))
    }
  }

  /** 预览布局变了（重渲、改字号、容器尺寸变）：映射表要重建 */
  invalidate(): void {
    this.map = null
  }

  /** 静默一段时间：跳到大标题会自己把两个面板滚到位 */
  mute(ms: number): void {
    this.guard.mute(this.now(), ms)
  }

  /** 同步开关刚打开：把预览拉到编辑器现在的位置 */
  alignPreview(): void {
    this.schedule('editor')
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frame)
    cancelAnimationFrame(this.verifyFrame)
    for (const stop of this.stopListeners) stop()
    this.stopListeners.length = 0
    this.map = null
  }

  private onEditorScroll = (): void => {
    if (!this.guard.shouldFollow('editor', this.now())) return
    this.schedule('editor')
  }

  private onPreviewScroll = (): void => {
    if (!this.guard.shouldFollow('preview', this.now())) return
    this.schedule('preview')
  }

  private schedule(side: Side): void {
    this.pending = side
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      const leading = this.pending
      this.pending = null
      if (leading) this.run(leading)
    })
  }

  private run(side: Side): void {
    if (side === 'editor') this.followEditor()
    else this.followPreview()
    this.verifySoon(side)
  }

  /** 连续几帧复查跟随结果，落偏了就修正 */
  private verifySoon(side: Side): void {
    this.verifySide = side
    this.verifyFrames = 0
    this.verifyStable = 0
    if (this.verifyFrame) return
    const step = (): void => {
      this.verifyFrame = 0
      const onTarget =
        this.verifySide === 'editor' ? this.followEditor() : this.followPreview()
      this.verifyStable = onTarget ? this.verifyStable + 1 : 0
      if (this.verifyStable >= VERIFY_STABLE || ++this.verifyFrames >= VERIFY_MAX_FRAMES) return
      this.verifyFrame = requestAnimationFrame(step)
    }
    this.verifyFrame = requestAnimationFrame(step)
  }

  /** 预览滚到编辑器可视区顶端那一行。已经在了返回 true */
  private followEditor(): boolean {
    const bridge = lineBridgeOf(this.options.editor)
    if (!bridge) return true
    const { scroller } = this.options
    const maxPreview = scroller.scrollHeight - scroller.clientHeight
    if (maxPreview <= EPSILON_PX) return true
    const maxEditor = bridge.scroller.scrollHeight - bridge.scroller.clientHeight
    if (maxEditor <= EPSILON_PX) return true

    let target: number
    if (this.atBottom(bridge.scroller)) {
      // 贴底跟随：预览自己也不够长时贴它自己的底
      target = maxPreview
    } else {
      const map = this.ensureMap()
      const line = bridge.topVisibleLine()
      if (!map || map.blocks === 0 || line === null) return true
      // 映射表的行号是 0-based，编辑器的行号是 1-based
      const offset = map.offsetForLine(line - 1)
      target = offset < 0 ? 0 : this.articleTop + offset
    }
    target = Math.min(Math.max(0, target), maxPreview)
    if (Math.abs(scroller.scrollTop - target) < EPSILON_PX) return true
    this.guard.lead('editor', this.now())
    scroller.scrollTop = target
    return false
  }

  /** 编辑器滚到预览顶端那一行。已经在了返回 true */
  private followPreview(): boolean {
    const bridge = lineBridgeOf(this.options.editor)
    if (!bridge) return true
    const { scroller } = this.options
    const maxEditor = bridge.scroller.scrollHeight - bridge.scroller.clientHeight

    if (this.atBottom(scroller) && !this.atBottom(bridge.scroller)) {
      if (maxEditor > EPSILON_PX) {
        this.guard.lead('preview', this.now())
        bridge.scroller.scrollTop = maxEditor
        return false
      }
      return true
    }

    const map = this.ensureMap()
    if (!map || map.blocks === 0) return true
    const offset = Math.max(0, scroller.scrollTop - this.articleTop)
    const line = map.lineForOffset(offset)
    const editorLine = bridge.topVisibleLine()
    if (editorLine !== null && Math.abs(editorLine - 1 - line) < EPSILON_LINES) return true
    this.guard.lead('preview', this.now())
    bridge.scrollToLine(line + 1)
    return false
  }

  /** 映射表，缺了就建；预览还没布局好返回 null */
  private ensureMap(): ScrollMap | null {
    if (this.map) return this.map
    const { scroller, article } = this.options
    if (!scroller.clientHeight) return null
    this.map = buildScrollMap(article)
    this.articleTop =
      article.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop
    return this.map
  }

  private atBottom(element: HTMLElement): boolean {
    const max = element.scrollHeight - element.clientHeight
    return max > EPSILON_PX && element.scrollTop >= max - EPSILON_PX
  }
}

/** HTMLElement 或指向它的 ref，两种都接；没挂载返回 null */
function elementOf(v: HTMLElement | React.RefObject<HTMLElement | null> | null): HTMLElement | null {
  if (v === null) return null
  return (v as HTMLElement).nodeType === 1
    ? (v as HTMLElement)
    : (v as React.RefObject<HTMLElement | null>).current
}

export interface UseScrollSyncOptions {
  /** 编辑器的滚动容器（.lz-editor-content），编辑器没挂载时是 null */
  editorEl: HTMLElement | React.RefObject<HTMLElement | null> | null
  /** 预览里滚动的容器 */
  scroller: React.RefObject<HTMLElement | null>
  /** 装渲染块的元素 */
  article: React.RefObject<HTMLElement | null>
  enabled?: boolean
  /** 预览里点一下：跳到那一行源码。行号 1-based */
  onSourceLine?: (line: number) => void
}

/** 接上编辑器和预览的滚动同步，返回句柄可以手动静音/对齐 */
export function useScrollSync(
  options: UseScrollSyncOptions,
): React.MutableRefObject<ScrollSync | null> {
  const { editorEl, scroller, article, enabled = true } = options
  const syncRef = React.useRef<ScrollSync | null>(null)
  const onSourceLineRef = React.useRef(options.onSourceLine)
  onSourceLineRef.current = options.onSourceLine

  React.useEffect(() => {
    if (!enabled) {
      syncRef.current?.dispose()
      syncRef.current = null
      return
    }
    const editor = elementOf(editorEl)
    const scrollerEl = scroller.current
    const articleEl = article.current
    if (!editor || !scrollerEl || !articleEl) return

    syncRef.current?.dispose()
    syncRef.current = new ScrollSync({
      editor,
      scroller: scrollerEl,
      article: articleEl,
      onSourceLine: (line) => onSourceLineRef.current?.(line),
    })

    return () => {
      syncRef.current?.dispose()
      syncRef.current = null
    }
  }, [enabled, editorEl, scroller, article])

  return syncRef
}
