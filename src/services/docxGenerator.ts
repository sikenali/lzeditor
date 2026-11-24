import JSZip from 'jszip'

/**
 * 真正的 OOXML .docx 生成器。
 *
 * 之前的实现是把 HTML 塞进 Blob 再谎报 docx 的 MIME —— Word 打开要靠启发式猜测，
 * 严格一点的查看器直接判为损坏。这里按 [Office Open XML] 规范生成最小可用包：
 *   [Content_Types].xml / _rels/.rels / word/document.xml / word/_rels/document.xml.rels
 *
 * 覆盖常见块级结构：标题、段落（含加粗/斜体/删除线/下划线/行内代码/上下标/链接）、
 * 有序与无序列表、引用、代码块、水平线、表格、图片（data: 或可 fetch 的 URL）。
 */

const XML_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types'

// Word 用半点（half-point）表示字号：14pt -> 28
const pt = (v: number) => Math.round(v * 2)

const escXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&apos;')

const HEADING_SIZE: Record<string, number> = { h1: 22, h2: 17, h3: 15, h4: 14, h5: 13, h6: 12 }
const BODY_PT = 12

/** 当前导出使用的排版参数（generateDOCX 开始时设置，供各 XML 生成器读取）。 */
const docxStyle = {
  bodyPt: BODY_PT,
  font: 'Calibri',
  eastAsia: 'SimSun',
  line: 360,
  indent: false,
  justify: false,
}

interface RunSpec {
  text?: string
  bold?: boolean
  italic?: boolean
  strike?: boolean
  underline?: boolean
  mono?: boolean
  sup?: boolean
  sub?: boolean
  color?: string
  size?: number
  href?: string
}

/** hex(#rgb / #rrggbb) 转 Word 的 RRGGBB 大写形式；非 hex 一律忽略。 */
function toAARRGGBB(color: string | null | undefined): string | null {
  if (!color) return null
  const c = color.trim()
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    const [, r, g, b] = c.slice(1)
    return `${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.slice(1).toUpperCase()
  return null
}

function runXml(spec: RunSpec, baseSize = docxStyle.bodyPt): string {
  if (!spec.text) return ''
  const rPr: string[] = []
  if (spec.bold) rPr.push('<w:b/>', '<w:bCs/>')
  if (spec.italic) rPr.push('<w:i/>', '<w:iCs/>')
  if (spec.strike) rPr.push('<w:strike/>')
  if (spec.underline) rPr.push('<w:u w:val="single"/>')
  if (spec.mono) rPr.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>')
  if (spec.sup) rPr.push('<w:vertAlign w:val="superscript"/>')
  if (spec.sub) rPr.push('<w:vertAlign w:val="subscript"/>')
  const color = toAARRGGBB(spec.color)
  if (color) rPr.push(`<w:color w:val="${color}"/>`)
  const sz = spec.size ?? baseSize
  rPr.push(`<w:sz w:val="${pt(sz)}"/>`, `<w:szCs w:val="${pt(sz)}"/>`)

  const rPrXml = rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : ''
  // Word 不支持 w:t 里的换行符，必须转成 <w:br/>
  const parts = spec.text.split('\n')
  const body = parts.map((line, i) => {
    const br = i > 0 ? '<w:br/>' : ''
    const t = line === '' ? '' : `<w:t xml:space="preserve">${escXml(line)}</w:t>`
    return br + t
  }).join('')

  let run = `<w:r>${rPrXml}${body}</w:r>`

  if (spec.href) {
    const rel = `rid-link-${encodeURIComponent(spec.href)}`
    run = `<w:hyperlink r:id="${rel}">${run}</w:hyperlink>`
  }
  return run
}

function paragraphXml(runs: RunSpec[], opts: { heading?: number; indent?: number; style?: 'quote' | 'code'; spaceBefore?: number; spaceAfter?: number } = {}): string {
  const pPr: string[] = []
  if (opts.heading) {
    pPr.push(`<w:pStyle w:val="Heading${opts.heading}"/>`)
    pPr.push('<w:keepNext/>')
  }
  if (opts.style === 'quote') {
    pPr.push('<w:ind w:left="720" w:start="720"/>')
  } else if (opts.style === 'code') {
    pPr.push('<w:ind w:left="425" w:start="425"/>')
    pPr.push('<w:shd w:val="clear" w:color="auto" w:fill="F5F5F5"/>')
  } else if (opts.indent) {
    pPr.push(`<w:ind w:left="${opts.indent}" w:start="${opts.indent}"/>`)
  }
  if (opts.style !== 'quote' && opts.style !== 'code' && docxStyle.indent) {
    pPr.push('<w:ind w:firstLine="480" w:firstLineChars="200"/>')
  }
  if (docxStyle.justify) pPr.push('<w:jc w:val="both"/>')
  const spacing: string[] = []
  if (opts.spaceBefore != null) spacing.push(`w:before="${opts.spaceBefore}"`)
  if (opts.spaceAfter != null) spacing.push(`w:after="${opts.spaceAfter}"`)
  if (docxStyle.line !== 360) spacing.push(`w:line="${docxStyle.line}" w:lineRule="auto"`)
  if (spacing.length) pPr.push(`<w:spacing ${spacing.join(' ')}/>`)

  return `<w:p>${pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''}${runs.map(r => runXml(r)).join('')}</w:p>`
}

function bulletRun(mark: string, size = docxStyle.bodyPt): RunSpec {
  return { text: mark, size }
}

/**
 * 递归把 inline DOM 节点转成 run 列表。
 * 标记（加粗/斜体/链接等）沿节点树继承：进入元素时把状态压栈，
 * 产出的每个文本 run 都带上从栈顶到栈底的并集。
 */
function collectRuns(node: Node, out: RunSpec[], rels: Set<string>, baseSize: number, ctx: RunSpec = {}): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent || ''
    if (t) out.push({ ...ctx, text: t, size: ctx.size ?? baseSize })
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()

  if (tag === 'br') {
    out.push({ ...ctx, text: '\n', size: ctx.size ?? baseSize })
    return
  }
  if (tag === 'hr') return

  const child: RunSpec = { ...ctx }
  switch (tag) {
    case 'b': case 'strong': child.bold = true; break
    case 'i': case 'em': child.italic = true; break
    case 's': case 'strike': case 'del': child.strike = true; break
    case 'u': child.underline = true; break
    case 'code': child.mono = true; child.size = (child.size ?? baseSize) - 1; break
    case 'sup': child.sup = true; break
    case 'sub': child.sub = true; break
    case 'a': {
      const href = el.getAttribute('href') || ''
      if (href) rels.add(href)
      child.href = href
      child.underline = true
      break
    }
    case 'span': {
      const color = toAARRGGBB(el.style.color)
      if (color) child.color = color
      break
    }
    default: break
  }

  el.childNodes.forEach(c => collectRuns(c, out, rels, baseSize, child))
}

function isBlock(tag: string): boolean {
  return /^(p|h1|h2|h3|h4|h5|h6|ul|ol|li|blockquote|pre|table|thead|tbody|tr|th|td|hr|figure|img|div|section)$/.test(tag)
}

function decodeEntities(s: string): string {
  const ta = document.createElement('textarea')
  ta.innerHTML = s
  return ta.value
}

/** 图片：返回 { relId, drawing } 或 null（无法取得二进制时跳过）。 */
/** Uint8Array -> base64，供 JSZip 的 base64 重载使用。 */
function toBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(bin)
}

/** 远端图片拉不下来时给一行文字占位，避免在 Word 里静默丢图。 */
function imageFallbackText(src: string, alt: string): string {
  if (!src) return ''
  const shown = src.startsWith('data:') ? '（内嵌图片数据无法解析）' : src.slice(0, 160)
  return alt ? `[图片] ${alt}` : `[图片无法加载] ${shown}`
}

async function imageParts(src: string, idx: number): Promise<{ rel: string; part: string; ext: string; drawing: string } | null> {
  if (!src) return null
  let bytes: Uint8Array | null = null
  let ext = 'png'

  try {
    if (src.startsWith('data:')) {
      const m = src.match(/^data:([^;,]+)(;base64)?,(.*)$/s)
      if (!m) return null
      ext = (m[1].split('/')[1] || 'png').toLowerCase()
      if (m[2]) {
        const bin = atob(m[3])
        bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      } else {
        bytes = new TextEncoder().encode(decodeURIComponent(m[3]))
      }
    } else {
      const res = await fetch(src)
      if (!res.ok) return null
      const blob = await res.blob()
      ext = (blob.type.split('/')[1] || 'png').toLowerCase().split('+')[0]
      bytes = new Uint8Array(await blob.arrayBuffer())
    }
  } catch {
    return null
  }
  if (!bytes || bytes.length === 0) return null

  // Word 要求 EMU；无自然尺寸信息时按 4 英寸宽兜底。
  const cx = 4 * 914400
  const cy = 2 * 914400
  const rid = `rid-img-${idx}`
  const drawing = `<w:p><w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${idx + 1}" name="Picture ${idx + 1}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:picture xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${idx + 1}" name="Picture ${idx + 1}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:picture></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`

  return { rel: rid, part: toBase64(bytes), ext, drawing }
}

async function buildBlocks(node: ParentNode, doc: { body: string[]; rels: Set<string>; images: Array<{ rel: string; part: string; ext: string }>; imgIdx: number }): Promise<void> {
  const children = Array.from(node.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim()))

  for (const child of children) {
    const el = child as HTMLElement
    if (child.nodeType === Node.TEXT_NODE) {
      const t = (el.textContent || '').trim()
      if (t) doc.body.push(paragraphXml([{ text: t }]))
      continue
    }
    const tag = el.tagName.toLowerCase()
    if (!isBlock(tag)) continue

    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = Number(tag[1])
        const size = HEADING_SIZE[tag] || docxStyle.bodyPt
        const runs: RunSpec[] = []
        el.childNodes.forEach(c => collectRuns(c, runs, doc.rels, size))
        doc.body.push(paragraphXml(runs.map(r => ({ ...r, size })), { heading: level, spaceBefore: 240, spaceAfter: 120 }))
        break
      }
      case 'p': {
        const runs: RunSpec[] = []
        el.childNodes.forEach(c => collectRuns(c, runs, doc.rels, docxStyle.bodyPt))
        const style = el.getAttribute('class') === 'footnote-def' ? 'quote' : undefined
        doc.body.push(paragraphXml(runs, { style, spaceAfter: 160 }))
        break
      }
      case 'br':
        break
      case 'hr':
        doc.body.push(`<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>`)
        break
      case 'blockquote': {
        const runs: RunSpec[] = []
        el.childNodes.forEach(c => collectRuns(c, runs, doc.rels, docxStyle.bodyPt))
        doc.body.push(paragraphXml(runs, { style: 'quote', spaceAfter: 160 }))
        break
      }
      case 'ul': case 'ol': {
        let i = 0
        for (const li of Array.from(el.children).filter(n => n.tagName.toLowerCase() === 'li')) {
          i += 1
          const runs: RunSpec[] = []
          ;(li as HTMLElement).childNodes.forEach(c => collectRuns(c, runs, doc.rels, docxStyle.bodyPt))
          const mark = tag === 'ol' ? `${i}. ` : '• '
          doc.body.push(paragraphXml([bulletRun(mark, docxStyle.bodyPt), ...runs], { indent: 720, spaceAfter: 80 }))
        }
        break
      }
      case 'pre': {
        // 代码行号导出成 <span class="ln">1</span><span class="lc">…</span>；
        // 直接 textContent 会得到 "1code"。有 .lc 时按行拼回（保留行号），
        // 否则去掉 .ln 再取正文。
        const lcs = Array.from(el.querySelectorAll<HTMLElement>('.lc'))
        let code: string
        if (lcs.length) {
          code = lcs.map((lc, i) => `${i + 1} ${decodeEntities(lc.textContent || '')}`).join('\n')
        } else {
          const clone = el.cloneNode(true) as HTMLElement
          clone.querySelectorAll('.ln').forEach(n => n.remove())
          code = decodeEntities(clone.textContent || '')
        }
        code.split('\n').forEach(line => {
          doc.body.push(paragraphXml([{ text: line || ' ', mono: true, size: 10 }], { style: 'code', spaceAfter: 0 }))
        })
        break
      }
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'))
        const gridCols = rows[0] ? rows[0].children.length : 1
        const grid = Array.from({ length: gridCols }).map(() => '<w:gridCol w:w="2600"/>').join('')
        let tbl = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>`
        for (const tr of rows) {
          tbl += '<w:tr>'
          for (const cell of Array.from(tr.children).filter(n => /^(TD|TH)$/.test(n.tagName))) {
            const runs: RunSpec[] = []
            ;(cell as HTMLElement).childNodes.forEach(c => collectRuns(c, runs, doc.rels, docxStyle.bodyPt))
            const bold = (cell as HTMLElement).tagName.toLowerCase() === 'th'
            const cells = runs.map(r => ({ ...r, bold: bold || r.bold }))
            tbl += `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${paragraphXml(cells, { spaceAfter: 40 })}</w:tc>`
          }
          tbl += '</w:tr>'
        }
        tbl += '</w:tbl>'
        doc.body.push(tbl)
        break
      }
      case 'img': {
        const src = el.getAttribute('src') || ''
        const alt = el.getAttribute('alt') || ''
        const img = await imageParts(src, doc.imgIdx)
        if (img) {
          doc.imgIdx += 1
          doc.rels.add(img.rel)
          doc.images.push({ rel: img.rel, part: img.part, ext: img.ext })
          doc.body.push(img.drawing)
        } else {
          const text = imageFallbackText(src, alt)
          if (text) doc.body.push(paragraphXml([{ text }], { spaceAfter: 160 }))
        }
        break
      }
      case 'figure': case 'div': case 'section': {
        const img = el.querySelector('img')
        if (img && el.children.length === 1) {
          const src = img.getAttribute('src') || ''
          const part = await imageParts(src, doc.imgIdx)
          if (part) {
            doc.imgIdx += 1
            doc.rels.add(part.rel)
            doc.images.push({ rel: part.rel, part: part.part, ext: part.ext })
            doc.body.push(part.drawing)
            break
          }
          const text = imageFallbackText(src, img.getAttribute('alt') || '')
          if (text) doc.body.push(paragraphXml([{ text }], { spaceAfter: 160 }))
        }
        await buildBlocks(el, doc)
        break
      }
      default:
        await buildBlocks(el, doc)
    }
  }
}

export interface DocxOptions {
  title: string
  content: string
  /** 追加一段页脚文字（例如“Generated by lzeditor”）。 */
  footer?: string
  /** 正文字号（pt）；默认 12。 */
  fontSize?: number
  /** 字体族（可传 CSS 字体栈，取第一个家族）。 */
  fontFamily?: string
  /** 行高倍数（如 1.7）；默认 1.5。 */
  lineHeight?: string
  /** 段落首行缩进 2 字符。 */
  textIndent?: boolean
  /** 段落两端对齐。 */
  textJustify?: boolean
  /** 纸张尺寸（毫米）；默认 A4 纵向。 */
  pageSize?: { widthMm: number; heightMm: number }
}

export async function generateDOCX({ title, content, footer, fontSize, fontFamily, lineHeight, textIndent, textJustify, pageSize }: DocxOptions): Promise<Blob> {
  const font = (fontFamily || 'Calibri').split(',')[0].replace(/["']/g, '').trim() || 'Calibri'
  docxStyle.bodyPt = fontSize ?? BODY_PT
  docxStyle.font = font
  docxStyle.eastAsia = font
  docxStyle.line = Math.round((parseFloat(lineHeight || '1.5') || 1.5) * 240)
  docxStyle.indent = !!textIndent
  docxStyle.justify = !!textJustify
  const pageWTwips = Math.round((pageSize?.widthMm ?? 210) * 56.6929)
  const pageHTwips = Math.round((pageSize?.heightMm ?? 297) * 56.6929)
  const root = document.createElement('div')
  root.innerHTML = content

  const doc: { body: string[]; rels: Set<string>; images: Array<{ rel: string; part: string; ext: string }>; imgIdx: number } =
    { body: [], rels: new Set<string>(), images: [] as Array<{ rel: string; part: string; ext: string }>, imgIdx: 0 }

  await buildBlocks(root, doc)
  if (footer) {
    doc.body.push(paragraphXml([{ text: footer, size: 9 }], { spaceBefore: 400 }))
  }

  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${CT_NS}">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${[...new Set(doc.images.map(i => i.ext))].map(e => `<Default Extension="${e}" ContentType="image/${e}"/>`).join('\n')}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`)

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${REL_NS}">
<Relationship Id="rIdDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`)

  const now = new Date().toISOString()
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${escXml(title)}</dc:title>
<dc:creator>lzeditor</dc:creator>
<cp:lastModifiedBy>lzeditor</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`)

  // 关系：链接 + 图片
  const relFiles: string[] = []
  for (const href of Array.from(doc.rels).filter(r => !r.startsWith('rid-img-')).sort()) {
    relFiles.push(`<Relationship Id="rid-link-${encodeURIComponent(href)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escXml(href)}" TargetMode="External"/>`)
  }
  doc.images.forEach((img, i) => {
    relFiles.push(`<Relationship Id="${img.rel}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}.${img.ext}"/>`)
  })
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${REL_NS}">
${relFiles.join('\n')}
</Relationships>`)

  doc.images.forEach((img, i) => zip.file(`word/media/image${i + 1}.${img.ext}`, img.part, { base64: true }))

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${XML_NS}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${docxStyle.font}" w:hAnsi="${docxStyle.font}" w:eastAsia="${docxStyle.eastAsia}"/><w:sz w:val="${pt(docxStyle.bodyPt)}"/><w:szCs w:val="${pt(docxStyle.bodyPt)}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="${pt(6)}" w:line="${docxStyle.line}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
${[1, 2, 3, 4, 5, 6].map(l => `<w:style w:type="paragraph" w:styleId="Heading${l}"><w:name w:val="heading ${l}"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="${pt(HEADING_SIZE[`h${l}`])}"/><w:szCs w:val="${pt(HEADING_SIZE[`h${l}`])}"/></w:rPr></w:style>`).join('\n')}
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`)

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
<w:body>
${doc.body.join('\n')}
<w:sectPr><w:pgSz w:w="${pageWTwips}" w:h="${pageHTwips}"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`)

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  })
}
