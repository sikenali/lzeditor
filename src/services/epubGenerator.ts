import JSZip from 'jszip'

export interface EpubOptions {
  title: string
  author: string
  chapters: Array<{
    title: string
    content: string
  }>
  cover?: string
  language?: string
  description?: string
  /** 是否生成 nav.xhtml（目录）；默认 true。 */
  includeTOC?: boolean
  fontSize?: number
  fontFamily?: string
  lineHeight?: string
  textIndent?: boolean
  textJustify?: boolean
  /** highlight.js 主题 CSS，附在章节样式后让代码块保留语法色。 */
  codeCSS?: string
}

export class EPUBGenerator {
  private options: EpubOptions
  private zip: JSZip

  constructor(options: EpubOptions) {
    this.options = options
    this.zip = new JSZip()
  }

  async generate(): Promise<Blob> {
    // mimetype must be first and uncompressed
    this.zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    // META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    this.zip.file('META-INF/container.xml', containerXml)

    const oebps = this.zip.folder('OEBPS')!
    
    let spine = ''
    let manifest = ''
    let navPoints = ''

    this.options.chapters.forEach((chapter, index) => {
      const filename = `chapter${index + 1}.xhtml`
      oebps.file(filename, this.createChapterXHTML(chapter.title, chapter.content))
      
      manifest += `    <item id="chapter${index + 1}" href="${filename}" media-type="application/xhtml+xml"/>
`
      spine += `    <itemref idref="chapter${index + 1}"/>
`
      navPoints += `      <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
        <navLabel><text>${this.escapeXml(chapter.title)}</text></navLabel>
        <content src="${filename}"/>
      </navPoint>
`
    })

    const includeTOC = this.options.includeTOC !== false

    if (this.options.cover) {
      manifest += `    <item id="cover" href="cover.jpg" media-type="image/jpeg"/>
`
    }

    if (includeTOC) {
      manifest += `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
`
    }

    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${Date.now()}</dc:identifier>
    <dc:title>${this.escapeXml(this.options.title)}</dc:title>
    <dc:creator>${this.escapeXml(this.options.author)}</dc:creator>
    <dc:language>${this.options.language || 'zh'}</dc:language>
    ${this.options.description ? `<dc:description>${this.escapeXml(this.options.description)}</dc:description>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
${manifest}  </manifest>
  <spine${includeTOC ? ' toc="nav"' : ''}>
${spine}  </spine>
</package>`
    oebps.file('content.opf', contentOpf)

    if (includeTOC) {
      const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${this.options.chapters.map((ch, i) => `      <li><a href="chapter${i + 1}.xhtml">${this.escapeXml(ch.title)}</a></li>
`).join('')}
    </ol>
  </nav>
</body>
</html>`
      oebps.file('nav.xhtml', navXhtml)
    }

    return await this.zip.generateAsync({ type: 'blob' })
  }

  private createChapterXHTML(title: string, content: string): string {
    const font = this.options.fontFamily || '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif'
    const fontSize = this.options.fontSize ? `${this.options.fontSize}px` : '1em'
    const lineHeight = this.options.lineHeight || '1.8'
    const indent = this.options.textIndent ? '2em' : '0'
    const align = this.options.textJustify ? 'justify' : 'left'
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escapeXml(title)}</title>
  <style>
    body { font-family: ${font}; font-size: ${fontSize}; line-height: ${lineHeight}; padding: 1em; color: #333; }
    h1 { font-size: 1.8em; color: #1a1a1a; border-bottom: 2px solid #39FF9E; padding-bottom: 0.3em; margin-top: 0; }
    h2 { font-size: 1.4em; color: #333; margin-top: 1.5em; }
    h3 { font-size: 1.2em; color: #444; margin-top: 1.2em; }
    p { margin: 1em 0; text-align: ${align}; text-indent: ${indent}; }
    code { background: #f4f4f4; padding: 0.15em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1em; overflow-x: auto; border-radius: 5px; margin: 1em 0; }
    pre code { background: none; padding: 0; }
    .ln { color: #999; margin-right: 0.8em; display: inline-block; width: 2em; text-align: right; user-select: none; }
    blockquote { border-left: 4px solid #39FF9E; margin: 1em 0; padding-left: 1em; color: #666; font-style: italic; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 0.6em; text-align: left; }
    th { background: #f4f4f4; font-weight: 600; }
    ul, ol { padding-left: 2em; }
    li { margin: 0.3em 0; }
    a { color: #39FF9E; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    ${this.options.codeCSS || ''}
  </style>
</head>
<body>
  <h1>${this.escapeXml(title)}</h1>
  ${content}
</body>
</html>`
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

export async function generateEPUB(options: EpubOptions): Promise<Blob> {
  const generator = new EPUBGenerator(options)
  return await generator.generate()
}
