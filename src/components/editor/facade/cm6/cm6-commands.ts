import type { EditorFacade } from "../EditorFacade";
import { applySourceCommand } from "../source-commands";

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
  "insert.heading2": () => "## ",
  "insert.section": () => "## ",
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

/** 插入类标题/列表/引用：改写当前行前缀（与 Milkdown 的 convertBlock 对齐），
 *  空行则直接得到前缀，不会把 `# `/`- ` 插到行中间。 */
const INSERT_BLOCK_PREFIX: Record<string, string> = {
  "insert.heading1": "# ",
  "insert.heading2": "## ",
  "insert.section": "## ",
  "insert.heading3": "### ",
  "insert.heading4": "#### ",
  "insert.heading5": "##### ",
  "insert.heading6": "###### ",
  "insert.paragraph": "",
  "insert.quote": "> ",
  "insert.bullet-list": "- ",
  "insert.numbered-list": "1. ",
  "insert.task": "- [ ] ",
};

/** 块级插入：必须落在行首，否则 `---` / 表格 / 代码围栏会被当成行内文本。 */
const BLOCK_LEVEL_INSERT = new Set(["insert.divider", "insert.code-block", "insert.table"]);

function insertBlockPrefix(facade: EditorFacade, name: string): boolean {
  const source = facade.getText();
  const sel = facade.getSelection();
  const offset = sel ? sel.from : source.length;
  const { from, to } = lineBounds(source, offset);
  const line = source.slice(from, to);
  facade.replaceRange(from, to, applyBlockConvert(line, INSERT_BLOCK_PREFIX[name]).text);
  return true;
}

function insertCommand(
  facade: EditorFacade,
  name: string,
  args?: Record<string, unknown>,
): unknown {
  const md = INSERT_MD[name]?.(args) ?? "";
  const sel = facade.getSelection();
  if (sel && sel.from < sel.to) {
    facade.insertText(md, sel);
    return true;
  }
  if (BLOCK_LEVEL_INSERT.has(name)) {
    const src = facade.getText();
    const at = sel ? sel.from : src.length;
    const lineStart = src.lastIndexOf("\n", at - 1) + 1;
    const prefix = at > lineStart && src.slice(lineStart, at).trim() !== "" ? "\n" : "";
    facade.insertText(prefix + md, { from: at, to: at });
    return true;
  }
  if (sel) facade.insertText(md, sel);
  else facade.insertBlock(md);
  return true;
}

function applyBlockCommand(
  facade: EditorFacade,
  name: string,
  _args?: Record<string, unknown>,
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
    let delFrom = from;
    let delTo = to;
    if (nextNl === -1) {
      // 最后一行：连同上一行末尾的换行一起删（from>0 时），否则只删本行。
      if (from > 0) delFrom = from - 1;
    } else {
      delTo = nextNl + 1;
    }
    facade.replaceRange(delFrom, delTo, "");
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

  // Sup/sub, introduction, TOC and footnote are pure Markdown-source edits
  // shared with the Milkdown facade (see source-commands).
  const sourceResult = applySourceCommand(facade, name);
  if (sourceResult !== null) return sourceResult;

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

  // Heading/list/quote inserts convert the current line in source mode.
  if (name in INSERT_BLOCK_PREFIX) return insertBlockPrefix(facade, name);

  if (name.startsWith("insert.") || name === "template.meeting-notes") {
    return insertCommand(facade, name, args);
  }

  if (name.startsWith("block.")) return applyBlockCommand(facade, name, args);

  // view.* / document.save → the UI owns these; the editor returns null.
  return null;
}
