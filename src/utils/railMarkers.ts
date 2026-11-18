/**
 * 文档导航条（右侧悬浮滚动条 / minimap）的数据来源。
 *
 * 参考 WeDraft 的实现：不在原生滚动条上做文章，而是在滚动容器边缘浮一条
 * 独立的窄轨，按源码块的位置画出彩色标记，点击标记直接跳到对应段落。
 * 这里只负责「算出每个标记在内容里的像素位置」，不碰 DOM 滚动。
 *
 * 编辑器侧按源码行号比例定位（图片等可变高度块无法精确测量，和 WeDraft
 * 一样用行号比例近似）；预览侧直接量渲染出来的顶层块，位置是精确的。
 */

export type RailMarkerKind =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'quote'
  | 'image'
  | 'table'
  | 'code'
  | 'list'
  | 'rule'
  | 'paragraph'

export interface RailMarkerSpec {
  /** 标记在滚动内容中的像素位置（从内容顶边起算） */
  top: number
  /** 标记代表块的像素高度，仅用于视觉粗细 */
  height: number
  kind: RailMarkerKind
  label: string
}

/** 标记总数上限：极长文档也不至于把轨道塞满、拖慢渲染 */
const MAX_MARKERS = 600

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function labelOf(text: string, fallback: string): string {
  const clean = text
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s*/, '')
    .replace(/^!\[([^\]]*)\].*/, '$1')
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '')
    .replace(/[*_`~]/g, '')
    .trim()
  return (clean || fallback).slice(0, 28)
}

/**
 * 从 markdown 源码提取块标记。
 * `contentHeight` 是滚动容器的内容总高度（scrollHeight），用来把行号比例
 * 换算成像素位置——调用方在布局变化后重新传值即可。
 */
export function markersFromMarkdown(md: string, contentHeight: number): RailMarkerSpec[] {
  if (!md) return []
  const lines = md.split('\n')
  const total = Math.max(1, lines.length)
  const content = Math.max(1, contentHeight)
  const specs: RailMarkerSpec[] = []
  let inFence = false
  let fenceStart = 0
  let fenceLang = ''
  let prevKind: RailMarkerKind | null = null

  const push = (line: number, kind: RailMarkerKind, label: string, height = 2): void => {
    if (specs.length >= MAX_MARKERS) return
    const top = clamp(((line - 1) / total) * content, 0, content)
    specs.push({ top, height, kind, label })
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()

    if (inFence) {
      if (/^(```|~~~)/.test(line)) {
        push(fenceStart + 1, 'code', fenceLang ? `代码 ${fenceLang}` : '代码块', 6)
        inFence = false
      }
      prevKind = null
      continue
    }

    if (/^(```|~~~)/.test(line)) {
      inFence = true
      fenceStart = i
      fenceLang = line.replace(/^(```|~~~)/, '').trim()
      prevKind = null
      continue
    }

    if (!line) {
      prevKind = null
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const kind: RailMarkerKind = level === 1 ? 'title' : level === 2 ? 'heading' : 'subheading'
      push(i + 1, kind, labelOf(heading[2], '标题'), level <= 2 ? 4 : 3)
      prevKind = kind
      continue
    }

    if (/^\|/.test(line)) {
      if (prevKind !== 'table') push(i + 1, 'table', '表格', 4)
      prevKind = 'table'
      continue
    }

    if (/^>/.test(line)) {
      if (prevKind !== 'quote') push(i + 1, 'quote', labelOf(line, '引用'), 3)
      prevKind = 'quote'
      continue
    }

    const image = line.match(/^!\[([^\]]*)\]\(/)
    if (image) {
      push(i + 1, 'image', labelOf(image[1] || '', '图片'), 5)
      prevKind = 'image'
      continue
    }

    if (/^\s*([-*_])\s*(?:\1\s*){2,}$/.test(line)) {
      push(i + 1, 'rule', '分隔线', 2)
      prevKind = 'rule'
      continue
    }

    const list = line.match(/^(?:[-+*]|\d+[.)])\s+(.*)$/)
    if (list) {
      if (prevKind !== 'list') push(i + 1, 'list', labelOf(list[1] || '', '列表'), 2)
      prevKind = 'list'
      continue
    }

    if (prevKind !== 'paragraph') {
      push(i + 1, 'paragraph', labelOf(line, '段落'), 2)
    }
    prevKind = 'paragraph'
  }

  // 没闭合的围栏也要有一个标记，否则整段代码在轨道上凭空消失
  if (inFence) push(fenceStart + 1, 'code', fenceLang ? `代码 ${fenceLang}` : '代码块', 6)

  specs.sort((a, b) => a.top - b.top)
  return specs
}

/** 预览顶层块 → 标记。量渲染出来的每个顶层块；有 data-line 的块优先按源码行定位。 */
export function markersFromPreviewDom(
  content: HTMLElement | null,
  scroller: HTMLElement | null,
): RailMarkerSpec[] {
  if (!content || !scroller) return []
  const contentHeight = Math.max(1, scroller.scrollHeight)
  const origin = scroller.getBoundingClientRect().top - scroller.scrollTop
  const specs: RailMarkerSpec[] = []

  const kindOf = (el: Element): RailMarkerKind => {
    const tag = el.tagName.toLowerCase()
    const cls = el.classList
    if (cls.contains('code-block-wrapper') || cls.contains('md-fences')) return 'code'
    if (cls.contains('table-wrapper')) return 'table'
    if (tag === 'h1') return 'title'
    if (tag === 'h2') return 'heading'
    if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'subheading'
    if (tag === 'blockquote') return 'quote'
    if (tag === 'table') return 'table'
    if (tag === 'pre') return 'code'
    if (tag === 'ul' || tag === 'ol') return 'list'
    if (tag === 'hr') return 'rule'
    if (el.querySelector('img')) return 'image'
    return 'paragraph'
  }

  for (const el of Array.from(content.children)) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style' || tag === 'link') continue
    if (specs.length >= MAX_MARKERS) break
    const rect = el.getBoundingClientRect()
    if (!Number.isFinite(rect.top) || rect.height <= 0) continue
    const top = clamp(rect.top - origin, 0, contentHeight)
    specs.push({
      top,
      height: rect.height,
      kind: kindOf(el),
      label: labelOf(el.textContent || '', '段落'),
    })
  }

  specs.sort((a, b) => a.top - b.top)
  return specs
}
