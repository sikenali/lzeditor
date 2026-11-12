/** Table position helpers, no-op shim: nothing is inside a table here. */
import type { Node, ResolvedPos } from "@milkdown/kit/prose/model";

/** Whether `node` is a table cell; no-op: false. */
export function isTableCell(_node: Node): boolean {
  return false;
}

/** Whether `$pos` is inside a table cell; no-op: false. */
export function inTableCell(_pos: ResolvedPos): boolean {
  return false;
}
