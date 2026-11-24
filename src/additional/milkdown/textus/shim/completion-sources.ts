/** Where the `/` panel's rows come from, no-op shim: no sources, no rows.
 *  The vendored core registers its completion sources elsewhere; the real
 *  plugin system replaces this when the editor core is wired in. */

export interface PanelItem {
  label: string;
  insert: string;
  detail?: string;
  icon?: string;
  keywords?: string;
  replaceAfter?: number;
  run?: () => void;
}

export interface CompletionContext {
  text: string;
  match: string;
  query: string;
  after: string;
  inMath: boolean;
  path: string | null;
}

export interface CompleteList {
  items: PanelItem[];
  complete: true;
}

export type CompletionAnswer = PanelItem[] | CompleteList | null;

export interface CompletionSource {
  id: string;
  owner: string;
  where: "math" | "text" | "any";
  pattern: RegExp;
  replaceGroup?: number;
  fallback?: boolean;
  title(): string;
  provide(
    context: CompletionContext,
    signal: AbortSignal,
  ): CompletionAnswer | Promise<CompletionAnswer>;
}

/** A source of the core's; no-op: registers nothing. */
export function addCompletionSource(
  _source: CompletionSource,
): () => void {
  return () => {};
}

/** Where the plugins' sources are read; no-op: kept empty. */
export function setPluginCompletionSources(
  _read: () => readonly CompletionSource[],
): void {}

/** Every source; no-op: none. */
export function completionSources(): readonly CompletionSource[] {
  return [];
}
