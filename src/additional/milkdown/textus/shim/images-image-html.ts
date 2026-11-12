/** Image -> HTML helpers, no-op shim: images keep their own size. */
import type { Attrs } from "@milkdown/kit/prose/model";

export interface ImageAttrs {
  src: string;
  alt: string;
  title: string;
  width: string;
  html: string;
}

/** An image's `<img>` tag; no-op: null (the markdown is written as-is). */
export function imageMarkdownHtml(_attrs: ImageAttrs): string | null {
  return null;
}

/** The width an image shows at, as HTML writes it; no-op: null (its own). */
export function imageWidthOf(_attrs: Attrs): string | null {
  return null;
}

/** A title split into its caption and a title-kept width; no-op: the whole
 *  title is the caption, no width. */
export function readImagePresentation(
  title: string | null | undefined,
): { title: string; widthPercent: number | null } {
  return { title: title ?? "", widthPercent: null };
}
