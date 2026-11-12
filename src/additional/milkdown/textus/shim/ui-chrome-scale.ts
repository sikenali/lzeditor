/** Chrome scale (window-relative UI sizing), no-op shim: identity. */
export function chromeScaleAt(_windowWidth: number): number {
  return 1;
}
export function scaledPx(n: number): number {
  return n;
}
