import { DocumentStore } from "../../../vendor/yeli/document/store.ts";
import { createSourcePatch } from "../../../vendor/yeli/editor/source-ranges.ts";

/**
 * A plain, serializable view of the editor selection, expressed in JavaScript
 * UTF-16 code-unit offsets into the canonical source string.
 */
export interface FacadeSelection {
  from: number;
  to: number;
}

/**
 * The single public API for editing a yeli document.
 *
 * All mutations are performed as typed, range-aware transactions against the
 * underlying {@link DocumentStore}; no external caller ever touches the source
 * string directly. Out-of-range or stale-revision writes throw instead of
 * failing silently.
 *
 * Yeli-internal model types (assets, source blocks, projections) are deliberately
 * NOT exposed here; only primitives and plain data cross this boundary.
 */
export interface YeliEditorFacade {
  /** Loads the whole document. Intended for first load only. */
  setText(markdown: string): void;
  /** Returns the current canonical source string (fidelity: no re-serialization). */
  getText(): string;
  /** Replaces [from, to) with text. Throws when the range is out of bounds. */
  replaceRange(from: number, to: number, text: string): void;
  /** Appends text at the end of the document in a single transaction. */
  insertText(text: string): void;
  /** Inserts a block at the end of the document. */
  insertBlock(text: string): void;
  /** Inserts a fenced code block at the end of the document. */
  insertCodeBlock(text: string): void;
  /** Inserts a math block at the end of the document. */
  insertFormula(text: string): void;
  /** Subscribes to document changes, re-emitting fidelity markdown. Returns unsubscribe. */
  onChange(listener: (markdown: string) => void): () => void;
  getSelection(): FacadeSelection | null;
  setSelection(from: number, to: number): void;
  focus(): void;
  scrollToBlock(blockId: string): void;
  undo(): boolean;
  redo(): boolean;
  /** Dispatches a named command; undo/redo are supported directly. */
  execCommand(name: string, args?: Record<string, unknown>): unknown;
}

class YeliEditorFacadeImpl implements YeliEditorFacade {
  #store: DocumentStore | null = null;
  #listeners = new Set<(markdown: string) => void>();
  #selection: FacadeSelection | null = null;

  #ensureStore(source = ""): DocumentStore {
    if (!this.#store) {
      this.#store = new DocumentStore(source, 1);
      this.#store.subscribe(() => this.#emit());
    }
    return this.#store;
  }

  #emit(): void {
    const markdown = this.getText();
    for (const listener of this.#listeners) listener(markdown);
  }

  setText(markdown: string): void {
    if (this.#store) {
      this.#store.replaceSource(markdown);
      return;
    }
    this.#ensureStore(markdown);
    this.#emit();
  }

  getText(): string {
    return this.#store?.getSnapshot().source ?? "";
  }

  #applyPatch(
    from: number,
    to: number,
    insert: string,
    operation: string,
  ): void {
    const store = this.#ensureStore();
    const snapshot = store.getSnapshot();
    const source = snapshot.source;
    const patch = createSourcePatch(
      {
        id: "document",
        expectedText: source,
        range: { from: 0, to: source.length },
        revision: snapshot.revision,
        sourceHash: snapshot.sourceHash,
      },
      insert,
      operation,
      { from, to },
    );
    const result = store.applyPatch(patch);
    if (!result.ok) {
      throw new RangeError(`${operation} failed: ${result.code}`);
    }
  }

  replaceRange(from: number, to: number, text: string): void {
    this.#applyPatch(from, to, text, "replace-range");
  }

  insertText(text: string): void {
    const offset = this.getText().length;
    this.#applyPatch(offset, offset, text, "insert-text");
  }

  insertBlock(text: string): void {
    const source = this.getText();
    const separator = source.length === 0 || source.endsWith("\n") ? "" : "\n";
    const offset = source.length;
    this.#applyPatch(offset, offset, `${separator}${text}`, "insert-block");
  }

  insertCodeBlock(text: string): void {
    this.insertBlock(`\`\`\`\n${text}\n\`\`\``);
  }

  insertFormula(text: string): void {
    this.insertBlock(`$$\n${text}\n$$`);
  }

  onChange(listener: (markdown: string) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  getSelection(): FacadeSelection | null {
    return this.#selection;
  }

  setSelection(from: number, to: number): void {
    this.#selection = { from, to };
  }

  focus(): void {
    // Pure-logic facade: focus/scroll reconciliation belongs to the edit-surface
    // layer (later tasks) that renders the yeli canvas.
  }

  scrollToBlock(_blockId: string): void {
    // Pure-logic facade: scroll reconciliation belongs to the edit-surface layer.
  }

  undo(): boolean {
    return this.#store?.undo()?.ok ?? false;
  }

  redo(): boolean {
    return this.#store?.redo()?.ok ?? false;
  }

  execCommand(name: string, _args?: Record<string, unknown>): unknown {
    const store = this.#ensureStore();
    if (name === "document.undo" || name === "undo") return store.undo();
    if (name === "document.redo" || name === "redo") return store.redo();
    throw new Error(
      `execCommand: unsupported command "${name}" (labels/locale wiring arrives with the edit-surface layer)`,
    );
  }
}

export function createYeliFacade(): YeliEditorFacade {
  return new YeliEditorFacadeImpl();
}
