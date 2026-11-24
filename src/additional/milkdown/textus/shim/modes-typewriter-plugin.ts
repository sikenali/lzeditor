import type { MilkdownPlugin } from "@milkdown/kit/ctx";

/** Typewriter-mode transaction meta key, no-op shim: a constant that no
 *  plugin reads. */
export const TYPEWRITER_HOLD = "typewriterHold";

/** Typewriter mode, no-op shim: never on, so no plugin. */
export function createTypewriterPlugin(
  _options: { enabled: () => boolean },
): MilkdownPlugin {
  // A MilkdownPlugin must return a cleanup runner; no-op: nothing to clean.
  return () => () => {};
}
