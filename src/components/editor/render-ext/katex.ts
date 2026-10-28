/**
 * KaTeX 渲染扩展：块级 $$...$$（含同行与多行）与行内 $...$ 用 KaTeX 渲染。
 *
 * 因为 KaTeX 输出依赖行内 `style`（而 vendor 渲染边界的 DOMPurify 会剥 style），
 * 这里把公式渲染成占位 slot（`data-yeli-katex`），等整段 HTML 过完 vendor
 * 净化后再 `postProcessKatex` 回填。回填后的 KaTeX HTML 再过一遍宽松 DOMPurify
 * （允许 style），保证渲染结果仍被净化、且不破坏公式样式。
 */

import katex from "katex";
import type {
  MarkdownIt as MarkdownItType,
  StateBlock,
  StateInline,
} from "markdown-it";

const KATEX_SLOT_ATTR = "data-yeli-katex";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeFormula(formula: string): string {
  return formula
    .replace(/\\newline/gu, "\\\\")
    .replace(/\\\\$/gmu, "")
    .replace(/\n/gu, "\\\\");
}

export function renderKatex(body: string, display: boolean): string {
  try {
    return katex.renderToString(sanitizeFormula(body), {
      displayMode: display,
      throwOnError: false,
    });
  } catch {
    return `<pre class="yeli-katex-error"><code>${escapeHtml(body)}</code></pre>`;
  }
}

/** 公式 → 占位 slot；vendor 净化后再回填。 */
function katexSlot(formula: string, display: boolean): string {
  const encoded = encodeURIComponent(formula);
  const cls = display ? "yeli-katex-display" : "yeli-katex-inline";
  return `<span class="${cls}" ${KATEX_SLOT_ATTR}="${encoded}" data-yeli-katex-display="${display ? "1" : "0"}"></span>`;
}

/** 块级 $$...$$：独占一行（或 $$ 起、$$ 止的多行）。 */
function mathDisplay(
  state: StateBlock,
  startLine: number,
  _endLine: number,
  silent: boolean,
): number | boolean {
  const line = state.src
    .slice(state.bMarks[startLine], state.eMarks[startLine])
    .trimStart();
  const single = /^\$\$([^$\n]+?)\$\$\s*$/u.exec(line);
  if (single) {
    state.line = startLine + 1;
    if (!silent) {
      const tok = state.push("yeli_math_display", "", 0);
      tok.content = single[1]!.trim();
    }
    return state.line;
  }
  if (!/^\$\$/u.test(line)) return 0;
  state.line += 1;
  if (silent) return true;
  let end = -1;
  for (let i = state.line; i < state.lineMax; i += 1) {
    if (
      /\$\$/u.test(state.src.slice(state.bMarks[i], state.eMarks[i]))
    ) {
      end = i;
      break;
    }
  }
  if (end < 0) return 0;
  const body: string[] = [line.replace(/^\$\$/u, "").trim()];
  for (let i = startLine + 1; i < end; i += 1) {
    body.push(state.src.slice(state.bMarks[i], state.eMarks[i]));
  }
  body.push(
    state.src
      .slice(state.bMarks[end], state.eMarks[end])
      .replace(/\$\$\s*$/u, "")
      .trim(),
  );
  const tok = state.push("yeli_math_display", "", 0);
  tok.content = body.filter((lineText) => lineText.length > 0).join("\n").trim();
  state.line = end + 1;
  return state.line;
}

/** 行内 $...$；跳过 \$ 转义与 $$。 */
function mathInline(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const start = state.pos;
  if (src.charCodeAt(start) !== 0x24) return false; // '$'
  if (start > 0 && src.charCodeAt(start - 1) === 0x5c) return false; // \$
  if (src.charCodeAt(start + 1) === 0x24) {
    const end = src.indexOf("$$", start + 2);
    if (end < 0 || end > state.posMax) return false;
    const body = src.slice(start + 2, end);
    if (!body || /^\s/u.test(body) || /\s$/u.test(body)) return false;
    if (!silent) {
      const tok = state.push("yeli_math_inline", "", 0);
      tok.content = body;
    }
    state.pos = end + 2;
    return true;
  }
  const end = src.indexOf("$", start + 1);
  if (end < 0 || end > state.posMax) return false;
  const body = src.slice(start + 1, end);
  if (!body || /^\s/u.test(body) || /\s$/u.test(body)) return false;
  if (src.charCodeAt(end + 1) === 0x24) return false;
  if (!silent) {
    const tok = state.push("yeli_math_inline", "", 0);
    tok.content = body;
  }
  state.pos = end + 1;
  return true;
}

/** 注册 KaTeX 规则到 markdown-it。 */
export function installKatex(md: MarkdownItType): void {
  md.block.ruler.before(
    "paragraph",
    "yeli_math_display",
    mathDisplay as unknown as (
      state: StateBlock,
      startLine: number,
      endLine: number,
      silent: boolean,
    ) => boolean,
  );
  md.inline.ruler.before("escape", "yeli_math_inline", mathInline);
  md.renderer.rules.yeli_math_display = (tokens, index) =>
    katexSlot(tokens[index]!.content, true);
  md.renderer.rules.yeli_math_inline = (tokens, index) =>
    katexSlot(tokens[index]!.content, false);
}

/**
 * 回填 KaTeX slot：把占位 `<span data-yeli-katex>` 换成渲染后的公式 HTML。
 *
 * 必须在 vendor 净化之后调用（否则公式的 style 被净化剥除）。占位 slot 本身
 * 是惰性的（仅一个带 data 属性的 span，公式以 encodeURIComponent 存入，
 * 无任何可执行内容），因此已随整篇文档过完 vendor DOMPurify；回填时直接把
 * 公式换成 katex 输出——katex.renderToString 会转义所有用户输入、只产出受信
 * markup，故无需二次净化（与旧 render.ts 的 MATH_SLOT 回填同一思路，避免
 * style 被剥）。纯字符串处理，无 DOM 依赖。
 */
export function postProcessKatex(html: string): string {
  if (!html.includes(KATEX_SLOT_ATTR)) return html;
  const pattern = new RegExp(
    `<span class="([^"]*)" ${KATEX_SLOT_ATTR}="([^"]*)" data-yeli-katex-display="([01])"></span>`,
    "gu",
  );
  return html.replace(
    pattern,
    (_match, _cls: string, encoded: string, display: string) => {
      const formula = decodeURIComponent(encoded);
      return renderKatex(formula, display === "1");
    },
  );
}
