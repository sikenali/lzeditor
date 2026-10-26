import MarkdownIt from 'markdown-it'
import type { Env, MarkdownIt as MarkdownItType, StateBlock, StateInline, Token } from 'markdown-it'
import footnote from 'markdown-it-footnote'
import katex from 'katex'
import hljs from 'highlight.js'
import { sanitizeHtml } from '../sanitizeHtml'
import { escapeHtml, makeHeadingIdGen } from './id'
import { resolveFlavor, type FlavorId, type FlavorSetting } from './flavors'
import { registerBlockLinesRule } from './lines'

/**
 * 统一的 Markdown 渲染管线：markdown-it + 方言表 + KaTeX + highlight.js + DOMPurify。
 *
 * 方言差异全部走 markdown-it 的 rule / renderer 扩展，不再用字符串正则拼接——
 * 旧 mdToHtml.ts 的正则互踩（表格吃掉标题、加粗吃掉代码）就出在那套写法上。
 *
 * 数学公式走 slot 占位符：KaTeX 的 HTML 带大量行内 style，DOMPurify 会剥掉，
 * 所以先消毒、再回填公式，和旧 mdWithMath 是同一套思路。
 */
export interface RenderOptions {
  /** 方言。`auto` 或缺省时按文档特征推断 */
  flavor?: FlavorSetting
  /** 给每个顶层块写 data-line / data-end-line 行号，滚动同步用。导出、剪贴板一律不要开 */
  lines?: boolean
  /** 渲染完成后回调，拿到最终方言（`auto` 时的实际结果） */
  onFlavor?: (flavor: FlavorId) => void
}

export interface RenderResult {
  html: string
  flavor: FlavorId
}

const MATH_SLOT_OPEN = '\uE000'
const MATH_SLOT_CLOSE = '\uE001'

type MathList = Array<{ body: string; display: boolean }>

interface MathToken extends Token {
  meta: { display: boolean }
}

/** markdown-it 块规则的实际签名：正常模式返回新行号，静默模式返回 true。
 * 官方类型只声明了 boolean，这里对齐运行时行为。 */
type BlockRule = (state: StateBlock, startLine: number, endLine: number, silent: boolean) => number | boolean

type MdBlockRule = (...args: [StateBlock, number, number, boolean]) => boolean

function addBlockRule(md: MarkdownItType, anchor: string, name: string, rule: BlockRule): void {
  md.block.ruler.before(anchor, name, rule as unknown as MdBlockRule)
}

/** 取某一行去掉前导空白后的内容。 */
function lineText(state: StateBlock, line: number): string {
  return state.src.slice(state.bMarks[line], state.eMarks[line]).trimStart()
}

const HLJS_ALIAS: Record<string, string> = {
  python3: 'python',
  py3: 'python',
  yml: 'yaml',
  rb: 'ruby',
  golang: 'go',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  cmd: 'bash',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'javascript',
}

const HLJS_PLAIN = new Set(['', 'text', 'txt', 'md', 'markdown', 'none'])

function normalizeLang(lang: string): string {
  return HLJS_ALIAS[lang.toLowerCase()] || lang.toLowerCase()
}

// ── 数学公式 ──────────────────────────────────────────────────────────────

function sanitizeFormula(formula: string): string {
  return formula.replace(/\\newline/g, '\\\\').replace(/\\\\$/gm, '').replace(/\n/g, '\\\\')
}

function renderMath(body: string, display: boolean): string {
  try {
    return katex.renderToString(sanitizeFormula(body), { throwOnError: false, displayMode: display })
  } catch {
    const tag = display ? 'pre' : 'code'
    return `<${tag}>${escapeHtml(body)}</${tag}>`
  }
}

/** 块级 $$...$$：支持同行与多行。行内 $...$ 由 mathInline 处理。 */
function mathDisplay(state: StateBlock, startLine: number, _endLine: number, silent: boolean): number | boolean {
  const line = lineText(state, startLine)

  const single = /^\s*\$\$([^$\n]+?)\$\$\s*$/.exec(line)
  if (single) {
    state.line = startLine + 1
    if (silent) return true
    const tok = state.push('math', '', 0) as MathToken
    tok.content = single[1].trim()
    tok.meta = { display: true }
    return state.line
  }
  if (!/^\s*\$\$/.test(line)) return 0

  state.line++
  if (silent) return true

  let end = -1
  for (let i = state.line; i < state.lineMax; i++) {
    if (/\$\$/.test(state.src.slice(state.bMarks[i], state.eMarks[i]))) { end = i; break }
  }
  if (end < 0) return 0

  const body: string[] = [line.replace(/^\s*\$\$/, '').trim()]
  for (let i = startLine + 1; i < end; i++) {
    body.push(state.src.slice(state.bMarks[i], state.eMarks[i]))
  }
  body.push(state.src.slice(state.bMarks[end], state.eMarks[end]).replace(/\$\$\s*$/, '').trim())

  const tok = state.push('math', '', 0) as MathToken
  tok.content = body.filter(l => l.length > 0).join('\n').trim()
  tok.meta = { display: true }
  state.line = end + 1
  return state.line
}

/** 行内 $...$。code span 与围栏块由 markdown-it 自己隔离，这里碰不到它们。 */
function mathInline(state: StateInline, silent: boolean): boolean {
  const src = state.src
  const start = state.pos
  if (src.charCodeAt(start) !== 0x24) return false          // '$'
  if (start > 0 && src.charCodeAt(start - 1) === 0x5c) return false   // 跳过 \$
  if (src.charCodeAt(start + 1) === 0x24) {
    // 行中的 $$...$$：块级规则只吃独占一行的，行内的在这里兜住
    const end = src.indexOf('$$', start + 2)
    if (end < 0 || end > state.posMax) return false
    const body = src.slice(start + 2, end)
    if (!body || /^\s/.test(body) || /\s$/.test(body)) return false
    if (!silent) {
      const tok = state.push('math', '', 0) as MathToken
      tok.content = body
      tok.meta = { display: true }
    }
    state.pos = end + 2
    return true
  }

  const end = src.indexOf('$', start + 1)
  if (end < 0 || end > state.posMax) return false
  const body = src.slice(start + 1, end)
  if (!body || /^\s/.test(body) || /\s$/.test(body)) return false
  if (src.charCodeAt(end + 1) === 0x24) return false         // $$ 已在上面处理

  if (!silent) {
    const tok = state.push('math', '', 0) as MathToken
    tok.content = body
    tok.meta = { display: false }
  }
  state.pos = end + 1
  return true
}

/** `@cite{key}` / `@citeauthor{key}` → 上标引用（不接参考文献表，只保留 key） */
function pandocCite(state: StateInline, silent: boolean): boolean {
  const m = /^@cite\w*\{([^}\n]+)\}/.exec(state.src.slice(state.pos))
  if (!m) return false
  if (!silent) {
    const tok = state.push('cite', 'sup', 0)
    tok.content = m[1]
  }
  state.pos += m[0].length
  return true
}

// ── Obsidian / Pandoc / Quarto / MDX 扩展 ─────────────────────────────────

function stripObsidianComments(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inFence = false
  let fenceChar = ''
  let inComment = false

  const isFence = (line: string): boolean => {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (!m) return false
    const ch = m[1][0]
    if (!inFence) { inFence = true; fenceChar = ch }
    else if (ch === fenceChar) { inFence = false; fenceChar = '' }
    return true
  }

  for (const line of lines) {
    if (!inComment && isFence(line)) { out.push(line); continue }
    if (inFence) { out.push(line); continue }

    if (inComment) {
      const close = line.indexOf('%%')
      if (close >= 0) { inComment = false; out.push(line.slice(close + 2)) }
      continue
    }
    const open = line.indexOf('%%')
    if (open < 0) { out.push(line); continue }
    const close = line.indexOf('%%', open + 2)
    if (close >= 0) {
      out.push(line.slice(0, open) + line.slice(close + 2))
    } else {
      out.push(line.slice(0, open))
      inComment = true
    }
  }
  return out.join('\n')
}

function stripMdxStatements(md: string): string {
  return md.replace(/^ {0,3}(?:import|export)\s+[^\n]*;\s*$/gm, '')
}

/** `[[Target]]` / `[[Target|alias]]`，目标当作页内锚点处理。 */
function wikiLink(state: StateInline, silent: boolean): boolean {
  const src = state.src
  const start = state.pos
  if (src.charCodeAt(start) !== 0x5b) return false           // '['
  const end = src.indexOf(']]', start + 2)
  if (end < 0 || end > state.posMax) return false

  const raw = src.slice(start + 2, end)
  if (!raw || /\n/.test(raw) || raw.includes('[[') || raw.includes(']]')) return false
  let depth = 0
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '[') depth++
    else if (raw[i] === ']') {
      depth--
      if (depth < 0) return false
    }
  }
  if (depth !== 0) return false

  const sep = raw.indexOf('|')
  const target = (sep >= 0 ? raw.slice(0, sep) : raw).trim()
  const alias = (sep >= 0 ? raw.slice(sep + 1) : target).trim() || target
  if (!target) return false

  if (!silent) {
    const link = state.push('link_open', 'a', 1)
    link.attrSet('href', `#${target.toLowerCase().replace(/\s+/g, '-')}`)
    link.attrSet('class', 'wiki-link')
    state.push('text', '', 0).content = alias
    state.push('link_close', 'a', -1)
  }
  state.pos = end + 2
  return true
}

/** `![[file.png]]` / `![[file|alt]]` → `<img>` */
function embed(state: StateInline, silent: boolean): boolean {
  const src = state.src
  const start = state.pos
  if (src.charCodeAt(start) !== 0x21) return false          // '!'
  if (src.charCodeAt(start + 1) !== 0x5b) return false      // '['
  if (src.charCodeAt(start + 2) !== 0x5b) return false      // '['
  const end = src.indexOf(']]', start + 3)
  if (end < 0 || end > state.posMax) return false
  const raw = src.slice(start + 3, end)
  if (!raw || raw.includes('[[') || raw.includes(']]')) return false
  const sep = raw.indexOf('|')
  const src0 = (sep >= 0 ? raw.slice(0, sep) : raw).trim()
  const alt = (sep >= 0 ? raw.slice(sep + 1) : '').trim() || src0.replace(/\.[a-z0-9]+$/i, '')
  if (!src0) return false

  if (!silent) {
    // 用 html_inline 而不是 image token：image 渲染器会拿 token.children 重算 alt，
    // 手动 push 的 image 没有 children，会在 renderInlineAsText 里抛空指针。
    const tok = state.push('html_inline', '', 0)
    tok.content = `<img src="${escapeHtml(src0)}" alt="${escapeHtml(alt)}">`
  }
  state.pos = end + 2
  return true
}

function applyDivAttrs(tok: Token, attrs: string): void {
  const s = attrs.trim()
  if (s.startsWith('{')) {
    const inner = s.slice(1, s.endsWith('}') ? s.length - 1 : s.length)
    const classes: string[] = []
    for (const part of inner.split(/\s+/)) {
      if (part.startsWith('#')) tok.attrSet('id', part.slice(1))
      else if (part.startsWith('.')) classes.push(part.slice(1))
    }
    if (classes.length) tok.attrSet('class', classes.join(' '))
    return
  }
  const name = s.replace(/[^\w-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'note'
  tok.attrSet('class', `callout callout-${name}`)
}

/** `::: {.callout-note #id}` / `::: note`，Pandoc 围栏 div 与 Quarto 提示框共用。 */
function fencedDiv(state: StateBlock, startLine: number, endLine: number, silent: boolean): number | boolean {
  const line = lineText(state, startLine)
  if (!/^:::/.test(line) || line === ':::') return 0
  const attrs = line.replace(/^:::\s*/, '')

  let close = -1
  for (let i = startLine + 1; i < endLine; i++) {
    if (/^:::/.test(lineText(state, i))) { close = i; break }
  }
  if (close < 0) return 0 // 没有闭合的 ::: 就当普通段落，别把后面整段文档吃进 div
  if (silent) return true

  const open = state.push('div_open', 'div', 1)
  applyDivAttrs(open, attrs)

  const sub = new state.md.block.State(state.src, state.md, state.env, [])
  sub.lineMax = close
  state.md.block.tokenize(sub, startLine + 1, close)
  state.tokens.push(...sub.tokens)
  // close token 不带 attrs：markdown-it 的 renderToken 会把属性吐到 </div> 上
  state.push('div_close', 'div', -1)

  state.line = close + 1 // markdown-it 15 靠 state.line 推进，返回值只是命中标志
  return state.line
}

/** Pandoc ATeX 标题：`= 标题` / `== 标题` / `=== 标题` */
function atexHeading(state: StateBlock, startLine: number, _endLine: number, silent: boolean): number | boolean {
  const m = /^(=+)(\s+)(.+)$/.exec(lineText(state, startLine))
  if (!m) return 0
  state.line = startLine + 1
  if (silent) return true

  const tag = `h${Math.min(3, m[1].length)}`
  state.push('heading_open', tag, 1)
  const inline = state.push('inline', '', 0)
  inline.content = m[3]
  // markdown-it 15 的 core inline 规则直接拿 token.children 当输出数组，留 null 会在 StateInline 里抛错
  inline.children = []
  state.push('heading_close', tag, -1)
  return state.line
}

// ── 任务列表 ──────────────────────────────────────────────────────────────

type CoreState = { tokens: Token[] }

const BOX_RE = /^\[([ xX])\]\s+/

/** 复用一个已有 token 当 html_inline：html_inline 的渲染器只读 type/content。 */
function toHtmlInline(from: Token, html: string): Token {
  const tok = Object.assign({}, from)
  tok.type = 'html_inline'
  tok.content = html
  return tok
}

/** 向上找包裹段落的 list_item_open，给整条 li 打上 task-list-item。 */
function findItemOpen(tokens: Token[], from: number): Token | undefined {
  for (let j = from - 1; j >= 0; j--) {
    if (tokens[j].type === 'list_item_open') return tokens[j]
    if (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open') return undefined
  }
  return undefined
}

function checkbox(m: RegExpExecArray): string {
  return `<input type="checkbox" ${m[1].trim() === 'x' ? 'checked="" ' : ''}disabled="">`
}

/** `- [x] 待办` → `<input type="checkbox" checked disabled>`。
 * markdown-it 本体没有任务列表，列表项正文还是 `[x] 待办` 原文，
 * 所以在 inline 规则跑完后再补 checkbox 节点。 */
function taskLists(state: CoreState): void {
  const tokens = state.tokens
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'paragraph_open') {
      const inline = tokens[i + 1]
      const children = inline && inline.children
      const first = children && children[0]
      if (!first || first.type !== 'text') continue
      const m = BOX_RE.exec(first.content)
      if (!m) continue
      children.unshift(toHtmlInline(first, checkbox(m)))
      first.content = first.content.slice(m[0].length)
      const item = findItemOpen(tokens, i)
      if (item) item.attrJoin('class', 'task-list-item')
    } else {
      // `- [x] a` 整行是 leaf list_item（level 1、正文直接挂在 content 上），没有 paragraph 包裹
      const tok = tokens[i]
      if (tok.level !== 1 || tokens[i - 1]?.type !== 'list_item_open') continue
      const children = tok.children
      if (!children) continue
      const m = BOX_RE.exec(tok.content)
      if (!m) continue
      tok.content = tok.content.slice(m[0].length)
      tok.children = [toHtmlInline(children[0], checkbox(m)), ...children]
      tokens[i - 1].attrJoin('class', 'task-list-item')
    }
  }
}

// ── 渲染器实例缓存 ─────────────────────────────────────────────────────────

const instances = new Map<FlavorId, MarkdownItType>()

export function createMarkdownIt(flavor: FlavorId): MarkdownItType {
  const cached = instances.get(flavor)
  if (cached) return cached

  const gfmLike = flavor !== 'commonmark'
  // 从 commonmark 起底再按需开规则；linkify 只走构造函数，改实例属性会被类型拦
  const md = new MarkdownIt('commonmark', { html: true, linkify: gfmLike })
  // markdown-it 15 本体不认任务列表，各方言都只会把 `[x]` 当普通文字，需要自定义 core 规则补
  md.disable('table').disable('strikethrough').disable('autolink')
  if (gfmLike) {
    md.enable('table').enable('strikethrough').enable('autolink')
    md.use(footnote)
    // 列表项正文还是 `[x]` 原文，等 inline 解析完再补 checkbox 节点
    md.core.ruler.after('inline', 'taskLists', taskLists)
  }

  if (flavor === 'obsidian') {
    md.inline.ruler.before('image', 'embed', embed)
    md.inline.ruler.before('link', 'wikiLink', wikiLink)
  }
  if (flavor === 'pandoc' || flavor === 'quarto') {
    addBlockRule(md, 'paragraph', 'fencedDiv', fencedDiv)
  }
  if (flavor === 'pandoc') {
    addBlockRule(md, 'paragraph', 'atexHeading', atexHeading)
    md.inline.ruler.before('escape', 'pandocCite', pandocCite)
  }

  addBlockRule(md, 'paragraph', 'mathDisplay', mathDisplay)
  md.inline.ruler.before('escape', 'mathInline', mathInline)

  // 代码高亮：沿用现有 highlight.js 资产，样式由 useTheme 注入的主题统一控制
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    const rawLang = token.info.trim().split(/\s+/)[0] || ''
    const lang = normalizeLang(rawLang)
    const code = token.content.replace(/\n$/, '')
    let inner: string
    if (code && !HLJS_PLAIN.has(lang) && hljs.getLanguage(lang)) {
      try {
        inner = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      } catch {
        inner = escapeHtml(code)
      }
    } else {
      inner = escapeHtml(code)
    }
    return `<pre><code class="hljs${rawLang ? ` language-${rawLang}` : ''}">${inner}</code></pre>\n`
  }

  // 标题锚点：LinkDialog 与预览内的 # 链接靠 id 跳转，格式沿用 headingId
  const headingIdGen = makeHeadingIdGen()
  md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]
    const inline = tokens[idx + 1]
    let text = inline ? inline.content : ''
    let explicit = ''
    const m = /\{#([\w-]+)\}\s*$/.exec(text)
    if (m) {
      explicit = m[1]
      text = text.slice(0, m.index).trim()
    }
    token.attrSet('id', explicit || headingIdGen(text))
    if (explicit && inline) {
      // inline 渲染走 children，光改 content 不生效，末尾的 ` {#id}` 也要从 text 节点删掉
      inline.content = text
      const last = inline.children && inline.children[inline.children.length - 1]
      if (last && last.type === 'text') {
        const lm = /\{#[\w-]+\}\s*$/.exec(last.content)
        if (lm) last.content = last.content.slice(0, lm.index).replace(/\s+$/, '')
      }
    }
    return self.renderToken(tokens, idx, options)
  }

  md.renderer.rules.cite = (tokens, idx) => {
    const key = escapeHtml(tokens[idx].content)
    return `<sup class="citation">[${key}]</sup>`
  }

  // 数学公式先出 slot，消毒之后再回填 KaTeX
  md.renderer.rules.math = (_tokens, idx, _options, env) => {
    const token = _tokens[idx] as MathToken
    const list = (env?.maths as MathList | undefined) ?? []
    env!.maths = list
    list.push({ body: token.content, display: !!token.meta.display })
    return `${MATH_SLOT_OPEN}${list.length - 1}${MATH_SLOT_CLOSE}`
  }

  registerBlockLinesRule(md)
  instances.set(flavor, md)
  return md
}

export function renderMarkdownRaw(md: string, options: RenderOptions = {}): RenderResult {
  const flavor = resolveFlavor(options.flavor ?? 'auto', md)
  let src = md
  if (flavor === 'obsidian') src = stripObsidianComments(src)
  if (flavor === 'mdx') src = stripMdxStatements(src)

  const env: Env = { maths: [] }
  if (options.lines) env.blockLines = true
  let html: string
  try {
    html = createMarkdownIt(flavor).render(src, env)
  } catch {
    html = `<p>${escapeHtml(md)}</p>`
  }

  const maths = env.maths as MathList | undefined
  if (maths) {
    for (let i = 0; i < maths.length; i++) {
      const slot = `${MATH_SLOT_OPEN}${i}${MATH_SLOT_CLOSE}`
      html = html.split(slot).join(renderMath(maths[i].body, maths[i].display))
    }
  }
  if (/\uE000/.test(html)) html = html.replace(/\uE000\d+\uE001/g, '')

  options.onFlavor?.(flavor)
  return { html, flavor }
}

/** 生产唯一入口：markdown-it + KaTeX 之后再过一遍 DOMPurify。 */
export function renderMarkdown(md: string, options: RenderOptions = {}): RenderResult {
  const result = renderMarkdownRaw(md, options)
  return { ...result, html: sanitizeHtml(result.html) }
}
