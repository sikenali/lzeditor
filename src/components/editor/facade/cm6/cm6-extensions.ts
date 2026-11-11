import { EditorView, keymap, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from "@codemirror/view";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  defaultHighlightStyle,
  indentOnInput,
  indentUnit,
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
import { buildInputTransformExtension } from "./cm6-input-transform";

/**
 * Editor settings that the CM6 source editor reads (settings panel switches).
 *
 * Previously these were declared in the settings store but never consumed —
 * the editor hardcoded every extension, so toggling the switches did nothing.
 * Each setting now maps to a CM6 extension wrapped in a {@link Compartment},
 * so toggles take effect at runtime without re-mounting the editor.
 */
export interface Cm6Settings {
  softWrap?: boolean;
  currentLine?: boolean;
  autoPair?: boolean;
  tabSize?: number;
  showLineNumbers?: boolean;
  enableSpellCheck?: boolean;
  spellCheckLang?: string;
  smartQuotes?: boolean;
  cornerQuotes?: boolean;
  autoSpaceCJK?: boolean;
  fullwidthSymbols?: boolean;
  autoCompleteMarkdownPairs?: boolean;
  allowMarkdownSymbols?: boolean;
}

/**
 * The core extension set that never changes: history, markdown language
 * highlighting, autocompletion, keymap, smart-paste and heading shortcuts.
 *
 * Settings-dependent extensions (wrapping, active line, auto-pair, tab size,
 * line numbers, spellcheck, input transforms) are provided by
 * {@link createCm6Settings} so they can be reconfigured at runtime.
 */
export function buildCM6Core(): Extension[] {
  return [
    history(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle),
    markdown({ base: markdownLanguage }),
    autocompletion(),
    smartPasteExtension(),
    headingShortcutKeymap(),
    backspacePairKeymap(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
  ];
}

/**
 * Manages the settings-dependent extensions through {@link Compartment}s so a
 * settings toggle reconfigures the live editor instead of re-mounting it.
 *
 * `build(settings)` returns the initial extensions; `reconfigure(view, settings)`
 * dispatches compartment effects when settings change.
 */
export function createCm6Settings() {
  const softWrap = new Compartment();
  const currentLine = new Compartment();
  const autoPair = new Compartment();
  const tabSize = new Compartment();
  const lineNumbersExt = new Compartment();
  const spellcheck = new Compartment();
  const inputTransform = new Compartment();

  const one = (s: Cm6Settings) => {
    const ts = s.tabSize ?? 2;
    return {
      softWrap: s.softWrap !== false ? EditorView.lineWrapping : [],
      currentLine: s.currentLine !== false ? highlightActiveLine() : [],
      autoPair: s.autoPair !== false ? [closeBrackets(), keymap.of(closeBracketsKeymap)] : [],
      tabSize: [
        EditorState.tabSize.of(ts),
        indentUnit.of(" ".repeat(ts)),
      ] as Extension[],
      lineNumbers: s.showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : [],
      spellcheck: EditorView.contentAttributes.of({
        spellcheck: s.enableSpellCheck !== false ? "true" : "false",
        lang: s.spellCheckLang || "zh-CN",
      }),
      inputTransform: buildInputTransformExtension(s),
    } as const;
  };

  const compartments = [
    ["softWrap", softWrap],
    ["currentLine", currentLine],
    ["autoPair", autoPair],
    ["tabSize", tabSize],
    ["lineNumbers", lineNumbersExt],
    ["spellcheck", spellcheck],
    ["inputTransform", inputTransform],
  ] as const;

  return {
    build(settings: Cm6Settings): Extension[] {
      const o = one(settings);
      return [
        softWrap.of(o.softWrap),
        currentLine.of(o.currentLine),
        autoPair.of(o.autoPair),
        tabSize.of(o.tabSize),
        lineNumbersExt.of(o.lineNumbers),
        spellcheck.of(o.spellcheck),
        inputTransform.of(o.inputTransform),
      ];
    },
    reconfigure(view: EditorView, settings: Cm6Settings): void {
      const o = one(settings);
      view.dispatch({
        effects: [
          softWrap.reconfigure(o.softWrap),
          currentLine.reconfigure(o.currentLine),
          autoPair.reconfigure(o.autoPair),
          tabSize.reconfigure(o.tabSize),
          lineNumbersExt.reconfigure(o.lineNumbers),
          spellcheck.reconfigure(o.spellcheck),
          inputTransform.reconfigure(o.inputTransform),
        ],
      });
    },
    // 供测试/自省用：各 Compartment 的 key 顺序与 one() 字段一致
    keys: compartments.map(([k]) => k),
  };
}

/**
 * Builds the complete CM6 extension set, including settings-dependent
 * extensions. Creates a fresh {@link Compartment} set each call, so it is only
 * suitable for one-shot construction; the live editor uses
 * {@link createCm6Settings} so toggles can reconfigure at runtime.
 */
export function buildCM6Extensions(settings?: Cm6Settings): Extension[] {
  return [...buildCM6Core(), ...createCm6Settings().build(settings ?? {})];
}
