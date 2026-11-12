import { useCallback, useRef, type Ref } from "react";

/** Exits: a surface stays mounted a little after it closes. No-op shim: a
 *  surface is mounted exactly as long as it is open. */
export type PresenceState = "open" | "closing";

export interface PresenceHandle {
  mounted: boolean;
  state: PresenceState;
  ref: (el: Element | null) => void;
}

export function usePresence(
  open: boolean,
  _opts: { exitMs?: number } = {},
): PresenceHandle {
  return { mounted: open, state: "open", ref: () => {} };
}

/** One stable ref callback that feeds several refs. */
export function useMergedRef<T>(
  ...refs: (Ref<T> | ((el: T | null) => void) | undefined)[]
): (el: T | null) => void {
  const latest = useRef(refs);
  latest.current = refs;
  return useCallback((el: T | null) => {
    for (const ref of latest.current) {
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as { current: T | null }).current = el;
    }
  }, []);
}
