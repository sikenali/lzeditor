import http from 'http'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// AI 请求全部由前端直连 provider，本机服务除健康检查外，额外记录
// Ctrl+S 保存历史（后端时间戳），供历史面板的非 git 时间线读取。
//
// 为什么还留着：lzc/lzc-manifest.yml 的 health_check 打到 /api/health，
// LPK 的 /api/ 路由也是 exec://3001。删掉整个后端会让盒子首启健康检查失败，
// 所以保留一个零依赖进程顶这个位置 —— 不再挂任何 express / AI 代理路由。
//
// 用 node:http 而不是 express：省掉 express 及其传递依赖（body-parser、
// send、serve-static…），LPK 里随包走的 node_modules 小一大截。

const PORT = Number(process.env.PORT || 3001)
const HOST = process.env.HOST || '127.0.0.1'

// 版本号在启动时读一次，不在每个健康检查请求里读。
// 之前每个请求都 execSync('git describe')：LPK 里没有 git 仓库所以永远失败，
// 白白每 10 秒 fork 一次子进程，返回的还是 'unknown'。
// 打包时 build.sh 会写 backend/version.json；没有它就退回 git describe（dev 用）。
const VERSION = versionFromPackage() || versionFromGit() || 'unknown'

/* ── Ctrl+S 保存历史：后端记录时间，每文档最近 MAX_SAVES 次 ── */

const MAX_SAVES = 10
// 生产（LPK lzc-manifest.yml）用 DATA_DIR=/lzcapp/var/data（持久卷、可写）；
// 可用 LZEDITOR_DATA_DIR 覆盖；默认退回 server/data（dev）。server/data/ 已在
// .gitignore；打包时 build.sh 会拷它进包内 backend/data/（只读挂载，运行时不写）。
const DATA_DIR = process.env.DATA_DIR
  || process.env.LZEDITOR_DATA_DIR
  || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json')

/** 后端记录的保存快照。md/html 冗余存一份以便历史面板直接预览。 */
interface StoredVersion {
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

type VersionStore = Record<string, StoredVersion[]>

let store: VersionStore = loadStore()

function loadStore(): VersionStore {
  try {
    if (existsSync(VERSIONS_FILE)) {
      const parsed = JSON.parse(readFileSync(VERSIONS_FILE, 'utf8'))
      return parsed && typeof parsed === 'object' ? parsed : {}
    }
  } catch { /* 损坏则从空开始 */ }
  return {}
}

/** 落盘为尽力而为：容器只读目录时静默失败，仅内存保留本次会话。 */
function persist(): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(VERSIONS_FILE, JSON.stringify(store))
  } catch { /* 忽略：持久化失败不阻塞保存 */ }
}

function pad(n: number): string { return String(n).padStart(2, '0') }

function formatTs(ts: number): { date: string; time: string } {
  const d = new Date(ts)
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  }
}

/** 每文档保留最近 MAX_SAVES 条（新的在前）。 */
function recordVersion(docId: string, data: { md: string; html: string; changes: number }): StoredVersion {
  const ts = Date.now()
  const { date, time } = formatTs(ts)
  const version: StoredVersion = {
    id: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    docId,
    md: data.md ?? '',
    html: data.html ?? '',
    changes: Number(data.changes) || 0,
    ts,
    date,
    time,
    desc: 'ctrl+s 保存',
    source: 'local',
  }
  const list = store[docId] || []
  // 去重：同内容连续保存不重复落库
  const last = list[0]
  if (last && last.md === version.md) return last
  store[docId] = [version, ...list].slice(0, MAX_SAVES)
  persist()
  return version
}

function listVersions(docId: string): StoredVersion[] {
  return (store[docId] || []).slice(0, MAX_SAVES)
}

/** 读取 POST JSON body（上限防滥用）。 */
function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 2 * 1024 * 1024) { reject(new Error('body too large')); req.destroy() }
    })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch { reject(new Error('bad json')) }
    })
    req.on('error', reject)
  })
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Connection': 'close' })
  res.end(payload)
}

const ok = () => ({ status: 'ok', timestamp: new Date().toISOString() })

function versionFromPackage(): string {
  try {
    return JSON.parse(readFileSync(new URL('../version.json', import.meta.url), 'utf8')).version || ''
  } catch {
    return ''
  }
}

function versionFromGit(): string {
  try {
    return execSync('git describe --tags --always 2>/dev/null', {
      encoding: 'utf8',
      timeout: 2000,
    }).trim() || ''
  } catch {
    // LPK 里没有 git 仓库，git describe 直接失败
    return ''
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const p = url.pathname

  // 健康检查挂在 /api/health 与 /health 两处：dev 走 vite proxy 保留 /api 前缀，
  // LPK 里 lzcinit 转发时会剥掉前缀。
  if (req.method === 'GET' && (p === '/health' || p === '/api/health')) {
    return json(res, 200, { ...ok(), version: VERSION })
  }

  // Ctrl+S 保存历史：GET /api/versions?docId=xxx → 最近 10 次；
  // POST /api/versions {docId,md,html,changes} → 后端记录时间并返回该条。
  if (p === '/api/versions') {
    if (req.method === 'GET') {
      const docId = url.searchParams.get('docId') || ''
      if (!docId) return json(res, 400, { ok: false, error: 'docId required' })
      return json(res, 200, { ok: true, versions: listVersions(docId) })
    }
    if (req.method === 'POST') {
      try {
        const body = await readBody(req)
        const docId = String(body.docId || '')
        if (!docId) return json(res, 400, { ok: false, error: 'docId required' })
        const version = recordVersion(docId, {
          md: String(body.md ?? ''),
          html: String(body.html ?? ''),
          changes: Number(body.changes) || 0,
        })
        return json(res, 200, { ok: true, version })
      } catch (e: any) {
        return json(res, 400, { ok: false, error: String(e?.message || e) })
      }
    }
  }

  json(res, 404, { error: 'not found' })
})

server.listen(PORT, HOST, () => {
  console.log(`lzeditor health/version server running on http://${HOST}:${PORT}`)
})
