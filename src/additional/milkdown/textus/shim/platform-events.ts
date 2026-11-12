/** Window event listeners, no-op shim: every listen resolves to a no-op
 *  unlisten, so registration code runs. */

export function listenToThisWindow<T>(
  _event: string,
  _handler: (event: T) => void,
): Promise<() => void> {
  return Promise.resolve(() => {});
}
export function listenToThisWebview<T>(
  _event: string,
  _handler: (event: T) => void,
): Promise<() => void> {
  return Promise.resolve(() => {});
}
export function emitToWindow(_event: string, _payload?: unknown): void {}
export function unlistenAll(..._subs: Promise<() => void>[]): () => void {
  return () => {};
}
