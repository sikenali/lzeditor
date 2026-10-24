import { renderMarkdown } from './markdown/render'
import type { FlavorSetting } from './markdown/flavors'

/**
 * Markdown → HTML 的唯一入口：方言自动检测 + KaTeX 公式 + 代码高亮 + DOMPurify。
 *
 * 渲染管线在 ./markdown/render.ts；这里只是给预览、阅读、导出、进编辑器等
 * 调用方保留原来的签名，所以不需要各自关心方言差异。
 */
export function mdToHtml(md: string, flavor?: FlavorSetting): string {
  return renderMarkdown(md, { flavor }).html
}
