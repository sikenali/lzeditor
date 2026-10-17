import { Router } from 'express'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../../data')
const dbPath = path.join(dataDir, 'keys.db')

const router = Router()

// better-sqlite3 是原生模块，必须在真正用到时才加载
// （模块加载期初始化会让 tsx/ESM 直接 segfault，整个后端起不来）
const requireCjs = createRequire(import.meta.url)
let db: any = null
let bcrypt: any = null

function load(): void {
  if (!bcrypt) bcrypt = requireCjs('bcryptjs')
  if (!db) {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    const Database = requireCjs('better-sqlite3')
    db = new Database(dbPath)
    db.exec('CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, provider TEXT NOT NULL, key_hash TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT 0)')
  }
}

router.post('/save', (req: any, res: any) => {
  const { provider, key } = req.body
  if (!provider || !key) return res.status(400).json({ error: 'provider and key required' })
  try {
    load()
    const hash = bcrypt.hashSync(key, 10)
    db.prepare('INSERT OR REPLACE INTO api_keys (id, provider, key_hash, created_at) VALUES (?, ?, ?, ?)')
      .run(provider, provider, hash, Date.now())
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/check', (req: any, res: any) => {
  const provider = req.query.provider as string
  try {
    load()
    const row = db.prepare('SELECT id FROM api_keys WHERE provider = ?').get(provider)
    res.json({ exists: !!row })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/** 本机保存过密钥的服务商列表（明文 key 只存在浏览器 localStorage）。 */
router.get('/providers', (_req: any, res: any) => {
  try {
    load()
    const rows = db.prepare('SELECT provider FROM api_keys').all() as Array<{ provider: string }>
    res.json({ providers: rows.map(r => r.provider) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export const settingsRouter = router
