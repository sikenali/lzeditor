import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  rootCtx,
  serializerCtx,
} from "@milkdown/kit/core";
import type { Ctx, MilkdownPlugin } from "@milkdown/kit/ctx";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { listenerCtx } from "@milkdown/kit/plugin/listener";
import { withEditorCore } from "./editor-extensions";
import {
  readSourceBlocks,
  writePreservingSource,
} from "./markdown/source-preserving";
import type { SourceBlocks } from "./markdown/source-parts";
import type { Settings } from "../shim/settings-context";

/**
 * Builds the Milkdown editor as a source-preserving controlled component.
 *
 * The chain comes from `withEditorCore` (Task 6), which ALREADY installs
 * `listener` — this factory must NOT `.use(listener)` again, and must not use
 * `markdownUpdated` (design ruling B3, which loses round-trip fidelity).
 * Instead the listener hooks registered here are picked up by that single
 * installed `listener` plugin:
 *   - `mounted`: pairs the opened file with its doc (`sourceRef`) and applies
 *     the initial `readonly`.
 *   - `updated`: serializes via `writePreservingSource` and reports through
 *     `onChangeRef`, debounced to a frame so a transaction burst (IME,
 *     autopair, a Replace All) serializes once.
 */

/** No disk behind this editor: pasted images aren't stored (design B5). A
 *  no-op plugin keeps the disk-image pipeline switched off; `withEditorCore`
 *  branches on the option's presence. */
const noDiskImages: MilkdownPlugin = () => () => {};

/**
 * Re-derives the opened-file ↔ doc pairing after an external write replaced
 * the document: the blocks of the new `doc` are matched to the new `md` so
 * the next save writes the file's own text for what the user didn't touch.
 * Null when they don't line up block for block.
 */
export function recomputeSource(
  ctx: Ctx,
  md: string,
  doc: ProseNode,
): SourceBlocks | null {
  return readSourceBlocks(ctx, md, doc);
}

/** A debounced emit: the latest doc + ctx awaiting its frame, the flush the
 *  wrapper calls before an external write and on unmount. */
export interface PendingEmit {
  doc: ProseNode | null;
  ctx: Ctx | null;
  pending: boolean;
  flush: () => void;
}

export interface EditorFactoryOptions {
  /** Live settings; only the 8 fields `withEditorCore` reads are typed, the
   *  rest ride along via a controlled cast. */
  settings: { readonly current: Settings };
  /** The document's path (live ref); null in this wrapper (no disk). */
  docPath: { readonly current: string | null };
  /** No-op plugin keeping the disk-image pipeline off (B5). */
  noDiskImages?: MilkdownPlugin;
  /** The latest `onChange`, read at emit time. */
  onChangeRef: { current: (markdown: string) => void };
  /** The latest `readonly`, read by the mounted hook and the toggle effect. */
  readonlyRef: { current: boolean };
  /** The opened-file ↔ doc pairing, written on mount and after a Replace All. */
  sourceRef: { current: SourceBlocks | null };
  /** The last markdown handed to `onChange`, so an external write that just
   *  came out of `onChange` is a no-op (never resets the caret). */
  lastEmittedRef: { current: string | null };
  /** The debounced emit state; `flush` is installed here by `buildEditor`. */
  emitRef: { current: PendingEmit };
}

export function buildEditor(
  root: HTMLElement,
  initialMd: string,
  options: EditorFactoryOptions,
): Editor {
  const emit = options.emitRef.current;

  const serialize = (ctx: Ctx, doc: ProseNode): string => {
    const source = options.sourceRef.current;
    // Blocks don't line up: fall back to the plain serializer rather than
    // writing nothing / losing the doc.
    return source
      ? writePreservingSource(ctx, source, doc)
      : ctx.get(serializerCtx)(doc);
  };

  const flush = (): void => {
    if (!emit.pending) return;
    emit.pending = false;
    const doc = emit.doc;
    const ctx = emit.ctx;
    emit.doc = null;
    emit.ctx = null;
    if (!doc || !ctx) return;
    // The editor may be tearing down on unmount: never let a report throw.
    try {
      const out = serialize(ctx, doc);
      options.lastEmittedRef.current = out;
      options.onChangeRef.current(out);
    } catch {
      /* the editor is gone; the last edit is already on the parent's side
         or was never committed */
    }
  };

  emit.flush = flush;

  const scheduleEmit = (ctx: Ctx, doc: ProseNode): void => {
    emit.doc = doc;
    emit.ctx = ctx;
    if (emit.pending) return;
    emit.pending = true;
    requestAnimationFrame(flush);
  };

  const editor = Editor.make();
  editor.config((ctx) => {
    ctx.set(rootCtx, root);
    ctx.set(defaultValueCtx, initialMd);
    ctx
      .get(listenerCtx)
      .mounted((ctx) => {
        const doc = ctx.get(editorViewCtx).state.doc;
        options.sourceRef.current = readSourceBlocks(ctx, initialMd, doc);
        ctx.get(editorViewCtx).setProps({
          editable: () => !options.readonlyRef.current,
        });
      })
      .updated((ctx, doc) => {
        scheduleEmit(ctx, doc);
      });
  });

  return withEditorCore(editor, {
    settings: options.settings,
    docPath: options.docPath,
    noDiskImages: options.noDiskImages ?? noDiskImages,
  });
}
