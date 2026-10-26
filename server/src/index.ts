import http from 'http'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

// AI 请求全部由前端直连 provider，本机服务只剩健康检查这一件事。
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

const server = http.createServer((req, res) => {
  // 健康检查挂在 /api/health 与 /health 两处：dev 走 vite proxy 保留 /api 前缀，
  // LPK 里 lzcinit 转发时会剥掉前缀。
  if (req.method !== 'GET' || (req.url !== '/health' && req.url !== '/api/health')) {
    res.writeHead(404, { 'Content-Type': 'application/json', 'Connection': 'close' })
    return res.end(JSON.stringify({ error: 'not found' }))
  }
  const body = JSON.stringify({ ...ok(), version: VERSION })
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(body)
})

server.listen(PORT, HOST, () => {
  console.log(`lzeditor health server running on http://${HOST}:${PORT}`)
})
