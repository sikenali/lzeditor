import type { DocVersion } from '../shared/types'

/**
 * 后端 Ctrl+S 保存历史的客户端封装。
 *
 * 保存时间由后端记录（server/src/index.ts 的 /api/versions），历史面板的
 * 非 git 时间线读取最近 10 次 Ctrl+S 保存。dev 经 vite /api 代理到本机 3001，
 * LPK 里 /api/ 由 lzcinit 直接 exec://3001。
 */

/** 后端返回的保存快照（与 server 的 StoredVersion 对齐）。 */
export interface ServerVersion {
  id: string
  docId: string
  md: string
  html: string
  changes: number
  /** epoch ms（服务器时钟）。 */
  ts: number
  date: string
  time: string
  desc: string
  source: 'local'
}

export function toDocVersion(v: ServerVersion): DocVersion {
  return {
    id: v.id,
    md: v.md,
    html: v.html,
    changes: v.changes,
    ts: v.ts,
    date: v.date,
    time: v.time,
    desc: v.desc || 'ctrl+s 保存',
    source: 'local',
  }
}

/** Ctrl+S 保存：后端记录时间并返回该条快照；失败（离线/后端未起）返回 null。 */
export async function recordVersion(
  docId: string,
  md: string,
  html: string,
  changes: number,
): Promise<DocVersion | null> {
  try {
    const res = await fetch('/api/versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, md, html, changes }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.ok && data.version ? toDocVersion(data.version) : null
  } catch {
    return null
  }
}

/** 拉取最近 10 次后端 Ctrl+S 保存；失败返回 null（调用方回退本地缓存）。 */
export async function fetchVersions(docId: string): Promise<DocVersion[] | null> {
  try {
    const res = await fetch(`/api/versions?docId=${encodeURIComponent(docId)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.ok && Array.isArray(data.versions) ? data.versions.map(toDocVersion) : null
  } catch {
    return null
  }
}
