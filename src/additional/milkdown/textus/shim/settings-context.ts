import type { Settings } from "../prefs/settings-types";
import type { DiagramEngine, ImageNamingMode } from "../prefs/settings-values";

export type { Settings, DiagramEngine, ImageNamingMode };

/** The settings React context, no-op shim: English strings, an empty
 *  settings object. A real provider replaces this when the editor core is
 *  wired in. */
export function useSettings() {
  return {
    t: (key: string) => key,
    settings: {} as Settings,
  };
}
