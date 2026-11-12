/** What the window tells the plugins manager about itself, no-op shim. */
export function windowInfo() {
  return {
    strings: () => ({ completionCommands: "" }),
    language: () => "en",
    dark: () => false,
  };
}
