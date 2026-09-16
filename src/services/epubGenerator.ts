// @ts-ignore
// @ts-ignore
import * as JSZip from 'jszip'
// saveAs imported from file-saver

export interface EpubOptions {
  title: string
  author: string
  chapters: Array<{
    title: string
    content: string
  }>
  cover?: string
  language?: string
}

export class EPUBGenerator {
  private options: EpubOptions
  private zip: JSZip

  constructor(options: EpubOptions) {
    this.options = options
    this.zip = new JSZip()
  }

  async generate(): Promise<Blob> {
    // Create mimetype file (must be first and uncompressed)
    this.zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    // Create META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    this.zip.file('META-INF/container.xml', containerXml)

    // Create OEBPS directory
    const oebps = this.zip.folder('OEBPS')!
    
    // Create chapters
    let spine = ''
    let manifest = ''
    
    this.options.chapters.forEach((chapter, index) => {
      const filename = `chapter${index + 1}.xhtml`
      oebps.file(filename, this.createChapterXHTML(chapter.title, chapter.content))
      
      manifest += `    <item id="chapter${index + 1}" href="${filename}" media-type="application/xhtml+xml"/>
`
      spine += `    <itemref idref="chapter${index + 1}"/>
`
    })

    // Create cover if provided
    if (this.options.cover) {
      manifest += `    <item id="cover" href="cover.jpg" media-type="image/jpeg"/>
`
    }

    // Create content.opf
    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${Date.now()}</dc:identifier>
    <dc:title>${this.escapeXml(this.options.title)}</dc:title>
    <dc:creator>${this.escapeXml(this.options.author)}</dc:creator>
    <dc:language>${this.options.language || 'zh'}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
${manifest}    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine toc="nav">
${spine}  </spine>
</package>`
    oebps.file('content.opf', contentOpf)

    // Create nav.xhtml
    let navItems = ''
    this.options.chapters.forEach((ch, i) => {
      navItems += `      <li><a href="chapter${i + 1}.xhtml">${this.escapeXml(ch.title)}</a></li>
`
    })
    
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
${navItems}    </ol>
  </nav>
</body>
</html>`
    oebps.file('nav.xhtml', navXhtml)

    // Generate ZIP
    return await this.zip.generateAsync({ type: 'blob' })
  }

  private createChapterXHTML(title: string, content: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escapeXml(title)}</title>
  <style>
    body { font-family: serif; line-height: 1.6; padding: 1em; }
    h1 { color: #333; border-bottom: 2px solid #39FF9E; padding-bottom: 0.3em; }
    h2 { color: #555; }
    p { margin: 1em 0; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 1em; overflow-x: auto; border-radius: 5px; }
    blockquote { border-left: 4px solid #39FF9E; margin: 1em 0; padding-left: 1em; color: #666; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 0.5em; }
    th { background: #f4f4f4; }
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
