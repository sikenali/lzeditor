/**
 * KaTeX 渲染扩展：块级 $$...$$（含同行与多行）与行内 $...$ 渲染成惰性容器
 * （`data-yeli-lazy="katex"`），容器进入视口/聚焦时才调用 `katex.renderToString`
 * 并回填，与 mermaid/echarts 一致，避免编辑（typing）期间反复重算导致抖动。
 *
 * 占位 HTML 只含公式源码（encodeURIComponent 存入 data-yeli-src，无任何可执行
 * 内容），随整篇文档过完 vendor DOMPurify；水合时 `katex.renderToString` 会转义
 * 所有用户输入、只产出受信 markup，故无需二次净化（若再过 vendor 净化，公式的
 * 行内 style 会被剥除）。渲染异常一律降级 `<pre class="yeli-katex-error">`，
 * 绝不把异常抛进编辑事务。
 */

import katex from "katex";
import type {
  MarkdownIt as MarkdownItType,
  StateBlock,
  StateInline,
} from "markdown-it";
import { lazyContainerHtml } from "./lazy-container";

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

export interface KatexInject {
  (
    formula: string,
    options: { displayMode: boolean; throwOnError: boolean },
  ): string;
}

/**
 * 在单个惰性容器宿主上水合 KaTeX：把占位换成 `katex.renderToString` 输出。
 * 成功返回 true（宿主标记 done）；异常降级 `<pre class="yeli-katex-error">`
 * 并返回 false（宿主标记 failed，防重复重试）。
 * `inject` 为测试用假渲染器；缺省用真实 katex。
 */
export function renderKatexLazy(
  host: HTMLElement,
  source: string,
  options: { inject?: KatexInject } = {},
): boolean {
  const display = host.classList.contains("yeli-katex-display");
  try {
    const render = options.inject ?? katex.renderToString;
    const html = render(sanitizeFormula(source), {
      displayMode: display,
      throwOnError: false,
    });
    host.innerHTML = html;
    return true;
  } catch {
    host.innerHTML = `<pre class="yeli-katex-error"><code>${escapeHtml(source)}</code></pre>`;
    return false;
  }
}

/** 公式 → 惰性容器占位 HTML：块级 div / 行内 span，源码存于 data-yeli-src。 */
function katexLazyHtml(formula: string, display: boolean): string {
  return lazyContainerHtml(
    "katex",
    formula,
    display ? "yeli-lazy yeli-katex-display" : "yeli-lazy yeli-katex-inline",
    display ? "div" : "span",
  );
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
    katexLazyHtml(tokens[index]!.content, true);
  md.renderer.rules.yeli_math_inline = (tokens, index) =>
    katexLazyHtml(tokens[index]!.content, false);
}
