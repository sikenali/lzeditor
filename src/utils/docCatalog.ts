import { silentError } from './silentError'

/**
 * 文档目录（标题 / 路径 / 所属库）的持久化。
 *
 * 只存目录，正文仍走现有的 lzeditor-doc-{id} 单键——目录小、可整份覆盖写，
 * 正文大且要按文档独立失效，混在一个键里会互相拖累。
 */

/** builtin 标「来自 DEFAULT_DOCS」，落盘时丢弃、恢复时重建。 */
export interface CatalogEntry {
  id: string
  title: string
  path: string
  libraryId?: string
  /** UI 语义：内置使用手册。readme 故意不标——LibraryTree 靠它给 readme 显示「还原出厂」。 */
  system?: boolean
  /** 持久化语义：是否出厂文档。persistCatalog 用这个过滤，落盘时丢掉。 */
  builtin?: boolean
}

export interface Catalog {
  docs: CatalogEntry[]
  docLibraries: Array<{ id: string; name: string }>
  nextUntitledIdx: number
  activeDocId: string
}

const CATALOG_KEY = 'lzeditor-catalog'

export const DEFAULT_LIBRARIES: Array<{ id: string; name: string }> = [
  { id: 'default', name: 'Default' },
]

/**
 * 存目录。builtin 文档从不落盘——它们的正文覆盖本来就在 lzeditor-doc-{id} 里，
 * 出厂内容随代码走，存一份只会随版本漂移成脏数据。
 */
export function persistCatalog(catalog: Catalog): boolean {
  const toStore: Catalog = {
    ...catalog,
    docs: catalog.docs.filter(d => !d.builtin),
  }
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(toStore))
    return true
  } catch (e) {
    silentError('保存文档目录失败', e)
    return false
  }
}

function readCatalog(): Catalog | null {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Catalog>
    if (!parsed || !Array.isArray(parsed.docs)) return null
    return {
      docs: parsed.docs,
      docLibraries: Array.isArray(parsed.docLibraries) ? parsed.docLibraries : DEFAULT_LIBRARIES,
      nextUntitledIdx: typeof parsed.nextUntitledIdx === 'number' ? parsed.nextUntitledIdx : 1,
      activeDocId: typeof parsed.activeDocId === 'string' ? parsed.activeDocId : '',
    }
  } catch (e) {
    silentError('读取文档目录失败', e)
    return null
  }
}

/**
 * 合并：用户文档在前（保留创建顺序），出厂文档在后。
 *
 * 按 id 去重：出厂文档里 id 已存在的不再追加。正常流程下 persistCatalog 不会存
 * 出厂文档，去重只是为了挡住历史脏数据——不然 readme 会重复出现。
 *
 * 条目标记原样保留：readme 出厂时故意不带 system，这里不能替它补上。
 */
export function mergeDocs(
  storedUserDocs: CatalogEntry[],
  builtinDocs: CatalogEntry[],
): CatalogEntry[] {
  const seen = new Set(storedUserDocs.map(d => d.id))
  return [...storedUserDocs, ...builtinDocs.filter(d => !seen.has(d.id))]
}

/**
 * 恢复整场会话。没有任何存档、或存档指向的文档已被删掉时，回落到出厂列表。
 *
 * 没有任何存档时原样返回 builtinDocs——readme 必须保持不带 system 标记，
 * 强标 true 会改变 DocumentMetaBar / LibraryPanel 的用户文档计数。
 */
export function restoreSession(
  builtinDocs: CatalogEntry[],
  fallbackActiveId: string,
): Catalog {
  const stored = readCatalog()
  if (!stored) {
    return {
      docs: builtinDocs.slice(),
      docLibraries: DEFAULT_LIBRARIES,
      nextUntitledIdx: 1,
      activeDocId: fallbackActiveId,
    }
  }
  const exists = stored.docs.some(d => d.id === stored.activeDocId)
  return {
    docs: mergeDocs(stored.docs, builtinDocs),
    docLibraries: stored.docLibraries.length > 0 ? stored.docLibraries : DEFAULT_LIBRARIES,
    nextUntitledIdx: Math.max(1, stored.nextUntitledIdx),
    activeDocId: exists ? stored.activeDocId : fallbackActiveId,
  }
}
