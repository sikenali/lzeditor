/**
 * CM6 assist — pure logic (no DOM / no CodeMirror imports).
 *
 * The helpers here were relocated verbatim from the deleted yeli
 * `assist/` layer (smart-paste.ts / typewriter.ts / autopair.ts). They are
 * intentionally side-effect-free so they stay node-testable; the CodeMirror
 * wiring (paste handler, typewriter scroll, focus-mode class) lives in
 * `cm6-assist.ts`.
 */

// ── smart-paste ──────────────────────────────────────────────────────────────

const URL_RE = /^(?:https?:\/\/|mailto:)\S+$/i;

/** 纯逻辑：文本是否为单个 URL（用于链接粘贴）。 */
export function singleUrl(text: string): string | null {
  const trimmed = text.trim();
  return URL_RE.test(trimmed) ? trimmed : null;
}

/** 纯逻辑：TSV 文本 → 行×列二维数组（行宽一致且 ≥2 列才算表格）。 */
export function tsvRows(text: string): string[][] | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (lines.length < 2) return null;
  const rows = lines.map((line) => line.split("\t"));
  const width = rows[0]?.length ?? 0;
  if (width < 2) return null;
  return rows.every((row) => row.length === width) ? rows : null;
}

/** 单元格转义：`|` 前面补 `\`，`\n` → `<br>`（与 GFM 表格序列化约定一致）。 */
function pipeCell(cell: string): string {
  return cell
    .replace(/(\\*)\|/g, (_match, slashes: string) => `${slashes}${slashes}\\|`)
    .replace(/\n/g, "<br>");
}

/** 纯逻辑：二维数组 → GFM 表格 markdown。 */
export function tableFromRows(rows: string[][]): string {
  const width = Math.max(...rows.map((row) => row.length));
  const full = rows.map((row) => [
    ...row,
    ...Array<string>(width - row.length).fill(""),
  ]);
  const line = (row: string[]) => `| ${row.map(pipeCell).join(" | ")} |`;
  return [
    line(full[0] ?? []),
    line(Array<string>(width).fill("---")),
    ...full.slice(1).map(line),
  ].join("\n");
}

/** 纯逻辑：URL 粘贴 → 链接 markdown（选区文字作链接文字，否则用 URL 本身）。 */
export function linkMarkdown(url: string, selected = ""): string {
  const target =
    selected !== "" && !selected.includes("\n") ? selected : url;
  return `[${target}](${url})`;
}

/** 纯逻辑：图片块 markdown。 */
export function imageMarkdown(alt = "粘贴的图片", src = ""): string {
  return `![${alt}](${src})`;
}

// ── typewriter ───────────────────────────────────────────────────────────────

/**
 * 纯逻辑：给定光标顶边、容器顶边与高度，返回应追加的 scrollTop 增量。
 * 光标已在可视范围内 → 0（不打扰）；否则滚到 anchorRatio 高度处。
 */
export function typewriterScrollDelta(
  caretTop: number,
  containerTop: number,
  containerHeight: number,
  anchorRatio = 0.4,
): number {
  const containerBottom = containerTop + containerHeight;
  if (caretTop >= containerTop && caretTop <= containerBottom) return 0;
  const anchor = containerTop + anchorRatio * containerHeight;
  return Math.round(anchor - caretTop);
}

// ── autopair ─────────────────────────────────────────────────────────────────

/** 开符 → 闭符。`*` 映射到自身，用于粗体 `**` 成对。 */
const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  '"': '"',
  "*": "*",
};

export interface AutopairInsertion {
  insertion: string;
  caretDelta: number;
}

/**
 * 判断源码 offset 是否位于行内代码 span 或围栏代码块内。
 * 在这些上下文里关闭自动配对，避免破坏代码（纯扫描，无依赖）。
 */
export function isInsideCode(source: string, offset: number): boolean {
  let inFence = false;
  let fenceLen = 0;
  let inSpan = false;
  let spanLen = 0;
  let lineStart = true;
  let i = 0;
  while (i < offset) {
    const ch = source[i]!;
    if (ch === "\n") {
      lineStart = true;
      i += 1;
      continue;
    }
    if (ch !== "`") {
      lineStart = false;
      i += 1;
      continue;
    }
    let run = 0;
    while (source[i + run] === "`") run += 1;
    if (inFence) {
      if (lineStart && run >= fenceLen) {
        inFence = false;
        fenceLen = 0;
      }
      lineStart = false;
      i += run;
      continue;
    }
    if (lineStart && run >= 3) {
      inFence = true;
      fenceLen = run;
      lineStart = false;
      i += run;
      continue;
    }
    if (!inSpan) {
      inSpan = true;
      spanLen = run;
    } else if (run === spanLen) {
      inSpan = false;
    }
    lineStart = false;
    i += run;
  }
  return inFence || inSpan;
}

/**
 * 纯逻辑：用户键入 `char` 于源码 offset 时，计算应插入的成对文本。
 * 返回 null 表示不该配对（非配对键、位于代码内、下一字符已是闭符）。
 */
export function autopairInsertion(
  source: string,
  offset: number,
  char: string,
): AutopairInsertion | null {
  const close = PAIRS[char];
  if (!close) return null;
  if (offset < 0 || offset > source.length) return null;
  if (isInsideCode(source, offset)) return null;
  if (source[offset] === close) return null;
  return { insertion: char + close, caretDelta: 1 };
}

/**
 * 纯逻辑：Backspace 于源码 offset，若两侧正好构成空配对则整对删除。
 * 返回 { from, to } 为要删除的源码区间，否则 null。
 */
export function autopairBackspace(
  source: string,
  offset: number,
): { from: number; to: number } | null {
  if (offset <= 0 || offset >= source.length) return null;
  const left = source[offset - 1]!;
  const right = source[offset]!;
  if (PAIRS[left] === right) return { from: offset - 1, to: offset + 1 };
  return null;
}
