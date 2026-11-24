import { EditorView } from "@codemirror/view";
import { EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { redo, undo } from "@codemirror/commands";
import type {
  EditorFacade,
  FacadeSelection,
  SearchQueryOptions,
  TableContext,
} from "../EditorFacade";
import { applyEditorCommand } from "./cm6-commands";
import { createSearchSession } from "./cm6-search";
import { parseTableAt } from "../../../../utils/markdownTable";

/**
 * The CM6-backed {@link EditorFacade}.
 *
 * The facade owns the {@link EditorView} (created over `parent`) because CM6
 * update listeners are fixed at view construction — wrapping a pre-created view
 * would leave onChange/onSelectionChange unreachable. Callers get the handle
 * back with `view` for mounting/lifecycle and `destroy()` to tear it down.
 */

export interface CM6FacadeOptions {
  /** Editor extensions from the component (history, keymap, markdown, theme). */
  extensions?: Extension[];
  labels?: Record<string, string>;
  locale?: "en" | "zh-CN";
}

export interface CM6FacadeHandle {
  facade: EditorFacade;
  view: EditorView;
  destroy(): void;
}

export function createCM6EditorFacade(
  parent: HTMLElement,
  options: CM6FacadeOptions = {},
): CM6FacadeHandle {
  let revision = 0;
  let lastSelection: FacadeSelection | null = null;
  let viewRoot: HTMLElement | null = parent;
  const changeListeners = new Set<(markdown: string) => void>();
  const selectionListeners = new Set<(selection: FacadeSelection | null) => void>();

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      revision += 1;
      const md = update.state.doc.toString();
      for (const listener of changeListeners) listener(md);
    }
    if (update.selectionSet || update.docChanged) {
      const main = update.state.selection.main;
      lastSelection = { from: main.from, to: main.to };
      for (const listener of selectionListeners) listener(lastSelection);
    }
  });

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [...(options.extensions ?? []), updateListener],
    }),
  });

  function getDoc(): string {
    return view.state.doc.toString();
  }

  function docLen(): number {
    return view.state.doc.length;
  }

  function dispatchChanges(changes: Array<{ from: number; to: number; insert: string }>): void {
    view.dispatch({ changes, scrollIntoView: false });
  }

  function setSelection(from: number, to: number): void {
    const len = docLen();
    const f = Math.max(0, Math.min(from, len));
    const t = Math.max(f, Math.min(to, len));
    view.dispatch({ selection: EditorSelection.range(f, t), scrollIntoView: true });
  }

  const search = createSearchSession({
    getText: getDoc,
    replaceRange: (from, to, text) => dispatchChanges([{ from, to, insert: text }]),
    setSelection,
  });

  const facade: EditorFacade = {
    setText(markdown: string): void {
      // External source changes only when the content actually differs; an
      // edit that already flowed out of onChange comes back equal, so this is
      // a no-op and never resets the caret (Review Focus #1).
      if (getDoc() === markdown) return;
      lastSelection = null;
      view.dispatch({
        changes: { from: 0, to: docLen(), insert: markdown },
        scrollIntoView: false,
      });
    },

    getText: getDoc,

    getRevision(): number {
      return revision;
    },

    replaceRange(from: number, to: number, text: string): void {
      dispatchChanges([{ from, to, insert: text }]);
    },

    insertText(
      text: string,
      anchor?: FacadeSelection,
      expectedRevision?: number,
    ): void {
      if (
        expectedRevision !== undefined &&
        expectedRevision !== revision
      ) {
        throw new RangeError(
          `insert-text stale revision: expected ${expectedRevision}, got ${revision}`,
        );
      }
      const from = anchor ? anchor.from : docLen();
      const to = anchor ? anchor.to : from;
      dispatchChanges([{ from, to, insert: text }]);
    },

    insertBlock(text: string): void {
      const source = getDoc();
      const separator = source.length === 0 || source.endsWith("\n") ? "" : "\n";
      const offset = source.length;
      dispatchChanges([{ from: offset, to: offset, insert: `${separator}${text}` }]);
    },

    insertCodeBlock(language: string, code: string): void {
      facade.insertBlock(`\`\`\`${language}\n${code}\n\`\`\``);
    },

    insertFormula(text: string): void {
      facade.insertText(`$$${text}$$`);
    },

    onChange(listener: (markdown: string) => void): () => void {
      changeListeners.add(listener);
      return () => {
        changeListeners.delete(listener);
      };
    },

    getSelection(): FacadeSelection | null {
      if (lastSelection) return lastSelection;
      const main = view.state.selection.main;
      return { from: main.from, to: main.to };
    },

    setSelection,

    onSelectionChange(
      listener: (selection: FacadeSelection | null) => void,
    ): () => void {
      selectionListeners.add(listener);
      return () => {
        selectionListeners.delete(listener);
      };
    },

    // Source mode: parse the markdown table at the caret so table-structure
    // buttons enable in code mode too (insert/delete column/row, header row,
    // delete table). Outside a table → null.
    getTableContext(): TableContext | null {
      const sel = facade.getSelection();
      const table = parseTableAt(getDoc(), sel?.from ?? 0);
      if (!table) return null;
      return {
        rows: table.rows.length,
        cols: Math.max(...table.rows.map((r) => r.length), table.delimiter.length),
      };
    },

    setViewRoot(root: HTMLElement | null): void {
      viewRoot = root;
    },

    focus(): void {
      view.focus();
      if (!viewRoot) return;
      // 大纲/滚动跳转要把目标行放到编辑器顶部，而不是仅“露出来”（贴底）。
      const main = view.state.selection.main;
      view.dispatch({ effects: EditorView.scrollIntoView(main.head, { y: "start" }) });
    },

    scrollToBlock(blockId: string): void {
      const source = getDoc();
      const idx = source.indexOf(blockId);
      if (idx < 0) return;
      setSelection(idx, idx);
      view.focus();
    },

    undo(): boolean {
      return undo(view);
    },

    redo(): boolean {
      return redo(view);
    },

    execCommand(name: string, args?: Record<string, unknown>): unknown {
      return applyEditorCommand(facade, name, args);
    },

    searchMatches(options: SearchQueryOptions): number {
      return search.searchMatches(options);
    },

    findNext(): boolean {
      return search.findNext();
    },

    findPrev(): boolean {
      return search.findPrev();
    },

    replaceCurrent(text: string): number {
      return search.replaceCurrent(text);
    },

    replaceAll(text: string): number {
      return search.replaceAll(text);
    },
  };

  return {
    facade,
    view,
    destroy() {
      view.destroy();
    },
  };
}
