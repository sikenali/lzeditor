import express from 'express'
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
const PORT = Number(process.env.PORT || 3001)
const HOST = process.env.HOST || '127.0.0.1'

// CORS：以前是 app.use(cors())，任意源都放行，等于谁能开浏览器谁就能借本机
// 代理转发任意 AI provider 请求。这里按「同源或显式白名单」放行：
//  - 无 Origin（命令行、lzcinit 健康检查）直接放行；
//  - Origin 的 host 与请求 Host 一致即同源（LPK 里 lzcinit 用同一域名同时
//    伺服前端与 /api/ 代理，子域名各异，不能硬编码），放行；
//  - 本机调试端口（vite dev / preview）放行；
//  - 其余一律拒绝，不回 Access-Control-Allow-Origin。
const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
])
const EXTRA_ORIGINS = new Set(
  (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
)

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && typeof origin === 'string') {
    const sameOrigin = (() => {
      try {
        const h = new URL(origin).host
        const reqHost = String(req.headers.host || '').toLowerCase()
        return h.toLowerCase() === reqHost
      } catch {
        return false
      }
    })()
    if (!sameOrigin && !DEV_ORIGINS.has(origin) && !EXTRA_ORIGINS.has(origin)) {
      return next() // 不设 ACAO，浏览器侧表现为跨域被拒
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  // 预检直接应答，不进后续路由
  if (req.method === 'OPTIONS') {
    if (res.headersSent && !res.getHeader('Access-Control-Allow-Origin')) return next()
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key,anthropic-version')
    res.setHeader('Access-Control-Max-Age', '86400')
    res.setHeader('Access-Control-Allow-Credentials', 'false')
    return res.sendStatus(204)
  }
  next()
})

// body 上限：以前无限制，超大 messages 可以打满内存
app.use(express.json({ limit: process.env.BODY_LIMIT || '1mb' }))

// lzcinit 的 exec:// 路由会先剥掉路由前缀再转发：manifest 里写 `/api/=exec://3001`，
// 外部请求 /api/health 实际打到后端的是 /health。之前只有 /api/* 挂载，导致 LPK 里
// 所有后端接口都是 404（实测 /api/api/health 才返回 200）。两种前缀都挂上：
// /api/* 供 dev（vite proxy 保留前缀）与本机直连，根路径供 LPK 经 lzcinit 转发。
app.use('/api/chat', chatRouter)
app.use('/chat', chatRouter)
app.use('/api/settings', settingsRouter)
app.use('/settings', settingsRouter)

const health = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
}
app.get('/api/health', health)
app.get('/health', health)

app.listen(PORT, HOST, () => {
  console.log(`lzeditor AI server running on http://${HOST}:${PORT}`)
})
