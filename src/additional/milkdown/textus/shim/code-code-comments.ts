/** Comment-range detection for code highlighting, no-op shim: the code
 *  feature is outside the A2 closure, so no comment ranges are reported
 *  (color swatches won't skip code comments). */
export function commentRanges(
  _text: string,
  _language: string | null,
): [number, number][] {
  return [];
}
