/** Strip all DOM nodes that have data-read-frog-* attributes (browser extension injection). */
export function stripReadFrogNodes(container: HTMLElement | null): void {
  if (!container) return
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node: Node) {
      if (!(node instanceof HTMLElement)) return NodeFilter.FILTER_REJECT
      for (const attr of node.attributes) {
        if (attr.name.startsWith('data-read-frog-') || attr.name === 'data-read-frog-walked') {
          return NodeFilter.FILTER_REJECT
        }
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const toRemove: HTMLElement[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node instanceof HTMLElement) toRemove.push(node)
  }
  // Remove deepest nodes first to avoid DOM mutation issues
  toRemove.sort((a, b) => {
    let depthA = 0, depthB = 0
    let cur: Node | null = a
    while (cur?.parentNode) { depthA++; cur = cur.parentNode }
    cur = b
    while (cur?.parentNode) { depthB++; cur = cur.parentNode }
    return depthB - depthA
  })
  toRemove.forEach(el => el.remove())
}

/** Strip HTML comments from a string. */
export function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '')
}

/** Clean HTML: strip read-frog extension injections + HTML comments. */
export function cleanContentHtml(html: string): string {
  if (!html) return ''
  // First strip HTML comments
  let cleaned = stripHtmlComments(html)
  // Then strip read-frog extension spans by parsing as DOM
  const container = document.createElement('div')
  container.innerHTML = cleaned
  stripReadFrogNodes(container)
  return container.innerHTML
}
