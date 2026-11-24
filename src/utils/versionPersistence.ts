import type { DocVersion } from '../shared/types'

const MAX_VERSIONS = 10
const KEY_PREFIX = 'lzeditor-versions-'

/** 过滤脏条目：只留带 id/ts/source 的合法快照。 */
export function normalizeVersions(raw: unknown): DocVersion[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is DocVersion =>
    !!v && typeof v === 'object'
    && typeof (v as any).id === 'string'
    && typeof (v as any).ts === 'number'
    && ((v as any).source === 'git' || (v as any).source === 'local')
  )
}

/** 截断到上限，保留最新的 max 条。 */
export function capVersions(vs: DocVersion[], max = MAX_VERSIONS): DocVersion[] {
  return vs.slice(-max)
}

/** 读取 lzeditor-versions-{docId} 的本地快照；没有或解析失败返回 []。 */
export function loadVersions(docId: string): DocVersion[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + docId)
    if (!raw) return []
    return capVersions(normalizeVersions(JSON.parse(raw)))
  } catch {
    return []
  }
}

/** 落盘 lzeditor-versions-{docId}；失败不阻塞编辑。 */
export function saveVersions(docId: string, versions: DocVersion[]): void {
  try {
    localStorage.setItem(KEY_PREFIX + docId, JSON.stringify(capVersions(versions)))
  } catch {
    // 忽略：快照持久化失败不阻塞编辑
  }
}
