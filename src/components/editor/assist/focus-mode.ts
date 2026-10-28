/**
 * Focus Mode（纯视角，不触数据层）。
 *
 * 编辑焦点进入某区块时给 shell 挂上 `yeli-focus-mode` class（CSS 可据此弱化/
 * 隐藏非激活区块，营造专注输入氛围），焦点离开编辑器时移除。同时监听 facade
 * selection 变化：有光标/选区时保持 class，无选区（光标移出）时移除。
 * 只做 class 切换，不触发任何事务。
 */

import type { YeliEditorFacade } from "../facade/YeliEditorFacade";

export interface FocusModeOptions {
  /** 挂到 shell 上的 class（默认 `yeli-focus-mode`）。 */
  className?: string;
}

export function installFocusMode(
  root: HTMLElement,
  facade: YeliEditorFacade,
  options: FocusModeOptions = {},
): () => void {
  const className = options.className ?? "yeli-focus-mode";
  let active = false;

  const setActive = (next: boolean) => {
    if (next === active) return;
    active = next;
    root.classList.toggle(className, next);
  };

  const onFocusIn = (event: FocusEvent) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest(".block-content-editable")
    ) {
      setActive(true);
    }
  };
  const onFocusOut = (event: FocusEvent) => {
    const related = event.relatedTarget;
    if (related instanceof Node && root.contains(related)) return;
    setActive(false);
  };

  const unsubscribe = facade.onSelectionChange((selection) => {
    setActive(selection !== null);
  });

  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  return () => {
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    unsubscribe();
    setActive(false);
  };
}
