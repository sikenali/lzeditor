/**
 * The app's UI strings, as the ported plugin modules need them. The host
 * passes its own strings object; the keys used here are the plugin modules'
 * (`pluginPerm*`) and any the host's commands title with. Kept as a loose
 * record so any host can adapt.
 */
export type Strings = Record<string, string>;
