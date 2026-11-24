import type {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  Ref,
} from "react";

/** A styled dropdown, no-op shim: renders nothing (a real one replaces it
 *  when the editor core is wired in). */
export interface SelectProps {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  title?: string;
}

export function Select(_props: SelectProps) {
  return null;
}

/** The open list of a drawn select, no-op shim: renders nothing (a real one
 *  replaces it when the editor core is wired in). */
export interface SelectMenuProps {
  listRef: Ref<HTMLUListElement>;
  id: string;
  /** usePresence's state: "closing" takes it out of the tab order. */
  state: string;
  className?: string;
  label?: string;
  /** The row the keys are on, by its id; undefined when the input holds it. */
  activeId?: string;
  place: CSSProperties;
  onKeyDown?: (e: KeyboardEvent<HTMLUListElement>) => void;
  children: ReactNode;
}

export function SelectMenu(_props: SelectMenuProps) {
  return null;
}
