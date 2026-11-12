import type { Ctx, MilkdownPlugin } from "@milkdown/kit/ctx";

/** Lazy block drawing for a long document, no-op shim: every block is drawn
 *  immediately, so no lazy plugin is needed. */
export const lazyBlocksPlugin: MilkdownPlugin = () => {};

/** Add the lazy block nodeViews to `options`; no-op shim: returns `options`
 *  unchanged so the editor's own views render. */
export function withLazyBlockViews<T extends object>(
  _ctx: Ctx,
  options: T,
): T {
  return options;
}
