/** Who gives the content of `![[note]]` embeds, no-op shim: no providers,
 *  no content. The real plugin host replaces this when wired in. */

export type EmbedKind = "note" | "heading" | "block";

export interface EmbedTarget {
  path: string;
  heading?: string;
  block?: string;
  alias?: string;
}

export interface EmbedContent {
  markdown: string;
  title?: string | null;
}

export interface EmbedProvider {
  owner: string;
  id: string;
  kinds: readonly EmbedKind[];
  provide(
    target: EmbedTarget,
    signal: AbortSignal,
  ): Promise<EmbedContent | null>;
}

type Listener = (path?: string) => void;

/** Register a provider; no-op: registers nothing. */
export function addEmbedProvider(_provider: EmbedProvider): () => void {
  return () => {};
}

/** Start a plugin that declares embeds of a kind; no-op. */
export function setEmbedStarter(
  _start: ((kind: EmbedKind) => void) | null,
): void {}

/** Set who owns each embed kind; no-op. */
export function setEmbedOwners(
  _owner: (kind: EmbedKind) => string | null,
): void {}

/** The provider that draws embeds of `kind`; no-op: none. */
export function embedProvider(_kind: EmbedKind): EmbedProvider | null {
  return null;
}

/** The embeds showing `path` are asked again; no-op. */
export function refreshEmbeds(_path?: string): void {}

/** Told when embeds must be asked again; no-op: a no-op unsubscribe. */
export function onEmbedsChange(_listener: Listener): () => void {
  return () => {};
}
