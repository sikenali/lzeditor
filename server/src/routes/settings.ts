import { Router } from 'express'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, '../../data/keys.db')

const router = Router()
const db = new Database(dbPath)

db.exec('CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, provider TEXT NOT NULL, key_hash TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT 0)')

router.post('/save', (req: any, res: any) => {
  const { provider, key } = req.body
  if (!provider || !key) {
    return res.status(400).json({ error: 'provider and key required' })
  }
  const hash = bcrypt.hashSync(key, 10)
  const stmt = db.prepare('INSERT OR REPLACE INTO api_keys (id, provider, key_hash) VALUES (?, ?, ?)')
  stmt.run(provider, provider, hash)
  res.json({ success: true })
})

router.get('/check', (req: any, res: any) => {
  const provider = req.query.provider as string
  const stmt = db.prepare('SELECT id FROM api_keys WHERE provider = ?')
  const row = stmt.get(provider)
  res.json({ exists: !!row })
})

export const settingsRouter = router
