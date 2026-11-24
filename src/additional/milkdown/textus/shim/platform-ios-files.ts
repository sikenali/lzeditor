/** iOS scoped-file helpers, no-op shim: never a scoped URL. */
export function isScopedUrl(_path: string): boolean {
  return false;
}
export async function scopedImageSrc(
  _src: string,
  _docUrl: string,
): Promise<string> {
  return "";
}
