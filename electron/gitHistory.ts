/**
 * Git 历史读取（Electron 主进程，isomorphic-git + Node fs）。
 *
 * 渲染进程无 Node fs / 无真实磁盘路径，故 git 历史必须经 IPC 到这里读。
 * 本模块不 import 'electron'——保证 node 单测可直接 import（isomorphic-git 纯 JS）。
 *
 * 授权（isAllowedPath）在 electron/main.ts 的 IPC handler 层做，本模块只读仓库。
 */

import * as git from 'isomorphic-git'
import * as fs from 'fs'
import * as path from 'path'

/** git 提交上限：防大仓库逐 commit blob diff 卡顿。 */
const MAX_GIT_COMMITS = 50

export interface GitCommitInfo {
  oid: string
  message: string
  author: string
  /** epoch ms */
  ts: number
  changes: number
}

export interface GitHistoryResult {
  ok: boolean
  repoRoot?: string
  /** repoRoot 相对路径（正斜杠） */
  gitPath?: string
  commits?: GitCommitInfo[]
  error?: string
}

export interface GitShowResult {
  ok: boolean
  text?: string
  error?: string
}

async function readBlobText(repoRoot: string, rel: string, oid: string): Promise<string> {
  const { blob } = await git.readBlob({ fs, dir: repoRoot, oid, filepath: rel })
  return new TextDecoder().decode(blob)
}

/**
 * 该文件在 repo 内相对路径（正斜杠分隔）。不在仓库内会 throw，由调用方 catch。
 */
async function resolveRelPath(filePath: string): Promise<{ repoRoot: string; rel: string }> {
  const repoRoot = await git.findRoot({ fs, filepath: filePath })
  const rel = path.relative(repoRoot, filePath).split(path.sep).join('/')
  return { repoRoot, rel }
}

/**
 * 该文件的 git 提交历史（前 MAX_GIT_COMMITS 条），每条含 changes（相对父提交的行增删）。
 * 非仓库 / 出错 → { ok: false }。
 */
export async function getGitHistory(filePath: string): Promise<GitHistoryResult> {
  try {
    const { repoRoot, rel } = await resolveRelPath(filePath)
    let log: any[]
    try {
      log = await git.log({ fs, dir: repoRoot, filepath: rel, depth: MAX_GIT_COMMITS })
    } catch (e: any) {
      // 仓库尚无任何提交（刚 init / 从未 commit）→ 无历史，视为空而非失败
      if (e?.constructor?.name === 'NotFoundError' || /Could not find refs\//.test(e?.message || '')) {
        return { ok: true, repoRoot, gitPath: rel, commits: [] }
      }
      throw e
    }
    const commits: GitCommitInfo[] = []
    for (const c of log.slice(0, MAX_GIT_COMMITS)) {
      const ts = c.commit.committer.timestamp * 1000
      const content = await readBlobText(repoRoot, rel, c.oid)
      const parent = c.commit.parent && c.commit.parent[0]
      const changes = parent
        ? countLineDiff(await readBlobText(repoRoot, rel, parent), content)
        : (content === '' ? 0 : content.split('\n').length)
      commits.push({
        oid: c.oid,
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        ts,
        changes,
      })
    }
    return { ok: true, repoRoot, gitPath: rel, commits }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'git history failed' }
  }
}

/**
 * 该文件在 oid 提交处的内容（只读 blob，不改仓库）。出错 → { ok: false }。
 */
export async function getGitShow(filePath: string, oid: string): Promise<GitShowResult> {
  try {
    const { repoRoot, rel } = await resolveRelPath(filePath)
    const text = await readBlobText(repoRoot, rel, oid)
    return { ok: true, text }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'git show failed' }
  }
}

/**
 * 行级 diff 的行数（added + deleted），行级 LCS 近似。
 * 与 src/utils/historyTimeline.ts 的 countLineDiff 同算法——electron 不得 import src/，
 * 跨模块边界的小型重复是刻意的。
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
