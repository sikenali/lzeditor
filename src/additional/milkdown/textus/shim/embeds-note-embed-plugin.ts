import type { MilkdownPlugin } from "@milkdown/kit/ctx";

/** A note embedded as a block, no-op shim: no note embeds, so no plugin. */
export function createNoteEmbedPlugin(
  _docPath: () => string | null,
): MilkdownPlugin {
  // A MilkdownPlugin must return a cleanup runner; no-op: nothing to clean.
  return () => () => {};
}
