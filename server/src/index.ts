import express from 'express'
import cors from 'cors'
import { chatRouter } from './routes/chat.js'
import { settingsRouter } from './routes/settings.js'

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
