import type { EditorFacade } from "./EditorFacade";

/**
 * Global registry for the single live {@link EditorFacade}.
 *
 * The single editor entry point: the editor component registers its facade on
 * mount and clears it on unmount, so imperative callers (toolbar, AI panel,
 * shortcuts, import) always reach the currently mounted editor. Only one editor
 * is mounted at a time, and the facade instance is created once per editor
 * mount, so registration is idempotent in practice.
 */
let current: EditorFacade | null = null;

export function registerEditorFacade(facade: EditorFacade | null): void {
  current = facade;
}

export function getEditorFacade(): EditorFacade | null {
  return current;
}
