/** KaTeX loading, no-op shim: KaTeX is never loaded. */
type Katex = typeof import("katex").default;

/** KaTeX if it is loaded; no-op: null (never starts a load). */
export function katexNow(): Katex | null {
  return null;
}

/** Whether KaTeX has finished loading; no-op: false. */
export function katexLoaded(): boolean {
  return false;
}

/** Load KaTeX; no-op: a never-resolving promise (callers `void` it). */
export function loadKatex(): Promise<Katex> {
  return new Promise(() => {});
}
