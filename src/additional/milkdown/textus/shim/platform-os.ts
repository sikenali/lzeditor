/** Shared OS detection, no-op shim: the vendored core runs as a web app.
 *  Every check reads false here; a real platform layer replaces this later. */
export function isMacPlatform(): boolean {
  return false;
}
export function isWindowsPlatform(): boolean {
  return false;
}
export function isLinuxPlatform(): boolean {
  return false;
}
export function isIOSPlatform(): boolean {
  return false;
}
export function isDesktop(): boolean {
  return false;
}
/** Whether a shortcut's Mod key is Cmd; no-op: false (Ctrl on this build). */
export function modIsMeta(_platform?: string): boolean {
  return false;
}
