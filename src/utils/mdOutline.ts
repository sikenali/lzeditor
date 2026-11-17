import { headingId } from './markdown/id'

export interface MdOutlineItem {
  /** 唯一 id，跨渲染稳定（同一行号不会重复） */
  id: string
  level: number
  text: string
  /** 标题首个字符在文档里的字符偏移 */
  pos: number
  /** 1-based 行号 */
  line: number
  /** 1 / 1.1 / 1.1.1 */
  number: string
}

/**
 * 大纲 markdown 源解析（带兜底链）。
 *
 * 与 App.tsx `editorMd` 的兜底链一致，防止首开空白：
 * 优先 store 的 `docsMd[docId]`（与输入同步，输入时 onChange 同帧写回），
 * 其次当前编辑缓冲 `mdContent`，最后回落文档源码兜底 `source(docId)`
 * （组件传 getDocMd：builtin/本地存储）。不回落 source 的话，首开
 * docsMd/mdContent 均空时大纲会显示「暂无标题」，而编辑器已借 getDocMd
 * 显示内容——两边不一致。
 *
 * `source` 由调用方注入（getDocMd 经 docSource 会拖入 .md 资源，node:test
 * 无法加载，故不作为静态依赖，改注入以便行为化测试）。
 */
export function resolveOutlineMd(
  docId: string,
  docsMd: Record<string, string>,
  mdContent: string,
  source: (id: string) => string,
): string {
  return docsMd?.[docId] || mdContent || source(docId) || ''
}

/**
 * 从 markdown 源文本收集标题。CM6 没有文档树，大纲只能从源码解析；
 * 代码块围栏内的 `#` 不算标题。
 */
export function parseMdOutline(md: string): MdOutlineItem[] {
  const items: MdOutlineItem[] = []
  if (!md) return items

  const lines = md.split('\n')
  const counters = [0, 0, 0, 0, 0, 0]
  const seen = new Map<string, number>()
  let inFence = false
  let offset = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      offset += line.length + 1
      continue
    }
    const match = inFence ? null : line.match(/^(#{1,6})\s+(.*)$/)
    if (match) {
      const level = match[1].length
      counters[level - 1] += 1
      for (let j = level; j < counters.length; j++) counters[j] = 0
      const rawText = match[2].replace(/\s+#+\s*$/, '').trim()
      const text = rawText || '(无标题)'
      // id 必须和渲染器给标题生成的锚点一致，预览里的 # 链接才能跳对
      const base = headingId(rawText) || 'heading'
      const n = seen.get(base) || 0
      seen.set(base, n + 1)
      items.push({
        id: n === 0 ? base : `${base}-${n + 1}`,
        level,
        text,
        pos: offset,
        line: i + 1,
        number: counters.slice(0, level).join('.'),
      })
    }
    offset += line.length + 1
  }
  return items
}

/** 缩进式目录正文，供「插入目录」等 markdown 场景复用。 */
export function outlineToMarkdownTree(items: MdOutlineItem[]): string {
  if (items.length === 0) return '暂无标题'
  return items
    .map(it => `${'  '.repeat(it.level - 1)}- [${it.text}](#${it.id})`)
    .join('\n')
}
