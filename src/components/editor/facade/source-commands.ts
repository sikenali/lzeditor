import type { EditorFacade } from "./EditorFacade";
import { parseMdOutline, outlineToMarkdownTree } from "../../../utils/mdOutline";

/**
 * Commands that are pure Markdown-source edits, shared by the CM6 (code mode)
 * and Milkdown (WYSIWYG) facades.
 *
 * These are written at the source level on purpose:
 *  - Superscript/subscript use the HTML tags `<sup>`/`<sub>` (the form the
 *    earlier TipTap build wrote, and what Markdown itself allows inline).
 *    Both the preview pipeline and Milkdown's raw-HTML renderer display them.
 *  - Introduction is a blockquote with italic content, the Markdown spelling
 *    of the old `lz-insert-quote` block (plain `>` stays 引用).
 *  - Table of contents is a static Markdown list generated from headings, so
 *    preview/export/read see it (Milkdown's `[TOC]` node is not understood by
 *    the preview pipeline).
 *  - Footnote is `[^n]` plus its `[^n]: …` definition, understood by both
 *    markdown-it-footnote and Milkdown's footnote nodes.
 *
 * Returns true when handled, null when the command is not one of these.
 */
export function applySourceCommand(
  facade: EditorFacade,
  name: string,
): boolean | null {
  if (name === "selection.sup" || name === "selection.sub") {
    const tag = name === "selection.sup" ? "sup" : "sub";
    const sel = facade.getSelection();
    if (!sel) return null;
    const src = facade.getText();
    const selected = src.slice(sel.from, sel.to);
    // 空选区直接插一对空标签没有任何可见变化（用户会以为按钮坏了）。
    // 插入可编辑的占位文字并选中它，继续输入即可替换。
    const inner = selected || (tag === "sup" ? "上标" : "下标");
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    // HTML 标签只能在同一 textblock 内配对。跨段选区整体包一对标签时，
    // 开标签和闭标签会落在不同段落，所见即所得把标签当源码显示出来。
    // 按行分别包裹，保证每行都是完整的一对。
    const wrapped = inner.includes("\n")
      ? inner.split("\n").map(line => line.trim() ? `${open}${line}${close}` : line).join("\n")
      : `${open}${inner}${close}`;
    facade.replaceRange(sel.from, sel.to, wrapped);
    if (wrapped !== `${open}${inner}${close}`) {
      facade.setSelection(sel.from, sel.from + wrapped.length);
    } else {
      facade.setSelection(sel.from + open.length, sel.from + open.length + inner.length);
    }
    return true;
  }

  if (name === "insert.intro") {
    const sel = facade.getSelection();
    const src = facade.getText();
    const selected =
      sel && sel.from < sel.to ? src.slice(sel.from, sel.to) : "引言内容";
    const anchor = sel ?? { from: src.length, to: src.length };
    // A blockquote only renders at the start of a block, so break out of the
    // current line on both sides when the insert lands mid-line.
    const before = src.slice(0, anchor.from);
    const after = src.slice(anchor.to);
    const prefix = before === "" || before.endsWith("\n") ? "" : "\n";
    const suffix = after === "" || after.startsWith("\n") ? "" : "\n";
    facade.insertText(`${prefix}> *${selected}*${suffix}`, anchor);
    // `> *` is the prefix before the editable content.
    const innerFrom = anchor.from + prefix.length + 3;
    facade.setSelection(innerFrom, innerFrom + selected.length);
    return true;
  }

  if (name === "insert.toc") {
    const sel = facade.getSelection();
    const src = facade.getText();
    const toc = `**目录**\n${outlineToMarkdownTree(parseMdOutline(src))}`;
    const at = sel ? sel.to : src.length;
    const prefix = at === 0 || src.slice(0, at).endsWith("\n") ? "" : "\n";
    facade.insertText(`${prefix}${toc}\n`, { from: at, to: at });
    return true;
  }

  if (name === "insert.footnote") {
    const sel = facade.getSelection();
    const src = facade.getText();
    const max = [...src.matchAll(/\[\^(\d+)\]/g)].reduce(
      (acc, match) => Math.max(acc, Number(match[1])),
      0,
    );
    const no = max + 1;
    const ref = `[^${no}]`;
    const at = sel ? sel.to : src.length;
    // 引用留在光标处（行内），定义另起一块：中间空行保证 `[^1]: …` 是
    // 独立 footnote_definition，而不是并进上一段变成普通文字。
    const after = src.slice(at);
    const suffix = after === "" || after.startsWith("\n") ? "" : "\n";
    facade.insertText(`${ref}\n\n[^${no}]: 脚注内容${suffix}`, {
      from: at,
      to: at,
    });
    // Select the reference so typing replaces the placeholder definition later.
    facade.setSelection(at, at + ref.length);
    return true;
  }

  return null;
}
