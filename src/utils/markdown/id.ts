/** HTML 转义。输出会进 dangerouslySetInnerHTML，必须先过这里。 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 标题文本 → 稳定的页内锚点 id。 */
export function headingId(raw: string): string {
  return slug(raw)
}

function slug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()#]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\w-]/gu, '')
}

/** 重复标题 → foo / foo-2 / foo-3，和渲染器里的去重规则一致。 */
export function makeHeadingIdGen(): (text: string) => string {
  const seen = new Map<string, number>()
  return (text: string) => {
    const base = headingId(text) || 'heading'
    const n = seen.get(base) || 0
    seen.set(base, n + 1)
    return n === 0 ? base : `${base}-${n + 1}`
  }
}
