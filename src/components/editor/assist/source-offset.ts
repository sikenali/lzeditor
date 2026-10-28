/**
 * DOM 光标 ↔ 源码偏移映射（assist 适配层）。
 *
 * yeli edit-canvas 的区块渲染结构（src/vendor/yeli/ui/edit-canvas.tsx）里每个
 * 可编辑块都包在一个带 `data-source-from` / `data-source-to` 的 shell 内，其
 * `.block-content-editable` 承载渲染后的行内文本。块源码（含 `## `、`- `、
 * `> ` 等标记）与渲染文本存在前缀/后缀差，因此这里用「块源码区间右端 - 渲染
 * 文本长度」把渲染内的文本偏移映射回源码偏移（对 paragraph/heading/quote/
 * list-item 等「内容为块源码后缀」的块都成立）。纯视角工具，不触数据层。
 */

export function caretSourceOffset(root: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const element =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement;
  const editable = element?.closest<HTMLElement>(".block-content-editable");
  if (!editable || !root.contains(editable)) return null;
  return sourceOffsetAtPoint(range.startContainer, range.startOffset);
}

/**
 * 当前 DOM 选区 → 源码区间（typewriter 未同步时的兜底读法，供 facade 在
 * selection.* 命令且 #selection 为空时回退）。无选中或不可映射 → null。
 */
export function selectionSourceRange(): { from: number; to: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const from = sourceOffsetAtPoint(range.startContainer, range.startOffset);
  const to = sourceOffsetAtPoint(range.endContainer, range.endOffset);
  if (from === null || to === null) return null;
  return { from: Math.min(from, to), to: Math.max(from, to) };
}

/** 把 DOM 内某点映射为源码偏移（块 shell data-source-from/to 反推）。 */
function sourceOffsetAtPoint(container: Node, offset: number): number | null {
  const element =
    container instanceof Element ? container : container.parentElement;
  const editable = element?.closest<HTMLElement>(".block-content-editable");
  if (!editable) return null;
  const shell = editable.closest<HTMLElement>("[data-source-from]");
  const from = shell?.getAttribute("data-source-from");
  const to = shell?.getAttribute("data-source-to");
  if (from === null || to === null) return null;
  const blockFrom = Number(from);
  const blockTo = Number(to);
  if (!Number.isSafeInteger(blockFrom) || !Number.isSafeInteger(blockTo)) {
    return null;
  }
  const probe = document.createRange();
  probe.selectNodeContents(editable);
  try {
    probe.setEnd(container, offset);
  } catch {
    return null;
  }
  const textOffset = plainTextLength(probe.cloneContents() as unknown as Node);
  const renderedLength = plainTextLength(editable);
  return blockTo - renderedLength + textOffset;
}

/** 在当前 DOM 把光标放到源码偏移处（块内定位，跨块时落到最近的块首尾）。 */
export function placeCaretAtSourceOffset(
  root: HTMLElement,
  sourceOffset: number,
): boolean {
  const editable = editableForSourceOffset(root, sourceOffset);
  if (!editable) return false;
  const shell = editable.closest<HTMLElement>("[data-source-from]");
  const blockTo = Number(shell?.getAttribute("data-source-to") ?? NaN);
  const renderedLength = plainTextLength(editable);
  const textOffset = Math.max(0, sourceOffset - blockTo + renderedLength);
  const point = textPointAt(editable, textOffset);
  if (!point) return false;
  const range = document.createRange();
  range.setStart(point.node, point.offset);
  range.collapse(true);
  const selection = window.getSelection();
  if (!selection) return false;
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function editableForSourceOffset(
  root: HTMLElement,
  offset: number,
): HTMLElement | null {
  const editables = [
    ...root.querySelectorAll<HTMLElement>("[data-source-from] .block-content-editable"),
  ];
  for (const editable of editables) {
    const shell = editable.closest<HTMLElement>("[data-source-from]");
    const from = Number(shell?.getAttribute("data-source-from") ?? NaN);
    const to = Number(shell?.getAttribute("data-source-to") ?? NaN);
    if (Number.isSafeInteger(from) && Number.isSafeInteger(to) && offset >= from && offset <= to) {
      return editable;
    }
  }
  return editables[0] ?? null;
}

/**
 * 当前焦点所在的 .block-content-editable（若在 root 内）。
 * 供 assist 在发起 facade typed 事务前先让 vendor canvas 的 onBlur 提交，
 * 避免事务与未提交 DOM 编辑在下一轮 commit 冲突（写冲突）。
 */
export function activeEditable(root: HTMLElement): HTMLElement | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) return null;
  return active.closest<HTMLElement>(".block-content-editable") ?? null;
}

/** blur 当前焦点块，触发 vendor canvas onBlur 提交（幂等，失败静默）。 */
export function commitActiveEditable(root: HTMLElement): void {
  const editable = activeEditable(root);
  if (editable) editable.blur();
}

/**
 * 在 facade 事务导致 store 变更、React 重渲染后，把焦点与光标放回 offset。
 * 用双 rAF 等 vendor canvas 的 useLayoutEffect（非激活时刷新 innerHTML）跑完，
 * 再聚焦并放置光标；任何一步失败都静默（不把异常抛进编辑事务）。
 */
export function refocusAfterEdit(
  root: HTMLElement,
  sourceOffset: number,
  placeCaret: (element: HTMLElement, offset: number) => boolean = (
    element,
    offset,
  ) => placeCaretAtSourceOffset(element, offset),
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        const editable = editableForSourceOffset(root, sourceOffset);
        if (!editable) return;
        editable.focus();
        placeCaret(root, sourceOffset);
      } catch {
        // 视角操作失败不阻断编辑流程。
      }
    });
  });
}

/** 定位到指定 blockId 的块元素并滚动进视口（scrollIntoView 平滑）。 */
export function scrollBlockIntoView(root: HTMLElement, blockId: string): boolean {
  const blocks = root.querySelectorAll<HTMLElement>("[data-source-block-id]");
  for (const block of blocks) {
    if (block.getAttribute("data-source-block-id") === blockId) {
      block.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
  }
  return false;
}

/**
 * 把焦点与光标放到源码偏移处，并把所在块滚入视口。
 * 供 facade.focus() 使用：大纲跳转 setSelection 后调用，视图跟随目标块。
 * 失败静默返回 false（不阻断调用方）。
 */
export function focusSourceOffset(
  root: HTMLElement,
  sourceOffset: number,
): boolean {
  const editable = editableForSourceOffset(root, sourceOffset);
  if (!editable) return false;
  editable.focus();
  placeCaretAtSourceOffset(root, sourceOffset);
  editable
    .closest<HTMLElement>("[data-source-block-id]")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function textPointAt(
  root: HTMLElement,
  offset: number,
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let last: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    last = text;
    if (remaining <= text.data.length) return { node: text, offset: remaining };
    remaining -= text.data.length;
  }
  return remaining === 0 && last
    ? { node: last, offset: last.data.length }
    : null;
}

function plainTextLength(node: Node): number {
  let length = 0;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    length += (current as Text).data.length;
  }
  return length;
}
