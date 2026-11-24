/** IME key-event detection, no-op shim: no event is an IME event. */
import type { EditorView } from "@milkdown/kit/prose/view";

/** Whether a key event is IME composition; no-op: false. */
export function isImeKeyEvent(_view: EditorView, _event: KeyboardEvent): boolean {
  return false;
}
