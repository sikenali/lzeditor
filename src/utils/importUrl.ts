/**
 * 文档库「URL 在线导入」：仅支持纯 .md 直链（raw.githubusercontent.com / gist 等）。
 *
 * 用户决策「仅 .md 直链」：不提取 HTML（博客/GitBook 页面返回 HTML 时报错提示），
 * 不做 Git 仓库文件列表，不新增后端/代理/IPC——raw/gist 带 CORS 头，渲染进程 fetch 可行。
 */

/** 校验导入 URL：合法返回 null，否则返回错误文案。仅支持 http(s) 直链。 */
export function validateImportUrl(url: string): string | null {
  const trimmed = (url || '').trim()
  if (!trimmed) return '请输入 URL'
  if (!/^https?:\/\//i.test(trimmed)) return '仅支持 http(s) 协议的 URL'
  try {
    new URL(trimmed)
  } catch {
    return 'URL 格式无效'
  }
  return null
}

/**
 * 判断文本是否为完整 HTML 页面（而非 markdown 里的行内 HTML）。
 *
 * 「仅 .md 直链」目标是不误判合法 markdown：GitHub README 常以
 * `<p align="center">`/`<div align="center">` 徽章块开头，那是合法的行内 HTML，
 * 不是页面。故只认文档级标记（doctype / <html> / <head> / <body>）。
 */
export function looksLikeHtml(text: string): boolean {
  if (!text) return false
  const t = text.trimStart().slice(0, 512).toLowerCase()
  return /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<meta[\s>]/i.test(t)
}

/** 从 URL 末段文件名派生标题（去扩展名）。无路径段时用 hostname。 */
export function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const segments = u.pathname.split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    if (!last) return u.hostname || '导入文档'
    return last.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '') || u.hostname || '导入文档'
  } catch {
    return '导入文档'
  }
}

/**
 * 从 URL 拉取 markdown 内容（仅 .md 直链）。
 * - 非法 URL / 非 http(s)：throw
 * - HTTP 非 2xx：throw（含状态码）
 * - 返回 HTML：throw「请提供 .md 直链」
 * - 成功：返回 { title, md }，由调用方 openMarkdownDoc
 */
export async function fetchMarkdownFromUrl(url: string): Promise<{ title: string; md: string }> {
  const err = validateImportUrl(url)
  if (err) throw new Error(err)
  let res: Response
  try {
    res = await fetch(url.trim())
  } catch {
    throw new Error('网络请求失败，请检查 URL 或网络（部分站点有跨域限制）')
  }
  if (!res.ok) throw new Error(`请求失败 (HTTP ${res.status})`)
  const text = await res.text()
  if (looksLikeHtml(text)) {
    throw new Error('请提供 .md 直链（raw.githubusercontent.com / gist 等），不支持 HTML 页面')
  }
  return { title: deriveTitleFromUrl(url), md: text }
}
