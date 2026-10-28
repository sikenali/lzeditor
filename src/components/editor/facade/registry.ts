import type { YeliEditorFacade } from "./YeliEditorFacade";

/**
 * Global registry for the single live {@link YeliEditorFacade}.
 *
 * Replaces the old `getCM6Editor()` entry point: the editor component registers
 * its facade on mount and clears it on unmount, so imperative callers (toolbar,
 * AI panel, shortcuts, import) always reach the currently mounted editor. Only
 * one editor is mounted at a time, and the facade instance is created once per
 * editor mount, so registration is idempotent in practice.
 */
let current: YeliEditorFacade | null = null;

export function registerYeliFacade(facade: YeliEditorFacade | null): void {
  current = facade;
}

export function getYeliFacade(): YeliEditorFacade | null {
  return current;
}
