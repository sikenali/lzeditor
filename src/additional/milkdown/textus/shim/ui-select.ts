import type { ReactNode } from "react";

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
