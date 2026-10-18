import DOMPurify from 'dompurify'

/**
 * 消毒用户可控的 HTML。
 *
 * mdToHtml / renderMdWithMath 都会把 markdown 里的原始 HTML 原样带出来，
 * 而预览、阅读、导出、历史快照这 9 处都是 dangerouslySetInnerHTML 直插，
 * 之前没有任何一层过滤 —— 存一份 `<img src=x onerror=...>` 或 `<script>`
 * 进文档，每次打开预览就会执行。
 *
 * 属性白名单只做加法：DOMPurify 默认已放行 align / checked / disabled /
 * data:* 图片（DATA_URI_TAGS 含 img），图表导出的 base64 图片不会被误删。
 */
const CONFIG = {
  ADD_ATTR: ['align', 'checked', 'disabled', 'target', 'id', 'value'],
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  try {
    return DOMPurify.sanitize(html, CONFIG)
  } catch {
    // 消毒失败也比把未消毒 HTML 塞进 DOM 安全：退化成纯文本
    return html.replace(/<[^>]*>/g, '')
  }
}
