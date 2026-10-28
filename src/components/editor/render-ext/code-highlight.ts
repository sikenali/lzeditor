/**
 * 代码高亮渲染扩展：把 ```lang 代码块用 highlight.js 高亮（与旧 render.ts
 * 同一套资产与别名）。非语言/纯文本块退化为转义源码。不抛异常：highlight
 * 失败一律回退 escapeHtml，保证渲染边界稳定。
 */

import hljs from "highlight.js";
import type { Token } from "markdown-it";

const HLJS_ALIAS: Record<string, string> = {
  py3: "python",
  python3: "python",
  yml: "yaml",
  rb: "ruby",
  golang: "go",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  cmd: "bash",
  ts: "typescript",
  tsx: "typescript",
  jsx: "javascript",
};

const HLJS_PLAIN = new Set(["", "text", "txt", "md", "markdown", "none"]);

function normalizeLang(lang: string): string {
  return HLJS_ALIAS[lang.toLocaleLowerCase()] ?? lang.toLocaleLowerCase();
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function highlightFence(tokens: Token[], index: number): string {
  const token = tokens[index]!;
  const rawLang = token.info.trim().split(/\s+/u)[0] ?? "";
  const lang = normalizeLang(rawLang);
  const code = token.content.replace(/\n$/u, "");
  let inner: string;
  if (code && !HLJS_PLAIN.has(lang) && hljs.getLanguage(lang)) {
    try {
      inner = hljs.highlight(code, {
        language: lang,
        ignoreIllegals: true,
      }).value;
    } catch {
      inner = escapeHtml(code);
    }
  } else {
    inner = escapeHtml(code);
  }
  return `<pre><code class="hljs${rawLang ? ` language-${rawLang}` : ""}">${inner}</code></pre>\n`;
}
