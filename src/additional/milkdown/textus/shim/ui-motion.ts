/** Motion helpers, no-op shim: motion allowed, every token 200ms, nothing
 *  animates (a glide scroll jumps). A real implementation replaces this when
 *  the editor core is wired in. */

export function motionAllowed(): boolean {
  return true;
}

export function duration(_token: string = "--dur-sheet"): number {
  return 200;
}

export function animate(
  _el: Element,
  _keyframes: Keyframe[],
  _options: unknown,
): Animation | null {
  return null;
}

export function glideScroll(
  el: HTMLElement,
  delta: number,
  _token: string = "--dur-sheet",
): void {
  el.scrollTop += delta;
}

export function scrollBehavior(): ScrollBehavior {
  return "auto";
}
