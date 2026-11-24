import { renderMarkdown, type RenderOptions } from './markdown/render'
import type { FlavorSetting } from './markdown/flavors'

/**
 * Markdown → HTML 的唯一入口：方言自动检测 + KaTeX 公式 + 代码高亮 + DOMPurify。
 *
 * 渲染管线在 ./markdown/render.ts；这里只是给预览、阅读、导出、进编辑器等
 * 调用方保留原来的签名，所以不需要各自关心方言差异。
 *
 * lines 只有预览和阅读要开：预览按块上的行号做滚动对位，阅读按行号反查目录项
 * 落在哪一页。导出、剪贴板一律不开，免得 data-line 混进交付出去的 HTML。
 */
export function mdToHtml(
  md: string,
  flavor?: FlavorSetting,
  options: Pick<RenderOptions, 'lines'> = {},
): string {
  return renderMarkdown(md, { flavor, ...options }).html
}
