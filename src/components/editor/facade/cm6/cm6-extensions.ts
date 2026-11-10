import { EditorView, keymap } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { searchKeymap } from "@codemirror/search";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";

/**
 * Builds the CodeMirror 6 extension set for the source editor.
 *
 * The read/preview renderer lives in `src/utils/markdown/` and is independent;
 * this only configures the write side (the source editor): history, markdown
 * language highlighting, auto-pairing, autocompletion, keymap and line wrapping.
 */
export function buildCM6Extensions(_options: { dark?: boolean } = {}): Extension[] {
  return [
    history(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle),
    markdown({ base: markdownLanguage }),
    closeBrackets(),
    autocompletion(),
    EditorView.lineWrapping,
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...closeBracketsKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
  ];
}
