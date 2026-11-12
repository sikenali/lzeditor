import type { DocVersion } from '../shared/types'

/** git 提交信息（来自 electron git:history IPC 的 commits）。 */
export interface GitVersionLike {
  oid: string
  message: string
  author: string
  ts: number
  changes: number
  gitPath?: string
}

/**
 * 合并时间线：本地快照 + git 提交按 `ts` 倒序。
 *
 * git 项转成 DocVersion（id=oid、source:'git'、isFromGit=true、desc=message、
 * md/html 置空——内容由 HistoryPanel 选中时经 git:show 惰性拉取）。
 */
export function mergeTimeline(local: DocVersion[], git: GitVersionLike[], gitPath?: string): DocVersion[] {
  const gitVersions: DocVersion[] = git.map(g => {
    const t = formatTimeTs(g.ts)
    return {
      id: g.oid,
      source: 'git',
      isFromGit: true,
      gitPath: g.gitPath ?? gitPath,
      desc: g.message,
      changes: g.changes,
      ts: g.ts,
      md: '',
      html: '',
      time: t.time,
      date: t.date,
    }
  })
  return [...local, ...gitVersions].sort((a, b) => b.ts - a.ts)
}

/** 短哈希：git SHA 取前 6 位；本地纯数字 id 走现有的 parseInt→toString(16)。 */
export function commitShortHash(id: string): string {
  if (/^\d+$/.test(id)) {
    const n = parseInt(id, 10)
    return n.toString(16).slice(-6)
  }
  return id.slice(0, 6)
}

/**
 * 行级 diff 的行数（added + deleted），行级 LCS 近似。
 *
 * 不必 Myers：用于给时间线柱状图定高度，近似即可。
 * 对 md 级文件（≤ 数千行）O(n*m) 足够快。
 */
export function countLineDiff(prev: string, next: string): number {
  const a = prev === '' ? [] : prev.split('\n')
  const b = next === '' ? [] : next.split('\n')
  const m = a.length, n = b.length
  const dp: number[][] = new Array(m + 1).fill(0).map(() => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const lcs = dp[m][n]
  return (m - lcs) + (n - lcs)
}

/** epoch ms → { date: 'YYYY-MM-DD', time: 'HH:MM:SS' }。 */
export function formatTimeTs(ts: number): { date: string; time: string } {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  }
}
