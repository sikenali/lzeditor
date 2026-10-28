import type { Labels } from "../../../vendor/yeli/i18n/en.ts";
import { DocumentStore } from "../../../vendor/yeli/document/store.ts";
import { projectMarkdown, type SourceBlock } from "../../../vendor/yeli/editor/block-projection.ts";
import {
  COMMAND_CATALOG,
  executeAppendCommand,
  executeBlockCommand,
  executeBlockSelectionCommand,
  executeInsertAfterCommand,
  executeSlashCommand,
  type CommandId,
} from "../../../vendor/yeli/editor/command-registry.ts";
import { createSourcePatch } from "../../../vendor/yeli/editor/source-ranges.ts";
import {
  createTableStructurePatch,
  type TableCellPosition,
  type TableDimensions,
} from "../../../vendor/yeli/editor/table-commands.ts";
import type { DocumentTransactionResult } from "../../../vendor/yeli/document/transactions.ts";

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
  /** Subscribes to selection changes (view-layer scroll/typewriter follow). */
  onSelectionChange(listener: (selection: FacadeSelection | null) => void): () => void;
  focus(): void;
  scrollToBlock(blockId: string): void;
  undo(): boolean;
  redo(): boolean;
  /** Dispatches a named command; undo/redo are supported directly. */
  execCommand(name: string, args?: Record<string, unknown>): unknown;
  /**
   * The live {@link DocumentStore} backing this facade.
   *
   * For the edit-surface renderer (`EditCanvas`) only: it must operate on the
   * exact same store the facade writes through, so keystrokes, undo/redo and
   * programmatic writes all share one revision stream. External callers should
   * keep using the typed facade methods instead of touching the store.
   */
  getDocumentStore(): DocumentStore;
}

export interface YeliFacadeOptions {
  labels?: Labels;
  locale?: "en" | "zh-CN";
}

/** 行内选中包裹命令 → markdown 包裹符（adapter 扩展：command-registry 无
 *  selection.* 的 execute*，由 facade 以 typed selection-wrap 事务实现）。 */
const SELECTION_WRAP: Record<string, (selected: string, args?: Record<string, unknown>) => string> = {
  "selection.bold": (selected) => `**${selected}**`,
  "selection.italic": (selected) => `*${selected}*`,
  "selection.strike": (selected) => `~~${selected}~~`,
  "selection.code": (selected) => `\`${selected}\``,
  "selection.link": (selected, args) => {
    const url = String(args?.url ?? "");
    return url ? `[${selected}](${url})` : selected;
  },
  "selection.clear": (selected) =>
    selected
      .replace(/^\*\*|\*\*$/gu, "")
      .replace(/^\*|\*$/gu, "")
      .replace(/^~~|~~$/gu, "")
      .replace(/^`|`$/gu, ""),
};

const VALID_COMMAND_IDS = new Set<string>(
  COMMAND_CATALOG.map((definition) => definition.id),
);

class YeliEditorFacadeImpl implements YeliEditorFacade {
  #store: DocumentStore | null = null;
  #listeners = new Set<(markdown: string) => void>();
  #selection: FacadeSelection | null = null;
  #selectionListeners = new Set<(selection: FacadeSelection | null) => void>();
  #labels: Labels;
  #locale: "en" | "zh-CN";

  constructor(options: YeliFacadeOptions = {}) {
    this.#labels = options.labels ?? ({} as Labels);
    this.#locale = options.locale ?? "zh-CN";
  }

  #ensureStore(source = ""): DocumentStore {
    if (!this.#store) {
      this.#store = new DocumentStore(source, 1);
      this.#store.subscribe(() => this.#emit());
    }
    return this.#store;
  }

  #notifySelection(): void {
    for (const listener of this.#selectionListeners) listener(this.#selection);
  }

  #currentBlocks(): SourceBlock[] {
    const snapshot = this.#store?.getSnapshot();
    if (!snapshot) return [];
    return projectMarkdown(snapshot.source, snapshot.revision).blocks;
  }

  #findBlock(id: string): SourceBlock | null {
    return this.#currentBlocks().find((block) => block.id === id) ?? null;
  }

  #selectionWrap(name: string, args?: Record<string, unknown>): DocumentTransactionResult | null {
    const wrap = SELECTION_WRAP[name];
    const selection = this.#selection;
    if (!wrap || !selection || selection.from >= selection.to) return null;
    const source = this.getText();
    const selected = source.slice(selection.from, selection.to);
    if (!selected) return null;
    const wrapped = wrap(selected, args);
    const result = this.#applyPatch(
      selection.from,
      selection.to,
      wrapped,
      name,
    );
    if (result === undefined) return null;
    this.setSelection(selection.from, selection.from + wrapped.length);
    return result;
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
  ): DocumentTransactionResult {
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
    return result;
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
    this.#notifySelection();
  }

  onSelectionChange(
    listener: (selection: FacadeSelection | null) => void,
  ): () => void {
    this.#selectionListeners.add(listener);
    return () => {
      this.#selectionListeners.delete(listener);
    };
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

  execCommand(name: string, args?: Record<string, unknown>): unknown {
    const store = this.#ensureStore();
    if (name === "document.undo" || name === "undo") return store.undo();
    if (name === "document.redo" || name === "redo") return store.redo();

    const id = name as CommandId;
    if (!VALID_COMMAND_IDS.has(id)) {
      throw new Error(`execCommand: unknown command "${name}"`);
    }

    // selection.*：command-registry 无对应 execute*，facade 以 typed
    // selection-wrap 事务实现（见 SELECTION_WRAP）。
    if (id.startsWith("selection.")) {
      return this.#selectionWrap(id, args);
    }

    // table.*：结构命令走 table-commands 的 createTableStructurePatch。
    if (id.startsWith("table.")) {
      const blockId = String(args?.blockId ?? "");
      const block = blockId ? this.#findBlock(blockId) : null;
      const activeCell = args?.activeCell as TableCellPosition | undefined;
      if (!block || !activeCell) return null;
      const kind = id.replace(/^table\./u, "") as
        | "delete-column"
        | "delete-row"
        | "insert-column-left"
        | "insert-column-right"
        | "insert-row-above"
        | "insert-row-below";
      const patch = createTableStructurePatch(block, { activeCell, kind });
      return patch ? store.applyPatch(patch) : null;
    }

    // 带 block 上下文的命令：斜杠/追加/块转换。
    const blockId = String(args?.blockId ?? "");
    const blockIds = (args?.blockIds as string[] | undefined) ?? [];
    const tableDimensions = args?.tableDimensions as TableDimensions | undefined;
    const locale = this.#locale;
    const labels = this.#labels;

    if (blockIds.length > 1) {
      const blocks = blockIds
        .map((bid) => this.#findBlock(bid))
        .filter((block): block is SourceBlock => block !== null);
      return blocks.length === blockIds.length
        ? executeBlockSelectionCommand(store, id, blocks)
        : null;
    }

    const block = blockId ? this.#findBlock(blockId) : null;
    if (block) {
      if (
        id.startsWith("insert.") ||
        id === "template.meeting-notes"
      ) {
        return args?.after
          ? executeInsertAfterCommand(store, id, block, labels, locale, tableDimensions)
          : executeSlashCommand(store, id, block, labels, locale, tableDimensions);
      }
      return executeBlockCommand(store, id, block, labels);
    }

    // 无 block：仅追加类命令（insert.* / template）可用。
    return executeAppendCommand(store, id, labels, locale, tableDimensions);
  }

  getDocumentStore(): DocumentStore {
    return this.#ensureStore();
  }
}

export function createYeliFacade(
  options: YeliFacadeOptions = {},
): YeliEditorFacade {
  return new YeliEditorFacadeImpl(options);
}
