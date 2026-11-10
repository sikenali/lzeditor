import { EditorView, keymap, highlightActiveLine } from "@codemirror/view";
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
import { smartPasteExtension, headingShortcutKeymap, backspacePairKeymap } from "./cm6-assist";

/**
 * Builds the CodeMirror 6 extension set for the source editor.
 *
 * The read/preview renderer lives in `src/utils/markdown/` and is independent;
 * this only configures the write side (the source editor): history, markdown
 * language highlighting, auto-pairing, autocompletion, keymap, line wrapping,
 * active-line marking (focus mode) and smart-paste.
 */
export function buildCM6Extensions(): Extension[] {
  return [
    history(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle),
    markdown({ base: markdownLanguage }),
    closeBrackets(),
    autocompletion(),
    highlightActiveLine(),
    EditorView.lineWrapping,
    smartPasteExtension(),
    headingShortcutKeymap(),
    backspacePairKeymap(),
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
