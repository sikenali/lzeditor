import type { EditorFacade } from "../EditorFacade";

/**
 * Maps the command ids the app already calls (previously the yeli
 * `command-registry` catalog) to CodeMirror-backed transactions on the
 * {@link EditorFacade}.
 *
 * Source-mode reality:
 *  - `selection.*` wrap the current selection with markdown delimiters
 *    (collapsed selection is a no-op, never corrupts).
 *  - `insert.*` / `template.meeting-notes` build markdown and insert at the
 *    cursor (or append at the end when there is no selection).
 *  - `block.*` rewrite / delete / duplicate the current source line.
 *  - `table.*` structure commands have no block context in a source editor, so
 *    they fall back to inserting an empty markdown table (never throw).
 *  - `view.*` / `document.save` are handled by the UI; the editor returns null.
 */

/** Pure selection wrap: same delimiters as the previous editor. */
const SELECTION_WRAP: Record<string, (s: string, args?: Record<string, unknown>) => string> = {
  "selection.bold": (s) => `**${s}**`,
  "selection.italic": (s) => `*${s}*`,
  "selection.strike": (s) => `~~${s}~~`,
  "selection.code": (s) => `\`${s}\``,
  "selection.link": (s, args) => {
    const url = String(args?.url ?? "");
    return url ? `[${s}](${url})` : s;
  },
  "selection.clear": (s) =>
    s
      .replace(/^\*\*|\*\*$/gu, "")
      .replace(/^\*|\*$/gu, "")
      .replace(/^~~|~~$/gu, "")
      .replace(/^`|`$/gu, ""),
};

export function wrapSelection(
  selected: string,
  name: string,
  args?: Record<string, unknown>,
): string {
  const wrap = SELECTION_WRAP[name];
  if (!wrap) return selected;
  return wrap(selected, args);
}

/** Leading block marker a `block.convert.*` should strip before re-prefixing. */
const BLOCK_PREFIX_RE = /^(#{1,6}\s+|- \[[ xX]\]\s+|[-*+]\s+|\d+\.\s+|>\s+|```\s*)/u;

/**
 * Rewrites the leading markdown marker of one source line to `targetPrefix`.
 * Pure and node-testable (no DOM).
 */
export function applyBlockConvert(
  line: string,
  targetPrefix: string,
): { text: string } {
  const stripped = line.replace(BLOCK_PREFIX_RE, "");
  return { text: targetPrefix + stripped };
}

const BLOCK_PREFIX: Record<string, string> = {
  "block.convert.heading": "## ",
  "block.convert.heading1": "# ",
  "block.convert.heading3": "### ",
  "block.convert.heading4": "#### ",
  "block.convert.heading5": "##### ",
  "block.convert.heading6": "###### ",
  "block.convert.task": "- [ ] ",
  "block.convert.quote": "> ",
  "block.convert.bullet-list": "- ",
  "block.convert.numbered-list": "1. ",
  "block.convert.code": "```\n",
  "block.convert.paragraph": "",
};

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

function buildTable(args?: Record<string, unknown>): string {
  const rows = Math.max(1, Number(args?.rows ?? 3));
  const cols = Math.max(1, Number(args?.cols ?? 3));
  const header = args?.withHeaderRow !== false;
  const headerCells = Array.from({ length: cols }, (_, i) =>
    String((args?.headers as string[] | undefined)?.[i] ?? `列${i + 1}`),
  );
  const lines: string[] = [
    `| ${headerCells.join(" | ")} |`,
    `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`,
  ];
  const bodyRows = header ? Math.max(1, rows - 1) : rows;
  for (let r = 0; r < bodyRows; r++) {
    lines.push(`| ${Array.from({ length: cols }, () => " ").join(" | ")} |`);
  }
  return `\n${lines.join("\n")}\n`;
}

/** Builds the markdown an `insert.*` / template command produces. */
const INSERT_MD: Record<string, (args?: Record<string, unknown>) => string> = {
  "insert.paragraph": () => "",
  "insert.task": () => "- [ ] ",
  "insert.bullet-list": () => "- ",
  "insert.numbered-list": () => "1. ",
  "insert.quote": () => "> ",
  "insert.code-block": (args) => {
    const lang = String(args?.language ?? args?.lang ?? "");
    const code = String(args?.code ?? "");
    return `\`\`\`${lang}\n${code}\n\`\`\``;
  },
  "insert.table": (args) => buildTable(args),
  "insert.divider": () => "---\n",
  "insert.heading1": () => "# ",
  "insert.heading3": () => "### ",
  "insert.heading4": () => "#### ",
  "insert.heading5": () => "##### ",
  "insert.heading6": () => "###### ",
  "template.meeting-notes": () => MEETING_NOTES,
};

/** [from, to) bounds of the source line containing `offset`. */
function lineBounds(source: string, offset: number): { from: number; to: number } {
  const from = source.lastIndexOf("\n", offset - 1) + 1;
  let to = source.indexOf("\n", offset);
  if (to === -1) to = source.length;
  return { from, to };
}

function insertCommand(
  facade: EditorFacade,
  name: string,
  args?: Record<string, unknown>,
): unknown {
  const md = INSERT_MD[name]?.(args) ?? "";
  const sel = facade.getSelection();
  if (sel) facade.insertText(md, sel);
  else facade.insertBlock(md);
  return true;
}

function applyBlockCommand(
  facade: EditorFacade,
  name: string,
  args?: Record<string, unknown>,
): unknown {
  const source = facade.getText();
  const sel = facade.getSelection();
  const offset = sel ? sel.from : source.length;
  const { from, to } = lineBounds(source, offset);
  const line = source.slice(from, to);

  const target = BLOCK_PREFIX[name];
  if (target !== undefined) {
    facade.replaceRange(from, to, applyBlockConvert(line, target).text);
    return true;
  }
  if (name === "block.delete") {
    const nextNl = source.indexOf("\n", to);
    const delTo = nextNl === -1 ? (from === 0 ? to : from) : nextNl + 1;
    facade.replaceRange(from, delTo, "");
    return true;
  }
  if (name === "block.duplicate") {
    facade.replaceRange(from, to, `${line}\n${line}`);
    return true;
  }
  if (name === "block.insert-below") {
    facade.insertText("\n", { from: to, to });
    return true;
  }
  return null;
}

/**
 * Dispatches a named command against the facade. Undo/redo are supported
 * directly; unknown ids throw (the app must not silently drop commands).
 */
export function applyEditorCommand(
  facade: EditorFacade,
  name: string,
  args?: Record<string, unknown>,
): unknown {
  if (name === "document.undo" || name === "undo") return facade.undo();
  if (name === "document.redo" || name === "redo") return facade.redo();

  if (name.startsWith("selection.")) {
    const sel = facade.getSelection();
    if (!sel || sel.from >= sel.to) return null; // collapsed → no-op
    const selected = facade.getText().slice(sel.from, sel.to);
    if (!selected) return null;
    const wrapped = wrapSelection(selected, name, args);
    facade.replaceRange(sel.from, sel.to, wrapped);
    facade.setSelection(sel.from, sel.from + wrapped.length);
    return true;
  }

  // Source mode has no block/table-cell context → fall back to inserting a table.
  if (name.startsWith("table.")) return insertCommand(facade, "insert.table", args);

  if (name.startsWith("insert.") || name === "template.meeting-notes") {
    return insertCommand(facade, name, args);
  }

  if (name.startsWith("block.")) return applyBlockCommand(facade, name, args);

  // view.* / document.save → the UI owns these; the editor returns null.
  return null;
}
