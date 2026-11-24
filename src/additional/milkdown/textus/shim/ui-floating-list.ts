import { useRef, type CSSProperties } from "react";

/** A list that opens beside its control, no-op shim: never placed, always
 *  closed. A real implementation replaces this later. */
export function useFloatingList(
  _open: boolean,
  _active: number,
  _dismiss: () => void,
  _maxHeight?: number,
) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const place: CSSProperties = {};
  return { triggerRef, listRef, place };
}
