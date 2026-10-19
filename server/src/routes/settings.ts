import { Router } from 'express'
import { createHash, randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// LPK 运行时 /lzcapp/pkg 是只读挂载，写进包内 data/ 会 EROFS；
// manifest 已把 DATA_DIR 指向持久卷 /lzcapp/var/data，dev 下无此变量则回落包内路径。
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data')
const storePath = path.join(dataDir, 'keys.json')

const router = Router()

/**
 * 本机 API key 元信息存储。
 * 明文 key 只在浏览器 localStorage；这里存 provider 列表 + 单向摘要，
 * 用来看「本机保存过哪些服务」。
 *
 * 不用 better-sqlite3：v13 的 native addon 在 Node v20.19.x 上执行
 * db.exec() 时会直接 SIGSEGV，把整个进程带崩（tsx 与原生 node 都一样）。
 * 换成本地 JSON 文件 + node:crypto，零 native 依赖。
 */
type Entry = { id: string; provider: string; digest: string; createdAt: number }

function readStore(): Record<string, Entry> {
  try {
    if (!fs.existsSync(storePath)) return {}
    return JSON.parse(fs.readFileSync(storePath, 'utf8')) as Record<string, Entry>
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, Entry>): void {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8')
}

const digest = (key: string) => createHash('sha256').update(key).digest('hex')

router.post('/save', (req: any, res: any) => {
  const { provider, key } = req.body || {}
  if (!provider || !key) {
    return res.status(400).json({ error: 'provider and key required' })
  }
  const store = readStore()
  store[provider] = { id: provider, provider, digest: digest(key), createdAt: Date.now() }
  writeStore(store)
  res.json({ success: true })
})

router.get('/check', (req: any, res: any) => {
  const provider = String(req.query.provider || '')
  res.json({ exists: Boolean(provider && readStore()[provider]) })
})

/** 校验客户端传来的明文 key 是否与本机保存的摘要一致。 */
router.post('/verify', (req: any, res: any) => {
  const { provider, key } = req.body || {}
  if (!provider || !key) return res.status(400).json({ error: 'provider and key required' })
  const entry = readStore()[provider]
  res.json({ match: Boolean(entry && entry.digest === digest(key)) })
})

router.get('/providers', (_req: any, res: any) => {
  res.json({ providers: Object.keys(readStore()).sort() })
})

router.delete('/providers/:provider', (req: any, res: any) => {
  const store = readStore()
  const provider = String(req.params.provider || '')
  const removed = Boolean(store[provider])
  delete store[provider]
  writeStore(store)
  res.json({ success: removed })
})

export const settingsRouter = router
