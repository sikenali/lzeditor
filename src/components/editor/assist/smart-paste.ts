/**
 * 智能粘贴（输入辅助）。
 *
 * 拦截 shell 的 paste（capture 阶段），按剪贴板内容分派：
 *  - 剪贴板含图片 → yeli 图片块 markdown，走 facade typed 事务；
 *  - 纯文本为 URL → 链接 markdown（有选区时用选区文本作链接文字）；
 *  - 纯文本为 TSV 表格 → 表格 markdown（与 vendor yeli editor/table-commands
 *    的序列化约定一致：管道转义 + `---` 分隔行）；
 *  - 其余 → 不拦截，交 vendor canvas 的 onPaste 做默认文本粘贴。
 *
 * 所有智能分派都经 facade replaceRange typed 事务写入，绝不直接改写源码；
 * 图片 blob 经 onImageBlob 回调交给资产上传层（缺省用 objectURL 占位）。
 */

import type { YeliEditorFacade } from "../facade/YeliEditorFacade";
import {
  caretSourceOffset,
  commitActiveEditable,
  refocusAfterEdit,
} from "./source-offset";

const URL_RE = /^(?:https?:\/\/|mailto:)\S+$/i;

/** 纯逻辑：文本是否为单个 URL（用于链接粘贴）。 */
export function singleUrl(text: string): string | null {
  const trimmed = text.trim();
  return URL_RE.test(trimmed) ? trimmed : null;
}

/** 纯逻辑：TSV 文本 → 行×列二维数组（行宽一致且 ≥2 列才算表格）。 */
export function tsvRows(text: string): string[][] | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (lines.length < 2) return null;
  const rows = lines.map((line) => line.split("\t"));
  const width = rows[0]?.length ?? 0;
  if (width < 2) return null;
  return rows.every((row) => row.length === width) ? rows : null;
}

/** 单元格转义：`|` 前面补 `\`（与 vendor serializeTable 同约定），`\n` → `<br>`。 */
function pipeCell(cell: string): string {
  return cell
    .replace(/(\\*)\|/g, (_match, slashes: string) => `${slashes}${slashes}\\|`)
    .replace(/\n/g, "<br>");
}

/** 纯逻辑：二维数组 → GFM 表格 markdown。 */
export function tableFromRows(rows: string[][]): string {
  const width = Math.max(...rows.map((row) => row.length));
  const full = rows.map((row) => [
    ...row,
    ...Array<string>(width - row.length).fill(""),
  ]);
  const line = (row: string[]) => `| ${row.map(pipeCell).join(" | ")} |`;
  return [
    line(full[0] ?? []),
    line(Array<string>(width).fill("---")),
    ...full.slice(1).map(line),
  ].join("\n");
}

/** 纯逻辑：URL 粘贴 → 链接 markdown（选区文字作链接文字，否则用 URL 本身）。 */
export function linkMarkdown(url: string, selected = ""): string {
  const target =
    selected !== "" && !selected.includes("\n") ? selected : url;
  return `[${target}](${url})`;
}

/** 纯逻辑：图片块 markdown。 */
export function imageMarkdown(alt = "粘贴的图片", src = ""): string {
  return `![${alt}](${src})`;
}

export interface SmartPasteOptions {
  /** 测试注入：读光标源码偏移。 */
  readOffset?: (root: HTMLElement) => number | null;
  /** 测试注入：把光标放回源码偏移。 */
  placeCaret?: (root: HTMLElement, offset: number) => boolean;
  /** 图片粘贴时生成 src（资产上传层接入点）；缺省用 objectURL 占位。 */
  onImageBlob?: (blob: Blob) => string;
  /** 测试注入：是否处于编辑态（默认 true；为 false 时跳过智能粘贴）。 */
  enabled?: (root: HTMLElement) => boolean;
}

/** 插入 markdown 到光标处（facade typed 事务），并把光标放到末尾。 */
function insertAtCaret(
  root: HTMLElement,
  facade: YeliEditorFacade,
  offset: number,
  markdown: string,
  placeCaret?: (element: HTMLElement, offset: number) => boolean,
): void {
  commitActiveEditable(root);
  facade.replaceRange(offset, offset, markdown);
  refocusAfterEdit(root, offset + markdown.length, placeCaret);
}

/**
 * 在 root（.yeli-canvas-shell / .block-canvas）上挂 paste 事件层。
 * 返回卸载函数。智能分派失败静默降级为默认文本粘贴（不 preventDefault）。
 */
export function installSmartPaste(
  root: HTMLElement,
  facade: YeliEditorFacade,
  options: SmartPasteOptions = {},
): () => void {
  const readOffset =
    options.readOffset ?? ((element: HTMLElement) => caretSourceOffset(element));
  // 缺省让 refocusAfterEdit 用 placeCaretAtSourceOffset 写回 DOM 光标。
  const placeCaret = options.placeCaret;
  const enabled = options.enabled ?? (() => true);

  const onPaste = (event: ClipboardEvent) => {
    if (!enabled(root)) return;
    const data = event.clipboardData;
    if (!data) return;
    const files = Array.from(data.files ?? []);
    const text = data.getData("text/plain");
    const offset = readOffset(root);
    if (offset === null) return;

    // 1) 图片 → 图片块事务。
    const image = files.find((file) => file.type.startsWith("image/"));
    if (image) {
      event.preventDefault();
      event.stopPropagation();
      try {
        const src = options.onImageBlob
          ? options.onImageBlob(image)
          : URL.createObjectURL(image);
        const alt = image.name.replace(/\.[^.]+$/u, "") || "粘贴的图片";
        insertAtCaret(root, facade, offset, imageMarkdown(alt, src), placeCaret);
      } catch {
        // 图片接入失败：不阻断。
      }
      return;
    }

    // 2) URL → 链接事务（facade 有选区时以其为链接文字并替换选区区间）。
    const url = singleUrl(text);
    if (url) {
      event.preventDefault();
      event.stopPropagation();
      try {
        const selection = facade.getSelection();
        const hasSelection = selection !== null && selection.from < selection.to;
        if (hasSelection && selection) {
          const selected = facade.getText().slice(selection.from, selection.to);
          facade.replaceRange(selection.from, selection.to, linkMarkdown(url, selected));
          refocusAfterEdit(root, selection.from + linkMarkdown(url, selected).length, placeCaret);
        } else {
          insertAtCaret(root, facade, offset, linkMarkdown(url), placeCaret);
        }
      } catch {
        // 事务失败：不阻断。
      }
      return;
    }

    // 3) TSV → 表格事务（vendor table-commands 序列化约定）。
    const rows = tsvRows(text);
    if (rows) {
      event.preventDefault();
      event.stopPropagation();
      try {
        insertAtCaret(root, facade, offset, tableFromRows(rows), placeCaret);
      } catch {
        // 事务失败：不阻断。
      }
      return;
    }

    // 4) 默认文本：交 vendor canvas 的 onPaste 处理（不 preventDefault）。
  };

  root.addEventListener("paste", onPaste, true);
  return () => root.removeEventListener("paste", onPaste, true);
}
