/** The window's folder, no-op shim: none. */
export function windowFolder(): string | null {
  return null;
}
export function setWindowFolderSource(
  _source: (() => string | null) | null,
): void {}
