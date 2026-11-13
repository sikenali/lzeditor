/**
 * The source-preserving wrapper's decision for an external `md` write.
 *
 * This module is runtime-pure: no React, no ctx, no Milkdown imports — the
 * node `--test` runner (CJS loader) cannot resolve `@milkdown/kit`'s ESM-only
 * subpath exports, so `resolveExternalWrite` must be importable without
 * loading the editor chain. The source-preserving read/write helpers
 * (`readSourceBlocks`, `writePreservingSource`) live in
 * `markdown/source-preserving.ts`, the editor-wiring layer.
 */

/**
 * `replace` is true only when the incoming markdown differs from what the
 * editor already holds, so an edit that just flowed out through `onChange`
 * (and was echoed back by the parent) is a no-op and never resets the caret.
 */
export function resolveExternalWrite(
  current: string,
  incoming: string,
): { replace: boolean } {
  return { replace: current !== incoming };
}
