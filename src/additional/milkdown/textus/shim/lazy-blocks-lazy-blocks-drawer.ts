/** Lazy drawing of a long document's blocks, no-op shim: nothing is ever
 *  left undrawn, so nothing needs drawing. */
import type { EditorView } from "@milkdown/kit/prose/view";

/** Draw the block around `pos`, kept drawn for `glideMs`; no-op. */
export function drawAround(
  _view: EditorView,
  _pos: number,
  _glideMs = 0,
): void {}

/** Draw every block of `editorDom`; no-op. */
export function drawAllBlocks(_editorDom: Element): void {}
