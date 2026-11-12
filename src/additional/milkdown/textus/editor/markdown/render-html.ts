/**
 * Markdown -> sanitized HTML, for the split view's preview, chat replies and
 * inline decoration widgets.
 *
 * Degraded: the vendored core has no `marked` dependency (B7), so the Marked
 * renderers (math, footnotes, wikilinks, images) that the full Textus build
 * wires in are not available here. Each renderer returns its input unchanged;
 * a future task that needs real HTML rendering supplies a `marked`-free
 * implementation (or a `marked` dependency) and replaces these bodies.
 */

/** Markdown source -> sanitized, block-aware HTML, for the chat reply. */
export function renderMarkdownHtml(markdown: string): string {
  return markdown;
}

/** A whole document -> sanitized HTML, for the split view's preview. */
export function renderDocumentHtml(markdown: string): string {
  return markdown;
}

/** Markdown source -> sanitized inline-only HTML, for an inline decoration
 *  widget where a block element would be invalid inside the paragraph. */
export function renderMarkdownInlineHtml(markdown: string): string {
  return markdown;
}
