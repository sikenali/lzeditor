import type { MilkdownPlugin } from "@milkdown/kit/ctx";
import type { Settings } from "../prefs/settings-types";

/** A hover preview of an embedded picture's target, no-op shim: nothing to
 *  preview, so no plugin. */
export function createObsidianEmbedPreviewPlugin(
  _options: { docPath: () => string | null; settings: () => Settings },
): MilkdownPlugin {
  return () => {};
}
