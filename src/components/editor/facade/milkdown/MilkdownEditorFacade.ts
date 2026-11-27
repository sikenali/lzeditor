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
import { toggleSpan } from "../../../../additional/milkdown/textus/editor/marks/span-commands";
import {
  toggleFormat,
  toggleCodeSpan,
  STRIKETHROUGH,
} from "../../../../additional/milkdown/textus/editor/keys/format-shortcut-plugin";
import { LINK } from "../../../../additional/milkdown/textus/editor/markdown/link-source";
import { createSearchSession } from "../cm6/cm6-search";
import { applySourceCommand } from "../source-commands";

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

/** Per-top-level-block markdown length, serializing each block in isolation.
 *  Exact for block boundaries (the block's own markers count); each isolated
 *  serialization already ends with a newline, and the full doc adds one more,
 *  so block i starts at Σ lengths + i. */
function blockMarkdownLengths(ctx: Ctx, doc: ProseNode): number[] {
  const serializer = ctx.get(serializerCtx);
  const lens: number[] = [];
  for (let i = 0; i < doc.childCount; i++) {
    lens.push(serializer(doc.type.create(null, [doc.child(i)])).length);
  }
  return lens;
}

/** 块首标记长度（标题 `# `、列表 `- `/`1. `、引用 `> `、代码围栏行）。
 *  光标源偏移必须把这段标记算进去，否则列号会停在标记位置、行号也会偏。 */
function markerPrefixLength(md: string): number {
  const m = /^(?:#{1,6}\s+|>\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|`{3,}[^\n]*\n)/.exec(md);
  return m ? m[0].length : 0;
}

/** Per-block marker prefix length, serialized the same way as the lengths. */
function blockPrefixLengths(ctx: Ctx, doc: ProseNode): number[] {
  const serializer = ctx.get(serializerCtx);
  const out: number[] = [];
  for (let i = 0; i < doc.childCount; i++) {
    out.push(markerPrefixLength(serializer(doc.type.create(null, [doc.child(i)]))));
  }
  return out;
}

/** Converts a ProseMirror position to the source-string offset of the same
 *  point. Exact at block boundaries; within a block the text between the block
 *  start and `pos` (markers excluded) is counted — paragraphs (the common
 *  case) are exact, marked spans approximate by the marker length. */
function posToSourceOffset(ctx: Ctx, view: EditorView, pos: number): number {
  const doc = view.state.doc;
  const lens = blockMarkdownLengths(ctx, doc);
  const prefixes = blockPrefixLengths(ctx, doc);
  let acc = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const childStart = childStartPos(doc, i);
    const childEnd = childStart + child.nodeSize;
    if (pos <= childEnd) {
      // 光标在块尾（图片/表格/链接等原子节点会让 textBetween 少算源码长度，
      // 直接按文字量算会落在块中间，插入操作随后会吃掉尾部源码）。
      if (pos >= childEnd - 1) return acc + Math.max(0, lens[i] - 1);
      // 从块内容起点（childStart+1）量到光标：从块节点起点量会把整段文字
      // 多算一次（标题/段落的光标停在文字起点时列号会多出整段长度）。
      const textStart = Math.min(childStart + 1, childEnd);
      const textLen = doc.textBetween(textStart, Math.max(textStart, pos), "\n", "\n").length;
      return acc + prefixes[i] + textLen;
    }
    // 隔离序列化已带一个结尾换行，整篇再补一个分隔换行；+1 才是块间真实间隔。
    acc += lens[i] + 1;
  }
  return acc;
}

/** The ProseMirror content position where top-level child `i` begins. */
function childStartPos(doc: ProseNode, index: number): number {
  let pos = 0;
  for (let i = 0; i < index; i++) pos += doc.child(i).nodeSize;
  return pos;
}

/** Converts a source-string offset to the nearest ProseMirror position.
 *  Inverse of {@link posToSourceOffset}: walks top-level blocks by their
 *  serialized length, then maps within the block via `textBetween`. */
function sourceOffsetToPos(ctx: Ctx, view: EditorView, offset: number): number {
  const doc = view.state.doc;
  const lens = blockMarkdownLengths(ctx, doc);
  const prefixes = blockPrefixLengths(ctx, doc);
  let acc = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const childStart = childStartPos(doc, i);
    const child = doc.child(i);
    const nextAcc = acc + lens[i] + 1;
    if (offset < nextAcc) {
      // 块尾（含图片等原子节点）直接落回块内容末尾，避免映射到原子节点之前。
      if (offset >= acc + Math.max(0, lens[i] - 1)) {
        return childStart + child.nodeSize - 1;
      }
      const within = Math.max(0, offset - acc - prefixes[i]);
      // Map within-block text length → PM position (approximate, markers excluded).
      let best = childStart;
      let walked = 0;
      doc.descendants((node, nodePos) => {
        if (nodePos < childStart || nodePos > childStart + child.nodeSize) return true;
        if (node.isText) {
          const len = node.text?.length ?? 0;
          if (walked + len >= within) {
            best = nodePos + Math.max(0, within - walked);
            return false;
          }
          walked += len;
        }
        return true;
      });
      return Math.max(childStart, Math.min(best, childStart + child.nodeSize));
    }
    acc = nextAcc;
  }
  return doc.content.size;
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

/** The table node containing the caret, if any. */
function tableAncestor(view: EditorView): { pos: number; node: ProseNode } | null {
  const $from = view.state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "table") return { pos: $from.before(d), node };
  }
  return null;
}

/** Converts a table row to another row/cell type, preserving cell content. */
function convertRow(
  row: ProseNode,
  rowType: string,
  cellType: string,
  schema: Schema,
): ProseNode {
  const rt = schema.nodes[rowType];
  const ct = schema.nodes[cellType];
  if (!rt || !ct) return row;
  const cells: ProseNode[] = [];
  for (let i = 0; i < row.childCount; i++) {
    const cell = row.child(i);
    cells.push(ct.create(cell.attrs, cell.content));
  }
  return rt.create(row.attrs, cells);
}

/** 切换标题行：把表头与第一条数据行对调（GFM 首行恒为表头，交换是
 *  markdown 能表达的“换标题行”）。 */
function toggleHeaderRow(view: EditorView): boolean {
  const table = tableAncestor(view);
  if (!table || table.node.childCount < 2) return false;
  const header = table.node.child(0);
  const firstBody = table.node.child(1);
  if (header.type.name !== "table_header_row" || firstBody.type.name !== "table_row") return false;
  const schema = view.state.schema;
  const rows: ProseNode[] = [
    convertRow(firstBody, "table_header_row", "table_header", schema),
    convertRow(header, "table_row", "table_cell", schema),
  ];
  for (let i = 2; i < table.node.childCount; i++) rows.push(table.node.child(i));
  const next = table.node.type.create(table.node.attrs, rows);
  view.dispatch(view.state.tr.replaceWith(table.pos, table.pos + table.node.nodeSize, next));
  return true;
}

/** 删除整张表格。 */
function deleteTable(view: EditorView): boolean {
  const table = tableAncestor(view);
  if (!table) return false;
  view.dispatch(view.state.tr.delete(table.pos, table.pos + table.node.nodeSize));
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

/** The top-level block containing the caret: its doc offsets and node. */
function topBlockAt(view: EditorView): { start: number; end: number; node: ProseNode } | null {
  const doc = view.state.doc;
  const from = view.state.selection.from;
  let offset = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const node = doc.child(i);
    const end = offset + node.nodeSize;
    if (from >= offset && from <= end) return { start: offset, end, node };
    offset = end;
  }
  return null;
}

/** Inserts a block-level node at the caret. */
function insertNode(view: EditorView, node: ProseNode): boolean {
  view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView());
  return true;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Inline formatting: the vendored textus schema has NO strong/emphasis/
 * inline_code/link/strike_through MARKS — commonmarkWithoutMarks excludes
 * them, and bold/italic/strike/code are `md_span`/`md_code_span` NODES and a
 * link is a `link` NODE (all Typora-style, holding their Markdown source as
 * text). The minimal commonmark assembly used by node tests DOES have the
 * marks. So every selection.* handler is schema-aware: use the textus toggle
 * helpers when `md_span` exists, fall back to `toggleMark` when the mark does.
 * (The browser smoke test is what exercises the textus path.)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Bold: md_span rung 2 (textus) or the strong mark (commonmark). */
function toggleBold(view: EditorView): boolean {
  const { schema } = view.state;
  if (schema.nodes.md_span) return toggleSpan(view, 2);
  const mark = schema.marks.strong;
  return mark ? toggleMark(mark)(view.state, view.dispatch) : false;
}

/** Italic: md_span rung 1 (textus) or the emphasis mark (commonmark). */
function toggleItalic(view: EditorView): boolean {
  const { schema } = view.state;
  if (schema.nodes.md_span) return toggleSpan(view, 1);
  const mark = schema.marks.emphasis;
  return mark ? toggleMark(mark)(view.state, view.dispatch) : false;
}

/** Strikethrough: md_span `~~` (textus) or the strike_through mark (commonmark). */
function toggleStrike(view: EditorView): boolean {
  const { schema } = view.state;
  if (schema.nodes.md_span) return toggleFormat(view, STRIKETHROUGH);
  const mark = schema.marks.strike_through;
  return mark ? toggleMark(mark)(view.state, view.dispatch) : false;
}

/** Inline code: md_code_span (textus) or the inline_code mark (commonmark). */
function toggleInlineCode(view: EditorView): boolean {
  const { schema } = view.state;
  if (schema.nodes.md_code_span) return toggleCodeSpan(view);
  const mark = schema.marks.inline_code;
  return mark ? toggleMark(mark)(view.state, view.dispatch) : false;
}

/** Removes a textus link node (holding `[text](url)`) by replacing it with its
 *  label text; false when the caret isn't in one. */
function unwrapLinkNodes(view: EditorView): boolean {
  const { state } = view;
  const { from, to, empty } = state.selection;
  const link = state.schema.nodes.link;
  if (!link) return false;
  const targets: Array<{ node: ProseNode; pos: number }> = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type === link) {
      targets.push({ node, pos });
      return false;
    }
    return true;
  });
  if (!targets.length) return false;
  let tr = state.tr;
  for (let i = targets.length - 1; i >= 0; i--) {
    const { node, pos } = targets[i];
    tr = tr.replaceWith(pos, pos + node.nodeSize, node.content);
  }
  // Keep the caret where the selection was (mapped through the tr).
  const mappedFrom = tr.mapping.map(empty ? from : from);
  view.dispatch(tr.setSelection(TextSelection.create(tr.doc, mappedFrom)));
  return true;
}

/** Link: textus `link` node (wraps selection in `[text](url)` source) or the
 *  link mark (commonmark). `url` empty → remove the link. */
function toggleLink(view: EditorView, url: string): boolean {
  const { schema } = view.state;
  if (schema.nodes.link) {
    if (!url) return unwrapLinkNodes(view);
    const link = schema.nodes.link;
    const { from, to, empty } = view.state.selection;
    const label = empty ? "" : view.state.doc.textBetween(from, to);
    const source = `[${label}](${url})`;
    const node = link.create({}, schema.text(source));
    if (empty) {
      view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView());
      return true;
    }
    view.dispatch(view.state.tr.replaceWith(from, to, node).scrollIntoView());
    return true;
  }
  const mark = schema.marks.link;
  if (!mark) return false;
  if (!url) {
    const { from, to } = view.state.selection;
    view.dispatch(view.state.tr.removeMark(from, to, mark));
    return true;
  }
  return toggleMark(mark, { href: url } as never)(view.state, view.dispatch);
}

/** Clears formatting: unwraps textus inline wrapper nodes, removes commonmark
 *  marks, then resets the block itself (heading/list/quote/code → paragraph).
 *  "清除格式" on an ordered list must produce body text, not just strip bold. */
function clearFormatting(view: EditorView): boolean {
  const { state } = view;
  const { from, to, empty } = state.selection;
  const wrappers = new Set(["md_span", "md_code_span", LINK]);
  let did = false;

  if (!empty) {
    if (state.schema.nodes.md_span) {
      const targets: Array<{ node: ProseNode; pos: number }> = [];
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.isInline && wrappers.has(node.type.name)) {
          targets.push({ node, pos });
          return false;
        }
        return true;
      });
      if (targets.length) {
        let tr = state.tr;
        for (let i = targets.length - 1; i >= 0; i--) {
          const { node, pos } = targets[i];
          tr = tr.replaceWith(pos, pos + node.nodeSize, node.content);
        }
        view.dispatch(tr);
        did = true;
      }
    } else {
      view.dispatch(state.tr.removeMark(from, to));
      did = true;
    }
  } else {
    // Collapsed caret inside bold/italic/link/code: unwrap that wrapper.
    const $from = state.selection.$from;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.isInline && wrappers.has(node.type.name)) {
        const start = $from.before(d);
        view.dispatch(
          state.tr.replaceWith(start, start + node.nodeSize, node.content),
        );
        did = true;
        break;
      }
    }
  }

  return resetBlock(view) || did;
}

/** Lifts the caret's block out of lists/quotes and converts it to a paragraph. */
function resetBlock(view: EditorView): boolean {
  const { schema } = view.state;
  const paragraph = schema.nodes.paragraph;
  const item = schema.nodes.list_item;
  const quote = schema.nodes.blockquote;
  if (!paragraph) return false;
  let did = false;

  // A list item must leave its list before it can become a paragraph.
  for (let guard = 0; item && guard < 8; guard++) {
    const { $from } = view.state.selection;
    let inList = false;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type === item) { inList = true; break; }
    }
    if (!inList) break;
    if (!liftListItem(item)(view.state, view.dispatch)) break;
    did = true;
  }
  // Likewise a quote.
  for (let guard = 0; quote && guard < 8; guard++) {
    const { $from } = view.state.selection;
    let inQuote = false;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type === quote) { inQuote = true; break; }
    }
    if (!inQuote) break;
    if (!lift(view.state, view.dispatch)) break;
    did = true;
  }
  if (setBlockType(paragraph)(view.state, view.dispatch)) did = true;
  return did;
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

  // 搜索会话复用 CM6 的纯模块（操作 getText/replaceRange/setSelection，无 CM6 依赖）。
  // facade 在运行时才赋值，访问器闭包延迟解引用，避免循环初始化。
  let facade: EditorFacade;
  const search = createSearchSession({
    getText: () => facade.getText(),
    replaceRange: (from, to, text) => facade.replaceRange(from, to, text),
    setSelection: (from, to) => facade.setSelection(from, to),
  });

  facade = {
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
      const from = runner((ctx) => posToSourceOffset(ctx, v, sel.from)) ?? sel.from;
      const to = runner((ctx) => posToSourceOffset(ctx, v, sel.to)) ?? sel.to;
      return { from, to };
    },

    setSelection(from: number, to: number): void {
      runner((ctx) => {
        const v = ctx.get(editorViewCtx);
        const f = sourceOffsetToPos(ctx, v, from);
        const t = sourceOffsetToPos(ctx, v, to);
        v.dispatch(
          v.state.tr.setSelection(TextSelection.create(v.state.doc, f, t)).scrollIntoView(),
        );
        // ProseMirror 只在编辑器有焦点时绘制选区高亮。查找/替换、大纲跳转
        // 都经这里设置选区；不 focus 的话选区确实移动了，但用户看不到，
        // 看起来就是「查找没有反应」。
        v.focus();
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
      try {
        if (!isInTable(v.state)) return null;
        const rect = selectedRect(v.state);
        return { rows: rect.table.childCount, cols: rect.map.width };
      } catch {
        return null;
      }
    },

    setViewRoot(root: HTMLElement | null): void {
      currentViewRoot = root;
    },

    focus(): void {
      const v = view();
      if (!v) return;
      v.focus();
      // 大纲/滚动跳转要把目标块放到编辑器顶部，而不是仅“露出来”（贴底）。
      const $head = v.state.selection.$head;
      const blockPos = $head.depth > 0 ? $head.before(1) : 0;
      const dom = v.nodeDOM(blockPos) as HTMLElement | null;
      const scroller = v.dom.closest(".milkdown") as HTMLElement | null;
      if (dom && scroller) {
        const top =
          dom.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop;
        scroller.scrollTo({ top: Math.max(0, top - 24), behavior: "smooth" });
      } else if (currentViewRoot) {
        v.dispatch(v.state.tr.scrollIntoView());
      }
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
      // Sup/sub, introduction, TOC and footnote are pure Markdown-source edits
      // shared with the CM6 facade (see source-commands). They round-trip
      // through the serializer/parser, so the result is the same in WYSIWYG.
      const sourceResult = applySourceCommand(facade, name);
      if (sourceResult !== null) return sourceResult;

      return pm(runner, (ctx) => {
        const v = ctx.get(editorViewCtx);
        const { schema } = v.state;

        if (name === "document.undo" || name === "undo") return facade.undo();
        if (name === "document.redo" || name === "redo") return facade.redo();

        // ── selection.* : toggle inline formatting (schema-aware: md_span nodes
        //    in the textus schema, marks in the minimal commonmark assembly) ──
        if (name.startsWith("selection.")) {
          switch (name) {
            case "selection.bold":
              return toggleBold(v);
            case "selection.italic":
              return toggleItalic(v);
            case "selection.strike":
              return toggleStrike(v);
            case "selection.code":
              return toggleInlineCode(v);
            case "selection.link":
              return toggleLink(v, String(args?.url ?? ""));
            case "selection.clear":
              return clearFormatting(v);
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
              // textus 的 commonmark schema 里分割线节点叫 `hr`（不是
              // horizontal_rule）；名字写错时命令静默返回 false，看起来就是
              // 点「插入分割线」没反应。
              const hr = schema.nodes.hr ?? schema.nodes.horizontal_rule;
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
            case "table.toggle-header-row":
              return toggleHeaderRow(v);
            case "table.delete-table":
              return deleteTable(v);
            default:
              return null;
          }
        }

        // ── block.* : convert / delete / duplicate (Phase 1 minimal) ──
        if (name.startsWith("block.")) {
          switch (name) {
            case "block.convert.heading":
            case "block.convert.heading2":
              return convertBlock(v, "heading", { level: 2 });
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
            case "block.duplicate": {
              const r = topBlockAt(v);
              if (!r) return false;
              v.dispatch(v.state.tr.insert(r.end, r.node.copy(r.node.content)));
              return true;
            }
            case "block.insert-below": {
              const r = topBlockAt(v);
              const p = schema.nodes.paragraph?.createAndFill();
              if (!r || !p) return false;
              const tr = v.state.tr.insert(r.end, p);
              v.dispatch(
                tr.setSelection(TextSelection.create(tr.doc, r.end + 1)).scrollIntoView(),
              );
              return true;
            }
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

    // ── search：复用 CM6 搜索会话（findNext/findPrev 真实跳转，替换保真） ──
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

  return facade;
}
