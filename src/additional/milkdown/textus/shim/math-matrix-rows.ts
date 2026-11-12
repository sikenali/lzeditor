/** Formula rendering (matrix rows), no-op shim: source is returned as-is. */
import type { KatexOptions } from "katex";
type Katex = typeof import("katex").default;

/** Render a formula with KaTeX; no-op: returns the source unchanged. */
export function renderFormula(
  _katex: Katex,
  source: string,
  _options: KatexOptions,
): string {
  return source;
}
