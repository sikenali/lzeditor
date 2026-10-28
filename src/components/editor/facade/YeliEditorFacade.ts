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
import {
  focusSourceOffset,
  scrollBlockIntoView,
  selectionSourceRange,
} from "../assist/source-offset.ts";
import {
  tableCellFromSourceOffset,
  tableContextFromCell,
  type TableBlockContext,
} from "../assist/table-context.ts";

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
  /**
   * Returns the current document revision. Every committed transaction (via
   * facade or the edit surface) bumps it by 1; a mismatch against a previously
   * captured value means the document changed underneath the caller.
   */
  getRevision(): number;
  /** Replaces [from, to) with text. Throws when the range is out of bounds. */
  replaceRange(from: number, to: number, text: string): void;
  /**
   * Inserts `text` at `anchor` in a single transaction, or appends at the end
   * when `anchor` is omitted.
   *
   * `anchor` is the replacement range expressed in canonical-source offsets
   * (from {@link getSelection}). With a collapsed anchor (`from === to`) this
   * inserts at that point; with a non-empty range it replaces the selection.
   * This is how AI streaming feeds chunks in one transaction at a time.
   *
   * `expectedRevision` optionally pins the write to a known document revision.
   * When it does not match the current revision (the user edited mid-stream),
   * a `RangeError` is thrown and nothing is written — the caller drops the
   * chunk instead of overwriting the user's latest content.
   */
  insertText(text: string, anchor?: FacadeSelection, expectedRevision?: number): void;
  /** Inserts a block at the end of the document. */
  insertBlock(text: string): void;
  /** Inserts a fenced code block (with optional language) at the end of the document. */
  insertCodeBlock(language: string, code: string): void;
  /** Inserts a math block at the end of the document. */
  insertFormula(text: string): void;
  /** Subscribes to document changes, re-emitting fidelity markdown. Returns unsubscribe. */
  onChange(listener: (markdown: string) => void): () => void;
  getSelection(): FacadeSelection | null;
  setSelection(from: number, to: number): void;
  /** Subscribes to selection changes (view-layer scroll/typewriter follow). */
  onSelectionChange(listener: (selection: FacadeSelection | null) => void): () => void;
  /**
   * 当前光标/活动单元格所在的表格块上下文；不在表格内 → null。
   *
   * 供顶层工具栏的 table.* 结构命令填充 blockId/activeCell（见 A1）。推导顺序：
   * 1. 最近 focusin 的活动单元格（DOM 优先，toolbar 点击不会清掉）；
   * 2. 源码偏移兜底（#selection / DOM 选区 → 所在表格块 → 反推行列）。
   */
  getTableContext(): { blockId: string; activeCell: TableCellPosition } | null;
  /**
   * 注入编辑器视图根（.yeli-canvas-shell）。facade 在此挂 focusin 监听以追踪
   * 表格活动单元格，并作为 focus/scrollToBlock 的定位范围。卸载时传 null。
   */
  setViewRoot(root: HTMLElement | null): void;
  focus(): void;
  scrollToBlock(blockId: string): void;
  undo(): boolean;
  redo(): boolean;
  /** Dispatches a named command; undo/redo are supported directly. */
  execCommand(name: string, args?: Record<string, unknown>): unknown;
  /**
   * The live {@link DocumentStore} backing this facade.
   *
   * ⚠️ INTERNAL LEAK (accepted for now): only the edit-surface renderer
   * (`EditCanvas`) may call this — it must render off the exact same store the
   * facade writes through, so keystrokes, undo/redo and programmatic writes all
   * share one revision stream. Every other caller must keep using the typed
   * facade methods and never touch the store. A later task replaces this with
   * constructor injection so the store never crosses the boundary.
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
  // #selection 仅由 setSelection 更新，而 setSelection 由 typewriter 的
  // selectionchange handler（assist/typewriter.ts）调用。若未装 typewriter 或
  // selectionchange 未触发，selection.* 命令会因 #selection 为空而静默 no-op
  // （#selectionWrap 返回 null）。execCommand 的 selection.* 分支会先尝试从
  // DOM 读当前选区兜底（#readDomSelection），DOM 不可及时才静默降级。
  #selection: FacadeSelection | null = null;
  #selectionListeners = new Set<(selection: FacadeSelection | null) => void>();
  // 最近聚焦的表格单元格上下文（focusin 记录；点 toolbar 按钮时焦点移出 root，
  // focusin 不向 root 冒泡，故保留——见 setViewRoot 的 #onFocusIn）。
  #tableContext: TableBlockContext | null = null;
  #viewRoot: HTMLElement | null = null;
  #onFocusIn = (event: FocusEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const context = tableContextFromCell(target);
    if (context) {
      this.#tableContext = context;
      // 通知 useTableActive 等重算：表格上下文变化也走 selection 监听面。
      this.#notifySelection();
      return;
    }
    // 焦点进入编辑区但不在表格单元格 → 表格上下文失效。
    if (this.#viewRoot && this.#viewRoot.contains(target)) {
      this.#tableContext = null;
      this.#notifySelection();
    }
  };
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

  /**
   * typewriter 的 selectionchange → setSelection 同步链未就绪时，回退读 DOM
   * 当前选区（浏览器环境可及才生效；失败静默返回 null，selection.* 保持 no-op）。
   */
  #readDomSelection(): FacadeSelection | null {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }
    return selectionSourceRange();
  }

  #selectionWrap(name: string, args?: Record<string, unknown>): DocumentTransactionResult | null {
    const wrap = SELECTION_WRAP[name];
    const selection = this.#selection ?? this.#readDomSelection();
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
    // 换文档时清掉旧选区与表格上下文，避免用过期 anchor 插入（越界抛错）。
    this.#selection = null;
    this.#tableContext = null;
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

  getRevision(): number {
    return this.#store?.getSnapshot().revision ?? 0;
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

  insertText(
    text: string,
    anchor?: FacadeSelection,
    expectedRevision?: number,
  ): void {
    if (
      expectedRevision !== undefined &&
      expectedRevision !== this.getRevision()
    ) {
      throw new RangeError(
        `insert-text stale revision: expected ${expectedRevision}, got ${this.getRevision()}`,
      );
    }
    const from = anchor ? anchor.from : this.getText().length;
    const to = anchor ? anchor.to : from;
    this.#applyPatch(from, to, text, "insert-text");
  }

  insertBlock(text: string): void {
    const source = this.getText();
    const separator = source.length === 0 || source.endsWith("\n") ? "" : "\n";
    const offset = source.length;
    this.#applyPatch(offset, offset, `${separator}${text}`, "insert-block");
  }

  insertCodeBlock(language: string, code: string): void {
    this.insertBlock(`\`\`\`${language}\n${code}\n\`\`\``);
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
    // #selection 由 typewriter 的 selectionchange 同步；未就绪（首次挂载/点击瞬间）
    // 时从 DOM 反推当前光标，避免调用方拿到 null 而退化为追加到文末（见 A3）。
    // 仅在 DOM 也无法确定时返回 null。
    return this.#selection ?? this.#readDomSelection();
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

  getTableContext(): { blockId: string; activeCell: TableCellPosition } | null {
    // 1. 最近 focusin 的单元格（DOM 优先，覆盖 toolbar 点击瞬间焦点已移出的场景）。
    if (this.#tableContext) return this.#tableContext;
    // 2. 源码偏移兜底：光标所在块为表格 → 反推行列。
    const selection = this.#selection ?? this.#readDomSelection();
    if (!selection) return null;
    const block = this.#currentBlocks().find(
      (candidate) =>
        selection.from >= candidate.range.from &&
        selection.from <= candidate.range.to,
    );
    if (!block || block.kind !== "table" || !block.editable) return null;
    const activeCell = tableCellFromSourceOffset(
      block.expectedText,
      selection.from - block.range.from,
    );
    if (!activeCell) return null;
    return { blockId: block.id, activeCell };
  }

  setViewRoot(root: HTMLElement | null): void {
    if (this.#viewRoot === root) return;
    this.#viewRoot?.removeEventListener("focusin", this.#onFocusIn);
    this.#viewRoot = root;
    this.#viewRoot?.addEventListener("focusin", this.#onFocusIn);
  }

  focus(): void {
    const root = this.#viewRoot;
    if (!root) return;
    // 大纲跳转等：setSelection 已就位，把光标放到选区并滚动跟随。
    const selection = this.#selection ?? this.#readDomSelection();
    if (selection && focusSourceOffset(root, selection.from)) return;
    // 无选区：聚焦第一个可编辑块。
    root
      .querySelector<HTMLElement>("[data-source-block-id] .block-content-editable")
      ?.focus();
  }

  scrollToBlock(blockId: string): void {
    const root = this.#viewRoot;
    if (!root) return;
    if (!scrollBlockIntoView(root, blockId)) return;
    // 滚动后聚焦块内首个可编辑（尽力而为，失败不阻断）。
    const blocks = root.querySelectorAll<HTMLElement>("[data-source-block-id]");
    for (const block of blocks) {
      if (block.getAttribute("data-source-block-id") === blockId) {
        block
          .querySelector<HTMLElement>(".block-content-editable")
          ?.focus();
        break;
      }
    }
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
    // selection-wrap 事务实现（见 SELECTION_WRAP）。#selection 由 typewriter
    // 的 selectionchange handler 同步（见 #selection 注释）；若为空则先读 DOM
    // 选区兜底，避免未装 typewriter / 点击瞬间未触发时静默 no-op。
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
