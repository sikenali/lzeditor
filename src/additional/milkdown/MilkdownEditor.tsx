import { useEffect, useRef } from "react";
import { editorViewCtx } from "@milkdown/kit/core";
import { getMarkdown, replaceAll } from "@milkdown/kit/utils";
import { useEditor, Milkdown, MilkdownProvider } from "@milkdown/react";
import {
  buildEditor,
  recomputeSource,
} from "./textus/editor/editor-factory";
import type { PendingEmit } from "./textus/editor/editor-factory";
import { resolveExternalWrite } from "./textus/editor/source-control";
import type { SourceBlocks } from "./textus/editor/markdown/source-parts";
import type { Settings } from "./textus/shim/settings-context";
import "./milkdown.css";

/**
 * lzeditor's WYSIWYG editor core: the vendored Textus editor chain (Task 6),
 * wired as a source-preserving controlled component (B3).
 *
 * `md` is canonical from the outside. Every committed edit flows out through
 * `onChange` as the editor's source-preserving markdown: untouched blocks are
 * written back byte-for-byte as the document was opened, only the changed ones
 * are serialized. An external `md` change is pushed in only when it differs
 * from what the editor already holds — an edit that already came out of
 * `onChange` is a no-op and never resets the caret — and after a push the
 * opened-file pairing is re-derived from the new `md` so the next save keeps
 * its own text for the blocks the user didn't touch.
 */

export interface MilkdownEditorProps {
  /** The canonical markdown source to display. */
  md: string;
  /** Emitted with markdown after every committed edit. */
  onChange: (markdown: string) => void;
  /** Read-only: content is shown but not editable. */
  readonly?: boolean;
}

/** The only settings fields the vendored `withEditorCore` chain reads; the
 *  rest of `Settings` (~80 fields) rides along via the cast below. */
const editorSettings = {
  language: "en",
  autoCloseBrackets: false,
  autoCloseMarks: false,
  codeLineNumbers: false,
  colorSwatches: "off",
  diagramEngine: "mermaid",
  enableMath: false,
  enableMermaid: false,
} as Settings;

function MilkdownEditorInner({
  md,
  onChange,
  readonly = false,
}: MilkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // The initial markdown captured at first mount; the editor factory runs once.
  const initialMd = useRef(md).current;

  const settingsRef = useRef(editorSettings);
  // This wrapper has no disk behind it: images paste as links, not files.
  const docPathRef = useRef<string | null>(null);
  const readonlyRef = useRef(readonly);
  readonlyRef.current = readonly;
  const sourceRef = useRef<SourceBlocks | null>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const emitRef = useRef<PendingEmit>({
    doc: null,
    ctx: null,
    pending: false,
    flush: () => {},
  });

  const { get } = useEditor(
    (root) =>
      buildEditor(root, initialMd, {
        settings: settingsRef,
        docPath: docPathRef,
        onChangeRef,
        readonlyRef,
        sourceRef,
        lastEmittedRef,
        emitRef,
      }),
    // The factory captures the first render's refs; they are stable. Only the
    // mounted hook cares about `readonly`, and we re-apply it below on change.
    [],
  );

  // External source changes (document switch, import, programmatic write).
  // Only push when the editor's own markdown differs, so an edit that already
  // flowed out of onChange is a no-op and never resets the caret. The pending
  // debounced edit is flushed first so the comparison sees the latest content.
  useEffect(() => {
    const editor = get();
    if (!editor) return;
    emitRef.current.flush();
    // The last value we handed to onChange is what the parent echoes back;
    // before anything has been emitted, fall back to the editor's own parse.
    const current =
      lastEmittedRef.current ?? editor.action(getMarkdown());
    if (!resolveExternalWrite(current, md).replace) return;
    editor.action(replaceAll(md));
    editor.action((ctx) => {
      const doc = ctx.get(editorViewCtx).state.doc;
      sourceRef.current = recomputeSource(ctx, md, doc);
    });
  }, [md, get]);

  // Read-only toggles: the mounted listener applied the first value; re-apply.
  useEffect(() => {
    const editor = get();
    if (!editor) return;
    editor.action((ctx) => {
      ctx.get(editorViewCtx).setProps({ editable: () => !readonly });
    });
  }, [readonly, get]);

  // Flush a debounced edit on unmount so the last keystroke isn't lost.
  useEffect(() => {
    return () => {
      emitRef.current.flush();
    };
  }, []);

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
