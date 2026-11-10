/**
 * The single public API for editing a document, now backed by a CodeMirror 6
 * source editor (formerly the yeli WYSIWYG block canvas).
 *
 * All mutations are performed as typed, range-aware CodeMirror transactions
 * against the live editor; no external caller touches the source string
 * directly. Out-of-range or stale-revision writes throw instead of failing
 * silently.
 *
 * The contract is intentionally source-mode: the document is a Markdown
 * string, and `getTableContext()` is `null` because a source editor has no
 * block/table-cell context. `table.*` commands fall back to inserting a
 * markdown table (see the CM6 command mapping).
 *
 * Editor-internal model types are deliberately NOT exposed here; only
 * primitives and plain data cross this boundary.
 */

/** A plain, serializable view of the editor selection, in JS UTF-16 offsets. */
export interface FacadeSelection {
  from: number;
  to: number;
}

/** 查找/替换参数（SearchPanel 的查询词与开关）。 */
export interface SearchQueryOptions {
  /** 原始查询词；regex=true 时按正则解析，否则字面匹配。 */
  term: string;
  /** 是否把 term 当正则解析。 */
  regex: boolean;
  /** 是否区分大小写。 */
  caseSensitive: boolean;
  /** 是否全字匹配（匹配两侧不能是非空白字符）。 */
  wholeWord: boolean;
}

/**
 * The single public API for editing a document. Implemented by the CM6-backed
 * facade (`createCM6EditorFacade`); every caller (App, AI panel, toolbar,
 * search panel, outline, history, import) goes through this interface.
 */
export interface EditorFacade {
  /** Loads the whole document. Intended for first load / document switch. */
  setText(markdown: string): void;
  /** Returns the current canonical source string (fidelity: no re-serialization). */
  getText(): string;
  /** Returns the current document revision; mismatches mean the doc changed. */
  getRevision(): number;
  /** Replaces [from, to) with text. Throws when the range is out of bounds. */
  replaceRange(from: number, to: number, text: string): void;
  /**
   * Inserts `text` at `anchor` in a single transaction, or appends at the end
   * when `anchor` is omitted. With a collapsed anchor this inserts at that
   * point; with a non-empty range it replaces the selection.
   * `expectedRevision` pins the write; on mismatch a `RangeError` is thrown.
   */
  insertText(text: string, anchor?: FacadeSelection, expectedRevision?: number): void;
  /** Inserts a block at the end of the document. */
  insertBlock(text: string): void;
  /** Inserts a fenced code block (with optional language) at the end. */
  insertCodeBlock(language: string, code: string): void;
  /** Inserts an inline math span (`$$…$$`) at the end. */
  insertFormula(text: string): void;
  /** Subscribes to document changes, re-emitting fidelity markdown. */
  onChange(listener: (markdown: string) => void): () => void;
  getSelection(): FacadeSelection | null;
  setSelection(from: number, to: number): void;
  /** Subscribes to selection changes (view-layer scroll/typewriter follow). */
  onSelectionChange(listener: (selection: FacadeSelection | null) => void): () => void;
  /**
   * Source-mode reality: there is no block/table-cell context, so this is
   * always `null`. The toolbar's table-structure buttons disable; `insert.table`
   * still works through `execCommand`.
   */
  getTableContext(): null;
  /** Injects the editor view root (used for focus/scroll ranges). */
  setViewRoot(root: HTMLElement | null): void;
  focus(): void;
  scrollToBlock(blockId: string): void;
  undo(): boolean;
  redo(): boolean;
  /** Dispatches a named command; undo/redo are supported directly. */
  execCommand(name: string, args?: Record<string, unknown>): unknown;
  /** 在保真源码上做匹配遍历，返回命中数。无效正则 → 抛 RangeError。 */
  searchMatches(options: SearchQueryOptions): number;
  /** 跳到当前命中的下一处（末处回绕）。无命中 → false。 */
  findNext(): boolean;
  /** 跳到当前命中的上一处（首处回绕）。无命中 → false。 */
  findPrev(): boolean;
  /** 替换当前高亮那一处，随后重算命中并把高亮前进到替换点之后。 */
  replaceCurrent(text: string): number;
  /** 逐处替换全部命中（自后向前），返回替换处数。 */
  replaceAll(text: string): number;
}

export interface EditorFacadeOptions {
  labels?: Record<string, string>;
  locale?: "en" | "zh-CN";
}
