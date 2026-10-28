/**
 * Ctrl/⌘+Alt+1..6 标题快捷键（原由已卸载的 CM6 headingKeymap 绑定，现补绑）。
 *
 * 仅当焦点在编辑器内（keydown 冒泡到 root）时生效，避免与全局快捷键冲突。
 * 把当前焦点块转换为对应标题级别：H1/H3-H6 走 `block.convert.headingN`，
 * H2 走 `block.convert.heading`（vendor 默认转 `## ` section）。非可转换块
 * （表格/代码围栏等含换行的块）由 command-registry 判不可用，安全 no-op。
 */

import type { YeliEditorFacade } from "../facade/YeliEditorFacade";

const HEADING_SHORTCUT: Record<string, string> = {
  "1": "block.convert.heading1",
  "2": "block.convert.heading",
  "3": "block.convert.heading3",
  "4": "block.convert.heading4",
  "5": "block.convert.heading5",
  "6": "block.convert.heading6",
};

/** 取焦点所在块的 blockId（root 内任意焦点元素均可，含表格 textarea）。 */
function currentBlockId(root: HTMLElement, target: HTMLElement): string | null {
  const block = target.closest<HTMLElement>("[data-source-block-id]");
  if (!block || !root.contains(block)) return null;
  return block.getAttribute("data-source-block-id");
}

export function installHeadingShortcuts(
  root: HTMLElement,
  facade: YeliEditorFacade,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!(event.ctrlKey || event.metaKey) || !event.altKey) return;
    const command = HEADING_SHORTCUT[event.key];
    if (!command) return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || !root.contains(target)) return;
    event.preventDefault();
    const blockId = currentBlockId(root, target);
    if (!blockId) return;
    try {
      facade.execCommand(command, { blockId });
    } catch {
      // 命令不可用/失败静默（与「无效果入口」一致）。
    }
  };
  root.addEventListener("keydown", onKeyDown);
  return () => root.removeEventListener("keydown", onKeyDown);
}
