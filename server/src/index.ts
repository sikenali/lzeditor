import express from 'express'
import cors from 'cors'
import { chatRouter } from './routes/chat.js'
import { settingsRouter } from './routes/settings.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// LPK 运行时 /lzcapp/pkg 只读，DATA_DIR 由 manifest 指到持久卷 /lzcapp/var/data
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/chat', chatRouter)
app.use('/api/settings', settingsRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log('lzeditor AI server running on http://localhost:' + PORT)
})
