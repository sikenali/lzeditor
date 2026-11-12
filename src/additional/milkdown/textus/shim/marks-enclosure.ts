/** Enclosure selection helpers, no-op shim: nothing touches a range. */

/** Whether a selection touches `from`-`to`; no-op: false. */
export function cursorTouches(
  _selection: { from: number; to: number },
  _from: number,
  _to: number,
): boolean {
  return false;
}
