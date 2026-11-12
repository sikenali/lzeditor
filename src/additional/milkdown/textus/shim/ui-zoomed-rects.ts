/** Boxes read inside the document's zoom as drawn on screen, no-op shim:
 *  scale 1 (no zoom). */
export function zoomedRectScale(_inside: HTMLElement): number {
  return 1;
}
