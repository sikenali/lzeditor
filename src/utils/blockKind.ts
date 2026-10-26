/**
 * 顶层块的分类。
 *
 * 分页引擎只按「是不是标题」做特殊处理，其余种类只是标记，
 * 便于统计与后续按类型调页边距，不影响装箱结果。
 */
export type BlockKind =
  | 'heading'
  | 'para'
  | 'list'
  | 'code'
  | 'image'
  | 'table'
  | 'quote'
  | 'hr'
  | 'math'

const TAG_KIND: Record<string, BlockKind> = {
  H1: 'heading',
  H2: 'heading',
  H3: 'heading',
  H4: 'heading',
  H5: 'heading',
  H6: 'heading',
  P: 'para',
  UL: 'list',
  OL: 'list',
  PRE: 'code',
  TABLE: 'table',
  BLOCKQUOTE: 'quote',
  HR: 'hr',
  DIV: 'para',
}

/** 顶层块标签名转成种类；未收录的标签一律当普通段落，保证任何块都能进页 */
export function tagToKind(tag: string): BlockKind {
  return TAG_KIND[tag.toUpperCase()] ?? 'para'
}

export function isHeading(kind: BlockKind): boolean {
  return kind === 'heading'
}
