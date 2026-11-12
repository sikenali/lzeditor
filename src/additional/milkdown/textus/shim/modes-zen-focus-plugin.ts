import type { MilkdownPlugin } from "@milkdown/kit/ctx";

/** Zen focus mode, no-op shim: never on, so no plugin. */
export const zenFocusPlugin: MilkdownPlugin = () => () => {};
