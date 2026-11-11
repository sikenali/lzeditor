import { registerCommand, runCommand } from "./app/commands";

/**
 * The places other code can add to the app: commands, editor menu items,
 * sidebar tabs and settings pages. Each `register*` returns its undo.
 *
 * `commands` is always available. The contribution points the host wires
 * differently (editor menu, sidebar tabs, settings pages) are injected via
 * `configurePluginApiHooks`; until then they accept and no-op.
 */

export type Undo = () => void;

/** The host's registrars for the contribution points Textus wires to UI. */
export interface PluginApiHooks {
  registerEditorMenuItems?: (item: unknown) => Undo;
  registerSidebarTab?: (tab: unknown) => Undo;
  registerSettingsPage?: (page: unknown) => Undo;
}

let hooks: PluginApiHooks = {};

/** Wires the host's contribution registrars; call once, at setup. */
export function configurePluginApiHooks(next: PluginApiHooks): void {
  hooks = next;
}

export const pluginApi = {
  commands: { register: registerCommand, run: runCommand },
  editorMenu: {
    register: (item: unknown): Undo =>
      hooks.registerEditorMenuItems?.(item) ?? (() => {}),
  },
  sidebarTabs: {
    register: (tab: unknown): Undo =>
      hooks.registerSidebarTab?.(tab) ?? (() => {}),
  },
  settingsPages: {
    register: (page: unknown): Undo =>
      hooks.registerSettingsPage?.(page) ?? (() => {}),
  },
} as const;

export type PluginApi = typeof pluginApi;

/** Puts the API on the window in a development build. */
export function exposePluginApiForDevelopment(): void {
  if (typeof window === "undefined") return;
  const dev = (import.meta as { env?: { DEV?: boolean } })?.env?.DEV;
  if (!dev) return;
  (window as Window & { __textusPlugins?: PluginApi }).__textusPlugins =
    pluginApi;
}
