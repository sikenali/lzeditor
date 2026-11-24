import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { Cm6Settings } from "./cm6-extensions";
import {
  smartQuoteReplacement,
  cornerQuoteTransform,
  cjkAutoSpace,
  fullwidthChar,
  markdownPairInsertion,
  markdownSymbolWrap,
} from "./cm6-input-transform-logic";

/**
 * Builds the CM6 input-handler extension that applies the input-transform
 * settings (smart quotes, corner quotes, CJK auto-spacing, fullwidth symbols,
 * markdown pair completion, markdown symbol formatting).
 *
 * Uses an `inputHandler` so it runs before CodeMirror's default insertion and
 * before closeBrackets' transaction filter — a transformed quote is inserted as
 *-is, and only when no transform applies does the default (auto-pair) take over.
 *
 * Returns `[]` (a no-op compartment) when no transform is enabled.
 */
export function buildInputTransformExtension(settings: Cm6Settings): Extension {
  const enabled =
    settings.smartQuotes ||
    settings.cornerQuotes ||
    settings.autoSpaceCJK ||
    settings.fullwidthSymbols ||
    settings.autoCompleteMarkdownPairs ||
    settings.allowMarkdownSymbols;
  if (!enabled) return [];

  return EditorView.inputHandler.of((view, from, to, text) => {
    if (text.length !== 1) return false;
    const char = text;
    const sel = view.state.selection.main;

    // 符号键设置格式（allowMarkdownSymbols）：有选区时包裹选区。
    if (settings.allowMarkdownSymbols && !sel.empty) {
      const selected = view.state.sliceDoc(sel.from, sel.to);
      const wrapped = markdownSymbolWrap(char, selected);
      if (wrapped) {
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: wrapped },
          selection: { anchor: sel.from + wrapped.length },
        });
        return true;
      }
    }

    if (!sel.empty) return false;

    const source = view.state.doc.toString();
    const offset = from;

    // 直角引号：成对 "" → 「」。
    if (settings.cornerQuotes) {
      const t = cornerQuoteTransform(source, offset, char);
      if (t) {
        view.dispatch({
          changes: { from: t.from, to: t.to, insert: t.insert },
          selection: { anchor: t.caret },
        });
        return true;
      }
    }

    // 智能引号：直引号 → 弯引号。
    if (settings.smartQuotes) {
      const prev = offset > 0 ? view.state.sliceDoc(offset - 1, offset) : null;
      const q = smartQuoteReplacement(char, prev);
      if (q) {
        view.dispatch({
          changes: { from, to, insert: q },
          selection: { anchor: from + q.length },
        });
        return true;
      }
    }

    // 全角符号：, → ，； ; → ；。
    if (settings.fullwidthSymbols) {
      const fw = fullwidthChar(char);
      if (fw) {
        view.dispatch({
          changes: { from, to, insert: fw },
          selection: { anchor: from + fw.length },
        });
        return true;
      }
    }

    // Markdown 符号对自动补完。
    if (settings.autoCompleteMarkdownPairs) {
      const p = markdownPairInsertion(char);
      if (p) {
        view.dispatch({
          changes: { from, to, insert: p.insertion },
          selection: { anchor: from + p.caretDelta },
        });
        return true;
      }
    }

    // 中日韩与英文/数字间自动插空格。
    if (settings.autoSpaceCJK) {
      const sp = cjkAutoSpace(source, offset, char);
      if (sp) {
        const insert = `${sp.before}${char}${sp.after}`;
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        });
        return true;
      }
    }

    return false;
  });
}
