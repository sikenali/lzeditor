import { Plugin, TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

/**
 * The input transforms the settings page promises (符号拼写):
 *  - smart quotes / corner quotes
 *  - fullwidth comma and semicolon
 *  - automatic spacing between CJK and Latin/digits
 *  - symbol keys formatting a selection (`allowMarkdownSymbols`)
 *
 * Code mode implements these in CM6; the WYSIWYG editor previously ignored
 * them, so toggling them looked like a no-op in the default edit mode. This
 * plugin runs the same rules against the live ProseMirror document, before the
 * default insertion, and returns true when it handled the character.
 */

export interface InputTransformSettings {
  smartQuotes?: boolean;
  cornerQuotes?: boolean;
  autoSpaceCJK?: boolean;
  fullwidthSymbols?: boolean;
  allowMarkdownSymbols?: boolean;
}

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const ALNUM_RE = /[A-Za-z0-9]/;
const QUOTE_PAIRS: Record<string, [string, string]> = {
  '"': ["\u300C", "\u300D"],
  "'": ["\u300E", "\u300F"],
};

function smartQuote(char: string, prev: string): string | null {
  if (char !== '"' && char !== "'") return null;
  const opening = !prev || /\s/.test(prev) || /[([{<“‘]/u.test(prev);
  if (char === '"') return opening ? "\u201C" : "\u201D";
  return opening ? "\u2018" : "\u2019";
}

function wrapSelection(
  view: EditorView,
  from: number,
  to: number,
  nodeType: string,
  attrs: Record<string, unknown>,
): boolean {
  const type = view.state.schema.nodes[nodeType];
  if (!type) return false;
  const content = view.state.doc.slice(from, to).content;
  try {
    const node = type.create(attrs, content);
    const tr = view.state.tr.replaceWith(from, to, node);
    tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + content.size));
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

export function createTextInputTransformPlugin(
  settings: () => InputTransformSettings,
) {
  return $prose(
    () =>
      new Plugin({
        props: {
          handleTextInput(view, from, to, text) {
            if (text.length !== 1) return false;
            const s = settings();
            const char = text;
            const { state } = view;
            const sel = state.selection;

            // Symbol keys formatting a selection: * bold, _ italic,
            // ~ strikethrough, ` inline code.
            if (s.allowMarkdownSymbols && !sel.empty) {
              if (char === "*") {
                return wrapSelection(view, from, to, "md_span", { delim: "*", rung: 2 });
              }
              if (char === "_") {
                return wrapSelection(view, from, to, "md_span", { delim: "*", rung: 1 });
              }
              if (char === "~") {
                return wrapSelection(view, from, to, "md_span", { delim: "~", rung: 2 });
              }
              if (char === "`") {
                return wrapSelection(view, from, to, "md_code_span", {});
              }
              return false;
            }

            if (!sel.empty) return false;

            const doc = state.doc;
            const prev =
              from > 0
                ? doc.textBetween(Math.max(0, from - 1), from, "\n", "\n")
                : "";
            const next =
              to < doc.content.size
                ? doc.textBetween(to, Math.min(doc.content.size, to + 1), "\n", "\n")
                : "";

            // Corner quotes: the second identical quote turns the pair into 「」.
            if (s.cornerQuotes && QUOTE_PAIRS[char] && prev === char) {
              const [open, close] = QUOTE_PAIRS[char];
              const insert = open + close;
              const tr = view.state.tr.insertText(insert, from - 1, to);
              tr.setSelection(TextSelection.create(tr.doc, from - 1 + insert.length));
              view.dispatch(tr);
              return true;
            }

            if (s.smartQuotes) {
              const q = smartQuote(char, prev);
              if (q) {
                const tr = view.state.tr.insertText(q, from, to);
                tr.setSelection(TextSelection.create(tr.doc, from + q.length));
                view.dispatch(tr);
                return true;
              }
            }

            if (s.fullwidthSymbols) {
              const fw = char === "," ? "\uFF0C" : char === ";" ? "\uFF1B" : null;
              if (fw) {
                const tr = view.state.tr.insertText(fw, from, to);
                tr.setSelection(TextSelection.create(tr.doc, from + fw.length));
                view.dispatch(tr);
                return true;
              }
            }

            if (s.autoSpaceCJK) {
              let before = "";
              let after = "";
              if (
                (CJK_RE.test(char) && ALNUM_RE.test(prev)) ||
                (ALNUM_RE.test(char) && CJK_RE.test(prev))
              ) {
                before = " ";
              }
              if (
                (CJK_RE.test(char) && ALNUM_RE.test(next)) ||
                (ALNUM_RE.test(char) && CJK_RE.test(next))
              ) {
                after = " ";
              }
              if (before || after) {
                const insert = `${before}${char}${after}`;
                const tr = view.state.tr.insertText(insert, from, to);
                tr.setSelection(TextSelection.create(tr.doc, from + insert.length));
                view.dispatch(tr);
                return true;
              }
            }

            return false;
          },
        },
      }),
  );
}
