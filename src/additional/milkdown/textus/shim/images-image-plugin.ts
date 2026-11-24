/** Image drawing helper, no-op shim: pictures are shown as-is. */

/** Resolve an image against its document; no-op: returns `src`. */
export function resolveImageSrc(src: string, _docPath: string | null): string {
  return src;
}

/** Draw an image for its document, resolving a scoped or rooted src;
 *  no-op: keeps the src as-is. */
export function showDocImage(
  img: HTMLImageElement,
  _src: string,
  _doc: string | null,
  _stillWanted: () => boolean = () => true,
): void {
  img.dataset.docSrc = img.getAttribute("src") ?? "";
}
