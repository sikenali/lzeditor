/**
 * 浏览器回归：编辑器交互（任务 7）。
 *
 * 在真实 headless Chrome 里驱动生产构建，验证 CM6 源码编辑器装配层的行为：
 *  - 输入辅助：自动配对（`(`→`()`、空配对 Backspace 整对删除）、智能粘贴
 *    （URL → 链接 markdown）、打字机/焦点跟随。
 *  - AI 插入/改写：mock SSE 流式端点，驱动 AIPanel 发送，断言流式增量进入文档
 *    （含 mermaid 围栏源码原样落进编辑器）。
 *
 * 与 e2e.test.mjs 同构：node:test + playwright-core，先 build 再 vite preview。
 */

import { strict as assert } from 'node:assert'
import { test, before, after } from 'node:test'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PORT = Number(process.env.E2E_PORT || 0)

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p))

let server: ReturnType<typeof spawn> | null = null
let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
let page: Awaited<ReturnType<typeof chromium.launch>> extends Promise<infer T>
  ? T extends { newPage(): Promise<infer P> }
    ? P
    : never
  : never
let port = 0

const freePort = (): Promise<number> =>
  new Promise((resolve) => {
    const s = createServer()
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as { port: number }).port
      s.close(() => resolve(p))
    })
  })

async function waitReady(url: string, tries = 60): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`预览服务器 ${url} 未就绪`)
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

before(async () => {
  if (!chromePath) {
    console.log('E2E 跳过：未找到 Chrome（可设 CHROME_PATH 指定）')
    return
  }
  if (!existsSync(path.join(ROOT, 'dist/index.html'))) {
    throw new Error('dist 不存在：请先跑 npm run build')
  }
  port = PORT || (await freePort())
  server = spawn('npx', ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  })
  await waitReady(`http://127.0.0.1:${port}/`)
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  // 预置 mock API Key（lzeditor-api-keys 单独落盘，settings 只存 selectedModelId），
  // 使 AIPanel 的 send 能拿到 activeKey 并真正发起 fetch（由 test 内 page.route 拦截）。
  await page.addInitScript(() => {
    localStorage.setItem('lzeditor-api-keys', JSON.stringify([
      { id: 'mock-ai', key: 'sk-mock', model: 'gpt-4o', endpoint: 'https://mock.test', format: 'openai', enabled: true },
    ]))
    localStorage.setItem('lzeditor-settings', JSON.stringify({ selectedModelId: 'mock-ai' }))
  })
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 40000 })
  await sleep(900)
})

after(async () => {
  if (browser) await browser.close()
  if (server) server.kill()
})

test('浏览器回归：输入辅助 + 特效降级 + AI 流式插入', async (t) => {
  if (!chromePath || !page) {
    t.skip('未找到 Chrome，E2E 跳过')
    return
  }
  const check = (name: string, cond: boolean, detail = ''): void => {
    t.diagnostic(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)
    assert.ok(cond, `${name}${detail ? ' — ' + detail : ''}`)
  }
  const editable = () => page.locator('.cm-editor .cm-content').first()
  const shellText = async () => (await page.locator('.cm-editor .cm-content').innerText()) || ''
  page.on('request', (r) => {
    if (/chat\/completions/i.test(r.url())) t.diagnostic(`[net] ${r.method()} ${r.url()}`)
  })
  page.on('requestfailed', (r) => {
    if (/chat\/completions/i.test(r.url())) t.diagnostic(`[net-fail] ${r.url()} ${r.failure()?.errorText}`)
  })

  // ── 0. 新建文档，挂载编辑器 ────────────────────────────────────────────────
  await page.locator('.welcome-btn--primary').click()
  await sleep(700)
  check('编辑器挂载：出现 .cm-editor', (await page.locator('.cm-editor').count()) > 0)
  check('编辑器挂载：出现内容区 .cm-content', (await editable().count()) > 0)

  // ── 1. 自动配对：`(` 键入生成 `()`，光标居中，Backspace 整对删除 ─────────────
  await editable().click()
  await sleep(200)
  await page.keyboard.type('(')
  await sleep(350)
  const afterOpen = await shellText()
  check('自动配对：键入 `(` 得到 `()`', afterOpen.includes('()'), JSON.stringify(afterOpen))
  await page.keyboard.press('Backspace')
  await sleep(350)
  const afterBackspace = await shellText()
  check('自动配对：空配对 `()` 上 Backspace 整对删除', !afterBackspace.includes('()'), JSON.stringify(afterBackspace))

  // 引号配对
  await editable().click()
  await page.keyboard.type('"')
  await sleep(350)
  check('自动配对：键入 `"` 得到 `""`', (await shellText()).includes('""'))
  await page.keyboard.press('Backspace')
  await sleep(300)

  // ── 2. 智能粘贴：URL → 链接 markdown ──────────────────────────────────────
  await editable().click()
  await sleep(150)
  await page.evaluate(() => {
    const target = document.querySelector('.cm-editor .cm-content') as HTMLElement
    target.focus()
    const dt = new DataTransfer()
    dt.setData('text/plain', 'https://example.com')
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    target.dispatchEvent(ev)
  })
  await sleep(400)
  const afterPaste = await shellText()
  check('智能粘贴：URL 粘贴生成链接 markdown', afterPaste.includes('example.com'), JSON.stringify(afterPaste))

  // ── 3. 打字机/焦点跟随：聚焦可编辑块后文档获得焦点且块内可输入 ─────────────
  await editable().click()
  await sleep(200)
  const focused = await page.evaluate(() => {
    const el = document.activeElement
    return el instanceof HTMLElement && el.closest('.cm-content') !== null
  })
  check('打字机/焦点：点击可编辑块后光标落于块内', focused)
  await page.keyboard.type('X')
  await sleep(300)
  check('打字机/焦点：聚焦后可正常输入', (await shellText()).includes('X'))

  // ── 4. AI 流式插入：mock SSE 驱动 AI 聊天抽屉，增量进入文档 ─────────────────
  await page.route('**/v1/chat/completions', async (route) => {
    const body = [
      'data: {"choices":[{"delta":{"content":"LZ_AI_STREAM_"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"OK"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n')
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body })
  })
  await page.locator('.toolbar-btn', { has: page.locator('.ri-openai-fill') }).click()
  await page.waitForSelector('.ai-chat-panel', { timeout: 8000 })
  await sleep(250)
  await page.locator('.ai-chat-input').fill('介绍一下 LZ')
  await page.waitForFunction(() => {
    const btn = document.querySelector<HTMLButtonElement>('.ai-chat-send')
    return !!btn && !btn.disabled
  }, undefined, { timeout: 5000 })
  await page.locator('.ai-chat-send').click()
  // 聊天抽屉里每条回复是一张 assistant 卡片，等它进入 done 态（对应旧浮层的输出区收尾）。
  await page.waitForSelector('.ai-chat-assistant-card--done .ai-chat-reply', { timeout: 10000 })
  await sleep(500)
  const afterAI = await shellText()
  check('AI 流式插入：mock 增量已进入文档', afterAI.includes('LZ_AI_STREAM_OK'), JSON.stringify(afterAI))

  // ── 5. 区块内特效降级：mermaid 围栏渲染为不可编辑 source-safe 块 ───────────
  // 聊天抽屉的 composer 是常显的（不再有「结果态隐藏输入区」），这里关闭再开只为
  // 验证关闭按钮并重置本轮的输入/流式态；消息列表会保留上一轮历史。
  const doneCardsBefore = await page.locator('.ai-chat-assistant-card--done').count()
  await page.locator('.ai-chat-close').click()
  await sleep(300)
  await page.locator('.toolbar-btn', { has: page.locator('.ri-openai-fill') }).click()
  await page.waitForSelector('.ai-chat-panel .ai-chat-input', { timeout: 8000 })
  await sleep(200)
  await page.route('**/v1/chat/completions', async (route) => {
    const fence = '\n```mermaid\ngraph TD\n  A-->B\n```\n'
    const body = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: fence } }] })}`,
      '',
      'data: [DONE]',
      '',
    ].join('\n')
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body })
  })
  await page.locator('.ai-chat-input').fill('画个流程图')
  await page.waitForFunction(() => {
    const btn = document.querySelector<HTMLButtonElement>('.ai-chat-send')
    return !!btn && !btn.disabled
  }, undefined, { timeout: 5000 })
  await page.locator('.ai-chat-send').click()
  // 上一轮的 done 卡片仍在列表里，按数量等待「新」一张 done 卡片出现。
  await page.waitForFunction(
    (n) => document.querySelectorAll('.ai-chat-assistant-card--done').length > n,
    doneCardsBefore,
    { timeout: 10000 },
  )
  await sleep(600)
  const afterMermaid = await shellText()
  check('特效降级：mermaid 围栏源码进入文档', afterMermaid.includes('```mermaid') && afterMermaid.includes('graph TD'), JSON.stringify(afterMermaid))
  check('特效降级：mermaid 源码被原样保留（A-->B）', afterMermaid.includes('A-->B'), JSON.stringify(afterMermaid))
  await page.unroute('**/v1/chat/completions')
})
