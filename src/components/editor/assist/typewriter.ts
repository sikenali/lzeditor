/**
 * Typewriter 滚动定位（纯视角，不触数据层）。
 *
 * 监听 facade 的 selection 变化（以及 DOM selectionchange，把光标源码偏移
 * 同步回 facade.setSelection，让 facade 的选择状态始终反映真实光标），把
 * `.edit-surface` 滚动容器滚到让光标保持在可视带内（anchorRatio 处）。不读写
 * 源码、不产生事务，只调滚动容器的 scrollTop。
 *
 * 纯逻辑 typewriterScrollDelta 可无 DOM 单测。
 */

import type { YeliEditorFacade } from "../facade/YeliEditorFacade";
import { caretSourceOffset } from "./source-offset";

/**
 * 纯逻辑：给定光标顶边、容器顶边与高度，返回应追加的 scrollTop 增量。
 * 光标已在可视范围内 → 0（不打扰）；否则滚到 anchorRatio 高度处。
 */
export function typewriterScrollDelta(
  caretTop: number,
  containerTop: number,
  containerHeight: number,
  anchorRatio = 0.4,
): number {
  const containerBottom = containerTop + containerHeight;
  if (caretTop >= containerTop && caretTop <= containerBottom) return 0;
  const anchor = containerTop + anchorRatio * containerHeight;
  return Math.round(anchor - caretTop);
}

function scrollCaretIntoView(scrollContainer: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  if (rect.height === 0 && rect.width === 0) return;
  const delta = typewriterScrollDelta(
    rect.top,
    containerRect.top,
    containerRect.height,
  );
  if (delta !== 0) scrollContainer.scrollTop += delta;
}

export interface TypewriterOptions {
  /** 滚动容器（缺省取 root 最近的 .edit-surface，否则 root 自身）。 */
  scrollContainer?: HTMLElement | null;
  /** 是否启用滚动定位（默认 true）。 */
  follow?: boolean;
  /** 测试注入：读光标源码偏移。 */
  readOffset?: (root: HTMLElement) => number | null;
}

/**
 * 在 root（.block-canvas）上挂 selection 同步 + typewriter 滚动。
 * 返回卸载函数。纯视角操作，失败静默。
 */
export function installTypewriter(
  root: HTMLElement,
  facade: YeliEditorFacade,
  options: TypewriterOptions = {},
): () => void {
  const scrollContainer =
    options.scrollContainer === undefined
      ? (root.closest<HTMLElement>(".edit-surface") ?? root)
      : options.scrollContainer;
  const follow = options.follow ?? true;
  const readOffset =
    options.readOffset ?? ((element: HTMLElement) => caretSourceOffset(element));

  const syncSelection = () => {
    try {
      const offset = readOffset(root);
      if (offset !== null) facade.setSelection(offset, offset);
      if (follow && scrollContainer) scrollCaretIntoView(scrollContainer);
    } catch {
      // 视角失败不阻断。
    }
  };

  document.addEventListener("selectionchange", syncSelection);
  const unsubscribe = facade.onSelectionChange(() => {
    if (!follow || !scrollContainer) return;
    try {
      scrollCaretIntoView(scrollContainer);
    } catch {
      // 视角失败不阻断。
    }
  });
  return () => {
    document.removeEventListener("selectionchange", syncSelection);
    unsubscribe();
  };
}
