import type { Ctx } from "@milkdown/kit/ctx";
import { editorViewCtx, serializerCtx } from "@milkdown/kit/core";
import { listenerCtx } from "@milkdown/kit/plugin/listener";
import {
  lift,
  setBlockType,
  toggleMark,
  wrapIn,
} from "@milkdown/kit/prose/commands";
import { liftListItem, wrapInList } from "@milkdown/kit/prose/schema-list";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  deleteColumn,
  deleteRow,
  isInTable,
  selectedRect,
} from "@milkdown/kit/prose/tables";
import { TextSelection } from "@milkdown/kit/prose/state";
import { redo, undo } from "@milkdown/kit/prose/history";
import type { Node as ProseNode, Schema } from "@milkdown/kit/prose/model";
import type { EditorView } from "@milkdown/kit/prose/view";
import type {
  EditorFacade,
  FacadeSelection,
  SearchQueryOptions,
  TableContext,
} from "../EditorFacade";
import type { EditorRunner } from "../../../../additional/milkdown/textus/editor/useEditorRunner";
import { parseMarkdownSource } from "../../../../additional/milkdown/textus/editor/markdown/parse-markdown-source";

/**
 * The Milkdown-backed {@link EditorFacade}.
 *
 * Unlike the CM6 facade (source-mode, string offsets), this one drives a
 * live ProseMirror document, so its commands are WYSIWYG-semantic:
 *  - `selection.*` toggles marks on the selection (never inserts `**`/`*`…).
 *  - `insert.*` converts / wraps the current block (never prefixes `# `/`- `).
 *  - `getTableContext()` reads the real table the caret is in (never `null`).
 *
 * The facade self-subscribes to the editor's `listenerCtx` so `onChange` /
 * `onSelectionChange` keep working while Milkdown owns the document.
 *
 * Range-based helpers (`replaceRange`, `insertText`, search) still speak the
 * contract's Markdown-string offsets: they round-trip through the serializer
 * / parser so callers (search, AI write-back, import) keep working. Cursor
 * precision for these is Phase 2; the WYSIWYG commands above are exact.
 */

/** ProseMirror command over the live view; null when the runner isn't ready. */
function pm(
  runner: EditorRunner,
  fn: (ctx: Ctx) => unknown,
): unknown {
  return runner(fn);
}

/** Serializes the whole document. */
function serialize(ctx: Ctx): string {
  const view = ctx.get(editorViewCtx);
  return ctx.get(serializerCtx)(view.state.doc);
}

/** Converts a source-string offset to the nearest ProseMirror position.
 *  Walks the document's text leaves, accumulating source length — exact for
 *  inline text, approximate across block boundaries (Phase 2 refines). */
function sourceOffsetToPos(view: EditorView, offset: number): number {
  const doc = view.state.doc;
  const size = doc.content.size;
  let acc = 0;
  let pos = 0;
  doc.descendants((node, nodePos) => {
    if (node.isText) {
      const len = node.text?.length ?? 0;
      if (acc + len >= offset) {
        pos = nodePos + Math.max(0, offset - acc);
        return false; // stop
      }
      acc += len;
      // Account for the newline the serializer inserts between blocks.
      if (nodePos + node.nodeSize < size) acc += 1;
      return true;
    }
    return true;
  });
  return Math.max(0, Math.min(pos, size));
}

/** Whether a block-convert command should `setBlockType` to `nodeType`. */
function convertBlock(
  view: EditorView,
  nodeType: string,
  attrs?: Record<string, unknown> | null,
): boolean {
  const type = view.state.schema.nodes[nodeType];
  if (!type) return false;
  return setBlockType(type, attrs as never)(view.state, view.dispatch);
}

/** Wraps the current block in a list of `kind`, converting a heading first
 *  (a list item must start with a paragraph), matching textus' toggleList. */
function wrapInListOf(
  view: EditorView,
  kind: "bullet_list" | "ordered_list",
): boolean {
  const { schema } = view.state;
  const target = schema.nodes[kind];
  const item = schema.nodes.list_item;
  if (!target || !item) return false;
  // Out of the same kind of list: lift back out.
  const $from = view.state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type !== item) continue;
    const list = $from.node(d - 1);
    if (list.type === target) return liftListItem(item)(view.state, view.dispatch);
    // In the other kind: switch kind, keep nesting.
    const tr = view.state.tr.setNodeMarkup($from.before(d - 1), target, {
      spread: list.attrs.spread,
    });
    view.dispatch(tr);
    return true;
  }
  const { heading, paragraph } = schema.nodes;
  if (heading && $from.parent.type === heading) {
    setBlockType(paragraph)(view.state, view.dispatch);
  }
  return wrapInList(target)(view.state, view.dispatch);
}

/** Converts the current block to a task list item (`checked: false`). */
function turnIntoTask(view: EditorView): boolean {
  const { schema } = view.state;
  const bullet = schema.nodes.bullet_list;
  const item = schema.nodes.list_item;
  if (!bullet || !item) return false;
  const done = wrapInListOf(view, "bullet_list");
  if (!done) return false;
  // Set `checked` on the list item the caret is now in (GFM extends it).
  const $from = view.state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type !== item) continue;
    if ($from.node(d).attrs.checked == null) {
      view.dispatch(
        view.state.tr.setNodeMarkup($from.before(d), undefined, {
          ...$from.node(d).attrs,
          checked: false,
        }),
      );
    }
    break;
  }
  return true;
}

/** Builds a GFM table node (`table_header_row` + `table_row`s). */
function buildTable(
  schema: Schema,
  rows: number,
  cols: number,
): ProseNode {
  const header = schema.nodes.table_header_row.create(
    null,
    Array.from({ length: cols }, () =>
      schema.nodes.table_header.create(
        null,
        schema.nodes.paragraph.create(null, schema.text("列")),
      ),
    ),
  );
  const body = Array.from({ length: Math.max(0, rows - 1) }, () =>
    schema.nodes.table_row.create(
      null,
      Array.from({ length: cols }, () => schema.nodes.table_cell.createAndFill()!),
    ),
  );
  return schema.nodes.table.create(null, [header, ...body]);
}

/** Inserts a block-level node at the caret. */
function insertNode(view: EditorView, node: ProseNode): boolean {
  view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView());
  return true;
}

const MEETING_NOTES = [
  "# 会议纪要",
  "",
  "> 时间： ｜ 地点： ｜ 主持人：",
  "",
  "## 参会人员",
  "",
  "- 参与者",
  "",
  "## 议题",
  "",
  "- 议题一",
  "",
  "## 结论 / 待办",
  "",
  "- [ ] 待办项",
  "",
].join("\n");

/**
 * Creates the Milkdown-backed {@link EditorFacade}. `runner` must already be
 * ready (the editor is mounted) — App builds this from `onReady`.
 */
export function createMilkdownEditorFacade(
  runner: EditorRunner,
  viewRoot: HTMLElement | null,
): EditorFacade {
  const changeListeners = new Set<(markdown: string) => void>();
  const selectionListeners = new Set<(selection: FacadeSelection | null) => void>();
  let latestMd = "";
  let revision = 0;
  let lastSelection: FacadeSelection | null = null;
  let lastSearch: SearchQueryOptions | null = null;
  let currentViewRoot: HTMLElement | null = viewRoot;

  // Self-subscribe to document / selection changes via listenerCtx.
  runner((ctx) => {
    ctx.get(listenerCtx).markdownUpdated((_c, md) => {
      latestMd = md;
      revision += 1;
      for (const listener of changeListeners) listener(md);
    });
    ctx.get(listenerCtx).selectionUpdated((_c, sel) => {
      lastSelection = { from: sel.from, to: sel.to };
      for (const listener of selectionListeners) listener(lastSelection);
    });
  });

  function view(): EditorView | undefined {
    return runner((ctx) => ctx.get(editorViewCtx));
  }

  const facade: EditorFacade = {
    setText(markdown: string): void {
      runner((ctx) => {
        const v = ctx.get(editorViewCtx);
        const current = ctx.get(serializerCtx)(v.state.doc);
        if (current === markdown) return; // already flowed out; don't reset caret
        const doc = parseMarkdownSource(ctx, markdown);
        if (!doc) return;
        v.dispatch(
          v.state.tr.replaceWith(0, v.state.doc.content.size, doc.content).scrollIntoView(),
        );
      });
    },

    getText(): string {
      return runner(serialize) ?? latestMd;
    },

    getRevision(): number {
      return revision;
    },

    replaceRange(from: number, to: number, text: string): void {
      // Source-string round-trip: correct content, caret reset (Phase 2 refines).
      const src = facade.getText();
      facade.setText(src.slice(0, from) + text + src.slice(to));
    },

    insertText(text: string, anchor?: FacadeSelection, expectedRevision?: number): void {
      if (expectedRevision !== undefined && expectedRevision !== revision) {
        throw new RangeError(
          `insert-text stale revision: expected ${expectedRevision}, got ${revision}`,
        );
      }
      const src = facade.getText();
      const from = anchor ? anchor.from : src.length;
      const to = anchor ? anchor.to : from;
      facade.replaceRange(from, to, text);
    },

    insertBlock(text: string): void {
      const source = facade.getText();
      const separator = source.length === 0 || source.endsWith("\n") ? "" : "\n";
      facade.replaceRange(source.length, source.length, `${separator}${text}`);
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
      const v = view();
      if (!v) return lastSelection;
      const sel = v.state.selection;
      return { from: sel.from, to: sel.to };
    },

    setSelection(from: number, to: number): void {
      runner((ctx) => {
        const v = ctx.get(editorViewCtx);
        const f = sourceOffsetToPos(v, from);
        const t = sourceOffsetToPos(v, to);
        v.dispatch(
          v.state.tr.setSelection(TextSelection.create(v.state.doc, f, t)).scrollIntoView(),
        );
      });
    },

    onSelectionChange(
      listener: (selection: FacadeSelection | null) => void,
    ): () => void {
      selectionListeners.add(listener);
      return () => {
        selectionListeners.delete(listener);
      };
    },

    // WYSIWYG: real table context when the caret is inside a table.
    getTableContext(): TableContext | null {
      const v = view();
      if (!v) return null;
      if (!isInTable(v.state)) return null;
      const rect = selectedRect(v.state);
      return { rows: rect.table.childCount, cols: rect.map.width };
    },

    setViewRoot(root: HTMLElement | null): void {
      currentViewRoot = root;
    },

    focus(): void {
      const v = view();
      if (!v) return;
      v.focus();
      // Reveal the caret so outline/scroll jumps land visibly.
      if (currentViewRoot) v.dispatch(v.state.tr.scrollIntoView());
    },

    scrollToBlock(blockId: string): void {
      const source = facade.getText();
      const idx = source.indexOf(blockId);
      if (idx < 0) return;
      facade.setSelection(idx, idx);
      facade.focus();
    },

    undo(): boolean {
      const v = view();
      return v ? undo(v.state, v.dispatch) : false;
    },

    redo(): boolean {
      const v = view();
      return v ? redo(v.state, v.dispatch) : false;
    },

    execCommand(name: string, args?: Record<string, unknown>): unknown {
      return pm(runner, (ctx) => {
        const v = ctx.get(editorViewCtx);
        const { schema } = v.state;
        const marks = schema.marks;

        if (name === "document.undo" || name === "undo") return facade.undo();
        if (name === "document.redo" || name === "redo") return facade.redo();

        // ── selection.* : toggle marks (never insert `**`/`*`/``) ──
        if (name.startsWith("selection.")) {
          switch (name) {
            case "selection.bold":
              return toggleMark(marks.strong)(v.state, v.dispatch);
            case "selection.italic":
              return toggleMark(marks.emphasis)(v.state, v.dispatch);
            case "selection.strike":
              return marks.strike_through
                ? toggleMark(marks.strike_through)(v.state, v.dispatch)
                : false;
            case "selection.code":
              return toggleMark(marks.inline_code)(v.state, v.dispatch);
            case "selection.link": {
              const url = String(args?.url ?? "");
              if (!url) {
                const { from, to } = v.state.selection;
                v.dispatch(v.state.tr.removeMark(from, to, marks.link));
                return true;
              }
              return toggleMark(marks.link, { href: url } as never)(v.state, v.dispatch);
            }
            case "selection.clear": {
              const { from, to } = v.state.selection;
              v.dispatch(v.state.tr.removeMark(from, to));
              return true;
            }
            default:
              return null;
          }
        }

        // ── insert.* : convert / wrap the current block (never `# `/`- `) ──
        if (name.startsWith("insert.")) {
          switch (name) {
            case "insert.heading1":
              return convertBlock(v, "heading", { level: 1 });
            case "insert.section":
            case "insert.heading2":
              return convertBlock(v, "heading", { level: 2 });
            case "insert.heading3":
              return convertBlock(v, "heading", { level: 3 });
            case "insert.heading4":
              return convertBlock(v, "heading", { level: 4 });
            case "insert.heading5":
              return convertBlock(v, "heading", { level: 5 });
            case "insert.heading6":
              return convertBlock(v, "heading", { level: 6 });
            case "insert.paragraph":
              return convertBlock(v, "paragraph");
            case "insert.bullet-list":
              return wrapInListOf(v, "bullet_list");
            case "insert.numbered-list":
              return wrapInListOf(v, "ordered_list");
            case "insert.task":
              return turnIntoTask(v);
            case "insert.quote": {
              const quote = schema.nodes.blockquote;
              if (!quote) return false;
              const $from = v.state.selection.$from;
              for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type === quote) return lift(v.state, v.dispatch);
              }
              return wrapIn(quote)(v.state, v.dispatch);
            }
            case "insert.code-block":
              return convertBlock(v, "code_block", {
                language: String(args?.language ?? args?.lang ?? ""),
              });
            case "insert.divider": {
              const hr = schema.nodes.horizontal_rule;
              return hr ? insertNode(v, hr.create()) : false;
            }
            case "insert.table": {
              const table = schema.nodes.table;
              if (!table) return false;
              const rows = Math.max(2, Number(args?.rows ?? 3));
              const cols = Math.max(1, Number(args?.cols ?? 3));
              return insertNode(v, buildTable(schema, rows, cols));
            }
            default:
              return null;
          }
        }

        // ── table.* : real structure commands (caret in a table) ──
        if (name.startsWith("table.")) {
          switch (name) {
            case "table.insert-column-left":
              return addColumnBefore(v.state, v.dispatch);
            case "table.insert-column-right":
              return addColumnAfter(v.state, v.dispatch);
            case "table.insert-row-below":
              return addRowAfter(v.state, v.dispatch);
            case "table.delete-column":
              return deleteColumn(v.state, v.dispatch);
            case "table.delete-row":
              return deleteRow(v.state, v.dispatch);
            default:
              return null;
          }
        }

        // ── block.* : convert / delete / duplicate (Phase 1 minimal) ──
        if (name.startsWith("block.")) {
          switch (name) {
            case "block.convert.heading":
            case "block.convert.heading1":
              return convertBlock(v, "heading", { level: 1 });
            case "block.convert.heading3":
              return convertBlock(v, "heading", { level: 3 });
            case "block.convert.heading4":
              return convertBlock(v, "heading", { level: 4 });
            case "block.convert.heading5":
              return convertBlock(v, "heading", { level: 5 });
            case "block.convert.heading6":
              return convertBlock(v, "heading", { level: 6 });
            case "block.convert.paragraph":
              return convertBlock(v, "paragraph");
            case "block.convert.code":
              return convertBlock(v, "code_block", {
                language: String(args?.language ?? ""),
              });
            case "block.convert.quote":
              return wrapIn(schema.nodes.blockquote)(v.state, v.dispatch);
            case "block.convert.bullet-list":
              return wrapInListOf(v, "bullet_list");
            case "block.convert.numbered-list":
              return wrapInListOf(v, "ordered_list");
            case "block.convert.task":
              return turnIntoTask(v);
            default:
              return null;
          }
        }

        if (name === "template.meeting-notes") {
          facade.insertBlock(MEETING_NOTES);
          return true;
        }

        // view.* / document.save → the UI owns these; return null.
        return null;
      });
    },

    // ── search (Phase 2 refines caret; content round-trips correctly) ──
    searchMatches(options: SearchQueryOptions): number {
      lastSearch = options;
      const src = facade.getText();
      if (options.regex) {
        try {
          const re = new RegExp(options.term, options.caseSensitive ? "g" : "gi");
          return (src.match(re) ?? []).length;
        } catch {
          throw new RangeError(`invalid regex: ${options.term}`);
        }
      }
      const needle = options.caseSensitive ? options.term : options.term.toLowerCase();
      const hay = options.caseSensitive ? src : src.toLowerCase();
      let count = 0;
      let idx = 0;
      while ((idx = hay.indexOf(needle, idx)) !== -1) {
        count += 1;
        idx += needle.length;
      }
      return count;
    },

    findNext(): boolean {
      return false; // Phase 2: exact caret placement on matches.
    },

    findPrev(): boolean {
      return false; // Phase 2.
    },

    replaceCurrent(text: string): number {
      const sel = facade.getSelection();
      if (!sel || sel.from >= sel.to) return 0;
      facade.replaceRange(sel.from, sel.to, text);
      return 1;
    },

    replaceAll(text: string): number {
      if (!lastSearch) return 0;
      const src = facade.getText();
      let count = 0;
      if (lastSearch.regex) {
        try {
          const re = new RegExp(
            lastSearch.term,
            lastSearch.caseSensitive ? "g" : "gi",
          );
          const replaced = src.replace(re, () => {
            count += 1;
            return text;
          });
          facade.setText(replaced);
          return count;
        } catch {
          throw new RangeError(`invalid regex: ${lastSearch.term}`);
        }
      }
      const needle = lastSearch.caseSensitive
        ? lastSearch.term
        : lastSearch.term.toLowerCase();
      const hay = lastSearch.caseSensitive ? src : src.toLowerCase();
      let idx = 0;
      let out = "";
      let last = 0;
      while ((idx = hay.indexOf(needle, idx)) !== -1) {
        count += 1;
        out += src.slice(last, idx) + text;
        last = idx + needle.length;
        idx += needle.length;
      }
      out += src.slice(last);
      if (count > 0) facade.setText(out);
      return count;
    },
  };

  return facade;
}
