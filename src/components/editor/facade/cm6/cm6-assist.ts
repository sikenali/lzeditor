/**
 * CM6 editor assist wiring.
 *
 * The pure helpers (URL/TSV table detection, typewriter delta, autopair) live
 * in `cm6-assist-logic.ts` and are re-exported here; this module binds them to
 * the CodeMirror view:
 *
 *  - typewriter: on selection change, `scrollIntoView({ y: 'center' })` so the
 *    caret stays vertically centered (only when `typewriterMode` is on).
 *  - focus-mode: toggle a `.cm-focus-mode` class on the editor; CSS dims every
 *    line except `.cm-activeLine` (highlightActiveLine() marks it).
 *  - smart-paste: a `domEventHandlers` paste handler that turns a pasted URL
 *    into a link, TSV into a GFM table, or an image into an image block — all
 *    through facade typed transactions, never direct source writes.
 *
 * Auto-pairing is provided by CM6's native `closeBrackets()` (in
 * `cm6-extensions.ts`); it is not reimplemented here.
 */

import { EditorView, keymap } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { EditorFacade } from "../EditorFacade";
import { getEditorFacade } from "../registry";
import {
  autopairBackspace,
  autopairInsertion,
  imageMarkdown,
  isInsideCode,
  linkMarkdown,
  singleUrl,
  tableFromRows,
  tsvRows,
  typewriterScrollDelta,
} from "./cm6-assist-logic";

export {
  autopairBackspace,
  autopairInsertion,
  imageMarkdown,
  isInsideCode,
  linkMarkdown,
  singleUrl,
  tableFromRows,
  tsvRows,
  typewriterScrollDelta,
};

export interface AssistSettings {
  typewriterMode: boolean;
  focusMode: boolean;
}

/**
 * Inserts a markdown block at the current selection via a facade typed
 * transaction. Returns false when the write fails (caller lets the default
 * paste take over rather than silently dropping content).
 */
function insertSmart(
  view: EditorView,
  facade: EditorFacade,
  markdown: string,
): boolean {
  const main = view.state.selection.main;
  try {
    facade.replaceRange(main.from, main.to, markdown);
    return true;
  } catch {
    return false;
  }
}

/**
 * Smart-paste dispatch: URL → link, TSV → table, image → image block.
 * Returns true when the event is handled (and thus should be prevented).
 */
export function handleSmartPaste(
  event: ClipboardEvent,
  view: EditorView,
  facade: EditorFacade,
): boolean {
  const data = event.clipboardData;
  if (!data) return false;
  const files = Array.from(data.files ?? []);
  const text = data.getData("text/plain");
  const main = view.state.selection.main;

  // 1) 图片 → 图片块事务。
  const image = files.find((file) => file.type.startsWith("image/"));
  if (image) {
    const alt = image.name.replace(/\.[^.]+$/u, "") || "粘贴的图片";
    const src = URL.createObjectURL(image);
    return insertSmart(view, facade, imageMarkdown(alt, src));
  }

  // 2) URL → 链接事务（有选区时以其为链接文字并替换选区区间）。
  const url = singleUrl(text);
  if (url) {
    const selected = view.state.sliceDoc(main.from, main.to);
    return insertSmart(view, facade, linkMarkdown(url, selected));
  }

  // 3) TSV → 表格事务。
  const rows = tsvRows(text);
  if (rows) {
    return insertSmart(view, facade, tableFromRows(rows));
  }

  // 4) 默认文本：不拦截，交默认粘贴。
  return false;
}

/** CM6 extension: smart-paste via a paste event handler on the editor. */
export function smartPasteExtension(): Extension {
  return EditorView.domEventHandlers({
    paste: (event, view) => {
      const facade = getEditorFacade();
      if (!facade) return false;
      return handleSmartPaste(event, view, facade);
    },
  });
}

/** Ctrl/⌘+Alt+1..6 标题快捷键（原由 yeli assist 层绑定，现补在 CM6 keymap）。 */
const HEADING_SHORTCUT: Record<string, string> = {
  "1": "block.convert.heading1",
  "2": "block.convert.heading",
  "3": "block.convert.heading3",
  "4": "block.convert.heading4",
  "5": "block.convert.heading5",
  "6": "block.convert.heading6",
};

/** CM6 extension: Mod-Alt-1..6 → block.convert.headingN（源码行级转换）。 */
export function headingShortcutKeymap(): Extension {
  return keymap.of(
    Object.entries(HEADING_SHORTCUT).map(([num, command]) => ({
      key: `Mod-Alt-${num}`,
      run: () => {
        const facade = getEditorFacade();
        if (!facade) return false;
        return facade.execCommand(command) === true;
      },
    })),
  );
}

/**
 * Installs the view-level assist (typewriter + focus-mode). `getSettings` is
 * read at each event so runtime toggles take effect without re-mounting.
 * Returns a cleanup function.
 */
export function installAssist(
  view: EditorView,
  facade: EditorFacade,
  getSettings: () => AssistSettings,
): () => void {
  const applyFocusMode = () => {
    const { focusMode } = getSettings();
    if (focusMode) view.dom.classList.add("cm-focus-mode");
    else view.dom.classList.remove("cm-focus-mode");
  };

  const unsubscribe = facade.onSelectionChange((selection) => {
    const { typewriterMode } = getSettings();
    if (typewriterMode && selection) {
      view.dispatch({
        effects: EditorView.scrollIntoView(selection.from, { y: "center" }),
      });
    }
    applyFocusMode();
  });

  const onFocusOut = () => {
    view.dom.classList.remove("cm-focus-mode");
  };
  view.dom.addEventListener("focusout", onFocusOut);

  return () => {
    unsubscribe();
    view.dom.removeEventListener("focusout", onFocusOut);
    view.dom.classList.remove("cm-focus-mode");
  };
}
