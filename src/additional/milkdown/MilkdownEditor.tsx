import { useEffect, useRef } from "react";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
} from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { getMarkdown, replaceAll } from "@milkdown/kit/utils";
import { useEditor, Milkdown, MilkdownProvider } from "@milkdown/react";
import "./milkdown.css";

/**
 * lzeditor's WYSIWYG editor core: a Milkdown 7 (ProseMirror) canvas with the
 * CommonMark + GFM presets, ported from Textus. Coexists with the CodeMirror
 * source editor: both read/write the same canonical markdown `md`.
 *
 * The editor is controlled by `md` from the outside. Every committed edit
 * flows out through `onChange` (markdown, from the listener); an external
 * `md` change is pushed in only when the editor's own markdown differs, so an
 * edit that already came out of `onChange` never resets the caret.
 */
export interface MilkdownEditorProps {
  /** The canonical markdown source to display. */
  md: string;
  /** Emitted with markdown after every committed edit. */
  onChange: (markdown: string) => void;
  /** Read-only: content is shown but not editable. */
  readonly?: boolean;
}

function MilkdownEditorInner({
  md,
  onChange,
  readonly = false,
}: MilkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // The initial markdown captured at first mount; the editor factory runs once.
  const initialMd = useRef(md).current;

  const { get } = useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, initialMd);
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            onChangeRef.current(markdown);
          });
          ctx.get(listenerCtx).mounted((_ctx) => {
            _ctx.get(editorViewCtx).setProps({ editable: () => !readonly });
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(listener),
    // The factory captures the first render's `readonly`; only the mounted
    // listener cares, and we re-apply it below on change too.
    [],
  );

  // External source changes (document switch, import, programmatic write).
  // Only push when the editor's own markdown differs, so an edit that already
  // flowed out of onChange is a no-op and never resets the caret.
  useEffect(() => {
    const editor = get();
    if (!editor) return;
    const current = editor.action(getMarkdown());
    if (current !== md) editor.action(replaceAll(md));
  }, [md, get]);

  // Read-only toggles: the mounted listener applied the first value; re-apply.
  useEffect(() => {
    const editor = get();
    if (!editor) return;
    editor.action((ctx) => {
      ctx.get(editorViewCtx).setProps({ editable: () => !readonly });
    });
  }, [readonly, get]);

  return <Milkdown />;
}

/** The Milkdown 7 WYSIWYG editor, wrapped in its provider. */
export function MilkdownEditor(props: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner {...props} />
    </MilkdownProvider>
  );
}
