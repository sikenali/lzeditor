/**
 * 自动配对（输入辅助）。
 *
 * `(` / `[` / `"` / `*`（粗体成对符）键入时，经 facade typed 事务插入成对符并
 * 把光标置于两符之间；Backspace 落在空配对（`()`/`[]`/`""`/`**`）中间时整对
 * 删除。光标始终用源码偏移（source-offset.ts）在 DOM 与源码间映射，所有写入
 * 都走 facade 的 replaceRange typed 事务，绝不直接改写源码。
 *
 * 纯逻辑（autopairInsertion / autopairBackspace / isInsideCode）与 DOM/facade
 * 绑定（installAutopair）分离：前者可在无 DOM 环境下单测（tests/vendor/
 * assist.test.mjs），后者只做事件转发 + 事务 + 视角回位。
 */

import type { YeliEditorFacade } from "../facade/YeliEditorFacade";
import {
  caretSourceOffset,
  commitActiveEditable,
  refocusAfterEdit,
} from "./source-offset";

/** 开符 → 闭符。`*` 映射到自身，用于粗体 `**` 成对。 */
const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  '"': '"',
  "*": "*",
};

export interface AutopairInsertion {
  insertion: string;
  caretDelta: number;
}

/**
 * 判断源码 offset 是否位于行内代码 span 或围栏代码块内。
 * 在这些上下文里关闭自动配对，避免破坏代码（纯扫描，无依赖）。
 */
export function isInsideCode(source: string, offset: number): boolean {
  let inFence = false;
  let fenceLen = 0;
  let inSpan = false;
  let spanLen = 0;
  let lineStart = true;
  let i = 0;
  while (i < offset) {
    const ch = source[i]!;
    if (ch === "\n") {
      lineStart = true;
      i += 1;
      continue;
    }
    if (ch !== "`") {
      lineStart = false;
      i += 1;
      continue;
    }
    let run = 0;
    while (source[i + run] === "`") run += 1;
    if (inFence) {
      // 只有行首且长度 ≥ 开栏长度的 ` 序列才闭合围栏。
      if (lineStart && run >= fenceLen) {
        inFence = false;
        fenceLen = 0;
      }
      lineStart = false;
      i += run;
      continue;
    }
    if (lineStart && run >= 3) {
      inFence = true;
      fenceLen = run;
      lineStart = false;
      i += run;
      continue;
    }
    if (!inSpan) {
      inSpan = true;
      spanLen = run;
    } else if (run === spanLen) {
      inSpan = false;
    }
    lineStart = false;
    i += run;
  }
  return inFence || inSpan;
}

/**
 * 纯逻辑：用户键入 `char` 于源码 offset 时，计算应插入的成对文本。
 * 返回 null 表示不该配对（非配对键、位于代码内、下一字符已是闭符）。
 */
export function autopairInsertion(
  source: string,
  offset: number,
  char: string,
): AutopairInsertion | null {
  const close = PAIRS[char];
  if (!close) return null;
  if (offset < 0 || offset > source.length) return null;
  if (isInsideCode(source, offset)) return null;
  // 光标紧跟闭符（已存在配对）时不再重复插入，让字符按普通输入处理。
  if (source[offset] === close) return null;
  return { insertion: char + close, caretDelta: 1 };
}

/**
 * 纯逻辑：Backspace 于源码 offset，若两侧正好构成空配对则整对删除。
 * 返回 { from, to } 为要删除的源码区间，否则 null。
 */
export function autopairBackspace(
  source: string,
  offset: number,
): { from: number; to: number } | null {
  if (offset <= 0 || offset >= source.length) return null;
  const left = source[offset - 1]!;
  const right = source[offset]!;
  if (PAIRS[left] === right) return { from: offset - 1, to: offset + 1 };
  return null;
}

export interface AutopairOptions {
  /** 参与配对的字符集（默认 `(["*`）。 */
  chars?: string;
  /** 测试注入：读光标源码偏移（默认读 DOM selection）。 */
  readOffset?: (root: HTMLElement) => number | null;
  /** 测试注入：把光标放回源码偏移（默认写 DOM selection）。 */
  placeCaret?: (root: HTMLElement, offset: number) => boolean;
}

/**
 * 在 root（.block-canvas / .yeli-canvas-shell）上挂键盘事件层。
 * 返回卸载函数。任何事务失败只静默降级（不把异常抛进编辑流程）。
 */
export function installAutopair(
  root: HTMLElement,
  facade: YeliEditorFacade,
  options: AutopairOptions = {},
): () => void {
  const chars = new Set(options.chars ?? '(["*');
  const readOffset =
    options.readOffset ?? ((element: HTMLElement) => caretSourceOffset(element));
  // 缺省让 refocusAfterEdit 用 placeCaretAtSourceOffset 写回 DOM 光标。
  const placeCaret = options.placeCaret;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "Backspace") {
      const offset = readOffset(root);
      if (offset === null) return;
      const pair = autopairBackspace(facade.getText(), offset);
      if (!pair) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        commitActiveEditable(root);
        facade.replaceRange(pair.from, pair.to, "");
        refocusAfterEdit(root, pair.from, placeCaret);
      } catch {
        // 事务失败：不阻断编辑。
      }
      return;
    }

    if (event.key.length !== 1 || !chars.has(event.key)) return;
    const offset = readOffset(root);
    if (offset === null) return;
    const insertion = autopairInsertion(facade.getText(), offset, event.key);
    if (!insertion) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      commitActiveEditable(root);
      facade.replaceRange(
        offset,
        offset,
        insertion.insertion,
      );
      refocusAfterEdit(root, offset + insertion.caretDelta, placeCaret);
    } catch {
      // 事务失败：不阻断编辑。
    }
  };

  root.addEventListener("keydown", onKeyDown, true);
  return () => root.removeEventListener("keydown", onKeyDown, true);
}
