/** The IPC bridge namespaces, no-op shim: every call resolves to a no-op
 *  promise so awaited and .then'd calls behave. A real bridge replaces these
 *  when the editor core is wired to the host. */

const noop = (..._args: unknown[]): Promise<unknown> => Promise.resolve(undefined);

/** A namespace proxy that answers any method with a resolved no-op promise.
 *  The typed shape names the methods the editor core reads, so call sites
 *  infer real types; the proxy still answers any other method at runtime. */
function namespace<T extends object>(): T {
  return new Proxy({} as T, { get: () => noop });
}

/** The note a wikilink or a hover names, as the backend reports it. */
export interface ResolvedNoteLink {
  exists: boolean;
  path: string;
}

export const clipboardIpc = namespace<{
  text: () => Promise<string>;
}>();

export const fs = namespace<{
  resolveNoteLink: (
    ..._args: unknown[]
  ) => Promise<ResolvedNoteLink | null | undefined>;
  fileMtimeMs: (..._args: unknown[]) => Promise<number | null>;
  documentLinkRoot: (..._args: unknown[]) => Promise<string | null>;
  createFolder: (..._args: unknown[]) => Promise<void>;
  createDocument: (..._args: unknown[]) => Promise<void>;
  uploadImage: (..._args: unknown[]) => Promise<{ src: string }>;
  savePastedImage: (
    ..._args: unknown[]
  ) => Promise<{ src: string; embed?: string | null }>;
  readBinaryFileBase64: (..._args: unknown[]) => Promise<string>;
  openImageFileDialog: (..._args: unknown[]) => Promise<string | null>;
}>();

export const webAssets = namespace<{
  get: (..._args: unknown[]) => Promise<string>;
}>();

export const exportDoc = namespace<{
  revealInDir: (..._args: unknown[]) => Promise<void>;
}>();

export const links = namespace<{
  openWebLink: (..._args: unknown[]) => Promise<void>;
}>();

export const ai = namespace<Record<string, (..._args: unknown[]) => Promise<unknown>>>();
export const storage = namespace<Record<string, (..._args: unknown[]) => Promise<unknown>>>();
