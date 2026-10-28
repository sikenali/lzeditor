/**
 * 表格块 ↔ 单元格上下文推导（assist 适配层）。
 *
 * 顶层工具栏的 table.* 结构命令需要块上下文（blockId + 活动单元格坐标），
 * 而 yeli edit-canvas 的表格单元格是 `<textarea data-table-row data-table-column>`
 * （非 .block-content-editable，typewriter 的 caretSourceOffset 映射不到它们）。
 * 因此这里提供两条推导路径：
 * 1. DOM 优先：focusin 记录的活动单元格（点 toolbar 按钮时焦点移出但上下文保留，
 *    见 facade 的 setViewRoot 接线——focusin 只在 root 内冒泡，toolbar 在 root 外
 *    不会触发，因此上下文在点击工具栏按钮时不被清掉）。
 * 2. 源码偏移兜底：光标落在表格块内时，从块源码反推行/列（纯逻辑，可无 DOM 单测）。
 */

import type { TableCellPosition } from "../../../vendor/yeli/editor/table-commands.ts";

export interface TableBlockContext {
  blockId: string;
  activeCell: TableCellPosition;
}

/** 表格单元格（textarea）→ 块上下文。非单元格元素 → null。 */
export function tableContextFromCell(
  element: HTMLElement,
): TableBlockContext | null {
  const cell = element.closest?.<HTMLElement>(
    "[data-table-row][data-table-column]",
  );
  if (!cell) return null;
  const shell = cell.closest<HTMLElement>(
    "[data-block-kind='table'][data-source-block-id]",
  );
  const blockId = shell?.getAttribute("data-source-block-id");
  if (!blockId) return null;
  const row = Number(cell.getAttribute("data-table-row"));
  const column = Number(cell.getAttribute("data-table-column"));
  if (!Number.isSafeInteger(row) || !Number.isSafeInteger(column)) return null;
  return { blockId, activeCell: { row, column } };
}

function isDelimiterLine(content: string): boolean {
  const cells = content.trim().replace(/^\||\|$/gu, "").split("|");
  return (
    cells.length > 0 &&
    cells.every((cell) => /^\s*:?-{3,}:?\s*$/u.test(cell))
  );
}

interface LineSlice {
  content: string;
  start: number;
  end: number;
}

function lineSlices(text: string): LineSlice[] {
  const lines: LineSlice[] = [];
  let start = 0;
  while (start <= text.length) {
    const newline = text.indexOf("\n", start);
    const end = newline === -1 ? text.length : newline;
    lines.push({ content: text.slice(start, end), start, end });
    if (newline === -1) break;
    start = newline + 1;
  }
  return lines;
}

/** 该行是否为「数据行」：非分隔线且非空白行。 */
function isDataLine(lines: LineSlice[], index: number): boolean {
  const content = lines[index]!.content;
  return !isDelimiterLine(content) && content.trim().length > 0;
}

/** 该行未转义 `|` 数。 */
function unescapedPipes(content: string): number {
  let pipes = 0;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i]!;
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "|") pipes += 1;
  }
  return pipes;
}

/** 该行的列数（GFM 行以 `|` 开头收尾时，列数 = 管道数 - 1）。 */
function columnCount(content: string): number {
  const pipes = unescapedPipes(content);
  return content.trimStart().startsWith("|")
    ? Math.max(1, pipes - 1)
    : Math.max(1, pipes);
}

/**
 * 纯逻辑：给定表格块源码（expectedText）与块内偏移，反推行/列。
 * 数据行 0 为表头；列号 = 该行内光标前未转义 `|` 数 - 1（夹到 [0, 列数-1]）。
 * 偏移落在分隔线/块尾等非数据行时归属最近数据行；无法归属 → null。
 */
export function tableCellFromSourceOffset(
  expectedText: string,
  offset: number,
): { row: number; column: number } | null {
  const lines = lineSlices(expectedText);
  if (lines.length === 0) return null;
  let lineIndex = lines.findIndex(
    (line) => offset >= line.start && offset <= line.end,
  );
  if (lineIndex === -1) {
    if (offset < lines[0]!.start) lineIndex = 0;
    else if (offset > lines.at(-1)!.end) lineIndex = lines.length - 1;
    else return null;
  }
  // 分隔线/尾随空行不是数据行：就近归属上一个（否则下一个）数据行。
  // 归属后列号按该行的行首/行尾计，保证落在列范围内。
  let snapped: "up" | "down" | null = null;
  if (!isDataLine(lines, lineIndex)) {
    let up = lineIndex - 1;
    while (up >= 0 && !isDataLine(lines, up)) up -= 1;
    if (up >= 0) {
      lineIndex = up;
      snapped = "up";
    } else {
      let down = lineIndex + 1;
      while (down < lines.length && !isDataLine(lines, down)) down += 1;
      if (down >= lines.length) return null;
      lineIndex = down;
      snapped = "down";
    }
  }

  let row = 0;
  for (let i = 0; i < lineIndex; i += 1) {
    if (isDataLine(lines, i)) row += 1;
  }
  const content = lines[lineIndex]!.content;
  const lineOffset =
    snapped === "up"
      ? content.length
      : snapped === "down"
        ? 0
        : Math.min(offset, lines[lineIndex]!.end) - lines[lineIndex]!.start;
  let pipes = 0;
  for (let i = 0; i < lineOffset; i += 1) {
    const ch = content[i]!;
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "|") pipes += 1;
  }
  const column = Math.min(
    Math.max(0, pipes - 1),
    Math.max(0, columnCount(content) - 1),
  );
  return { row, column };
}
