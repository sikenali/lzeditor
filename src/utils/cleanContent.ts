/** Strip all DOM nodes that have data-read-frog-* attributes (browser extension injection). */
export function stripReadFrogNodes(container: HTMLElement | null): void {
  if (!container) return
  // 注意：不能用 acceptNode 返回 ACCEPT/REJECT 来区分「要不要删」。
  // nextNode() 只产出 acceptNode 返回 ACCEPT 的节点，之前那段逻辑把 ACCEPT
  // 当成了「要删除」，结果把整篇文档全部删掉、只留下插件注入的节点。
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT)
  const toRemove: HTMLElement[] = []
  let node: Node | null = walker.nextNode()
  while (node) {
    if (node instanceof HTMLElement) {
      for (const attr of node.attributes) {
        if (attr.name.startsWith('data-read-frog-')) {
          toRemove.push(node)
          break
        }
      }
    }
    node = walker.nextNode()
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
