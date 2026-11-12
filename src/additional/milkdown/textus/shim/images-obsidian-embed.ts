import type { MilkdownPlugin } from "@milkdown/kit/ctx";

/** Obsidian embed nodes and rules, no-op shim: no embeds, so empty plugins
 *  and a `parseEmbed` that matches nothing. */
export const remarkObsidianEmbedPlugin: MilkdownPlugin = () => () => {};
export const obsidianEmbedSchema: MilkdownPlugin = () => () => {};
export const obsidianEmbedInputRule: MilkdownPlugin = () => () => {};

export function parseEmbed(_source: string): { isImage: boolean } | null {
  return null;
}
