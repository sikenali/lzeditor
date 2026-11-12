/** The storage layer, no-op shim: nothing persisted, nothing read back. */

/** The boot payload, no-op shim: never present. */
export function readBoot(): { aiUnavailable?: boolean } | null {
  return null;
}

/** Every localStorage key the app reads or writes outside the stores'
 *  fallbacks. */
export const LOCAL_KEYS = {
  settings: "catvinci-settings",
  deepThinking: "textus-agent-deep-thinking",
  lastMode: "textus-agent-last-mode",
  fetchedModels: (provider: string) => `textus-fetched-models:${provider}`,
  readingPlaces: "textus-reading-places",
} as const;

/** A localStorage value as JSON, or null when absent or unreadable. */
export function readLocalJson(_key: string): unknown {
  return null;
}

/** Write a value to localStorage; no-op shim. */
export function writeLocal(_key: string, _value: string): void {}

/** Track a pending write; no-op shim: returns the write as-is. */
export function trackWrite<T>(write: Promise<T>): Promise<T> {
  return write;
}
