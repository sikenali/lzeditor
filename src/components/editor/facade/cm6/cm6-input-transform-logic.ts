/**
 * CM6 input-transform pure logic (no DOM / no CodeMirror imports).
 *
 * Each transform maps a typed character (plus surrounding context) to the text
 * that should replace it. The CM6 wiring lives in `cm6-input-transform.ts`;
 * these helpers stay side-effect-free so they are node-testable.
 */

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const ALNUM_RE = /[A-Za-z0-9]/;

/** 智能引号：直引号 → 弯引号，按前一个字符判断开/闭。 */
export function smartQuoteReplacement(char: string, prev: string | null): string | null {
  if (char !== '"' && char !== "'") return null;
  const opening =
    !prev || /\s/.test(prev) || /[([{<“‘]/u.test(prev);
  if (char === '"') return opening ? "\u201C" : "\u201D";
  return opening ? "\u2018" : "\u2019";
}

export interface CornerQuoteTransform {
  from: number;
  to: number;
  insert: string;
  caret: number;
}

/**
 * 直角引号：键入第二个直引号（与前一个相同）时把这一对换成「」/『』。
 * 返回替换区间（覆盖前一个引号）与插入文本、光标落点；否则 null。
 */
export function cornerQuoteTransform(
  source: string,
  offset: number,
  char: string,
): CornerQuoteTransform | null {
  const pairs: Record<string, [string, string]> = {
    '"': ["\u300C", "\u300D"], // 「 」
    "'": ["\u300E", "\u300F"], // 『 』
  };
  const pair = pairs[char];
  if (!pair) return null;
  if (source[offset - 1] !== char) return null;
  return { from: offset - 1, to: offset, insert: pair[0] + pair[1], caret: offset + 1 };
}

export interface CjkAutoSpace {
  before: string;
  after: string;
}

/**
 * 中日韩与英文/数字间自动插空格：输入 char 时，若它与相邻字符分属 CJK/拉丁，
 * 返回需要补的空格（前/后）；否则 null。
 */
export function cjkAutoSpace(
  source: string,
  offset: number,
  char: string,
): CjkAutoSpace | null {
  const prev = source[offset - 1];
  const next = source[offset];
  let before = "";
  let after = "";
  if ((CJK_RE.test(char) && prev && ALNUM_RE.test(prev)) ||
      (ALNUM_RE.test(char) && prev && CJK_RE.test(prev))) {
    before = " ";
  }
  if ((CJK_RE.test(char) && next && ALNUM_RE.test(next)) ||
      (ALNUM_RE.test(char) && next && CJK_RE.test(next))) {
    after = " ";
  }
  return before || after ? { before, after } : null;
}

/** 全角符号：半角 , ; → 全角 ，；。 */
export function fullwidthChar(char: string): string | null {
  if (char === ",") return "\uFF0C"; // ，
  if (char === ";") return "\uFF1B"; // ；
  return null;
}

/** 自动补完 Markdown 符号对：键入开符时返回应插入的成对文本（含光标增量）。 */
export function markdownPairInsertion(char: string): { insertion: string; caretDelta: number } | null {
  const pairs: Record<string, [string, number]> = {
    "*": ["**", 1],
    "_": ["__", 1],
    "~": ["~~", 1],
    "`": ["`", 1],
    "\u300C": ["\u300C\u300D", 1], // 「」
    "\u300E": ["\u300E\u300F", 1], // 『』
  };
  const pair = pairs[char];
  if (!pair) return null;
  return { insertion: pair[0], caretDelta: pair[1] };
}

/** 符号键对选中文本设置格式（allowMarkdownSymbols）：* 加粗、_ 斜体、` 代码、~ 删除线。 */
export function markdownSymbolWrap(char: string, selected: string): string | null {
  if (!selected) return null;
  switch (char) {
    case "*": return `**${selected}**`;
    case "_": return `_${selected}_`;
    case "~": return `~~${selected}~~`;
    case "`": return `\`${selected}\``;
    default: return null;
  }
}
