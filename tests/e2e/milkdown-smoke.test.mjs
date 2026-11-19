import { strict as assert } from 'node:assert'
import { test, before, after } from 'node:test'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

// ═══════════════════════════════════════════════════════════════════════════
// Milkdown 完整链真实浏览器冒烟：验证 vendored withEditorCore（~80 插件，
// 含 Vite 专有 import.meta.glob）在真实浏览器挂载 + 顶栏命令真实生效。
//
// node 单测无法 import withEditorCore（i18n/strings.ts 用 import.meta.glob），
// 本测试是唯一能覆盖「完整装配」的路径。生产构建（vite build）已先跑过，
// 这里用 vite preview 伺服 dist，驱动 headless Chrome。
//
// 关键：textus 完整 schema 用 md_span/md_code_span/link 节点（无 strong/
// emphasis 等 mark），facade 必须 schema 感知。本测试正是验证该路径。
//
// 跑法：npm run build && node --import tsx --test tests/e2e/milkdown-smoke.test.mjs
// 依赖：系统 Chrome 或 playwright 缓存 chromium，没有则跳过（exit 0）。
// ═══════════════════════════════════════════════════════════════════════════

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PORT = Number(process.env.E2E_PORT || 0)

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p)) ||
  (() => {
    try { return chromium.executablePath() } catch { return null }
  })()

let server = null
let browser = null
let page = null
let port = 0

const freePort = () => new Promise((resolve) => {
  const s = createServer()
  s.listen(0, '127.0.0.1', () => {
    const p = s.address().port
    s.close(() => resolve(p))
  })
})

async function waitReady(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { if ((await fetch(url)).ok) return } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`预览服务器 ${url} 未就绪`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

before(async () => {
  if (!chromePath || !existsSync(chromePath)) {
    console.log('Milkdown 冒烟跳过：未找到 Chrome')
    return
  }
  if (!existsSync(path.join(ROOT, 'dist/index.html'))) {
    throw new Error('dist 不存在：请先跑 npm run build')
  }
  port = PORT || await freePort()
  server = spawn('npx', ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
    cwd: ROOT, stdio: 'ignore',
  })
  await waitReady(`http://127.0.0.1:${port}/`)
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (err) => { console.log('PAGEERROR:', err.message) })
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 40000 })
  await sleep(900)
})

after(async () => {
  if (browser) await browser.close()
  if (server) server.kill()
})

test('Milkdown 完整链冒烟：挂载 + 顶栏格式/表格/模式切换/面板', async (t) => {
  if (!chromePath || !page) {
    t.skip('未找到 Chrome，跳过')
    return
  }
  const check = (name, cond, detail = '') => {
    t.diagnostic(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)
    assert.ok(cond, `${name}${detail ? ' — ' + detail : ''}`)
  }
  const editor = () => page.locator('.textus-editor-shell .ProseMirror')
  const spanInfo = (sel) => page.evaluate((s) => {
    const el = document.querySelector(`.textus-editor-shell .ProseMirror ${s}`)
    return el ? { exists: true, text: el.textContent } : { exists: false, text: '' }
  }, sel)

  // 0. 新建文档，进入默认 edit 模式
  await page.locator('.welcome-btn--primary').click()
  await sleep(900)

  // 1. 默认模式 = Milkdown WYSIWYG（非 CM6）
  const milkdownCount = await page.locator('.textus-editor-shell .ProseMirror').count()
  const cmCount = await page.locator('.cm-editor').count()
  check('默认 edit 模式：Milkdown ProseMirror 挂载', milkdownCount > 0, `ProseMirror=${milkdownCount}`)
  check('默认 edit 模式：不是 CM6', cmCount === 0, `cm-editor=${cmCount}`)

  // 2. 完整链真的能打字（ProseMirror 可编辑 + 插件链无崩溃）
  await editor().click()
  await page.keyboard.type('保真测试内容')
  await sleep(400)
  const text0 = await editor().evaluate((el) => el.textContent)
  check('完整链可编辑：键入内容进入文档', /保真测试内容/.test(text0), `text="${text0}"`)

  // 3. 模式往返保真：edit → 阅读 → 预览（回 edit）→ 内容不丢
  await page.locator('.toolbar-menu-btn', { has: page.locator('.ri-eye-2-fill') }).click()
  await sleep(250)
  await page.locator('.toolbar-submenu-item', { hasText: '阅读模式' }).click()
  await sleep(500)
  await page.locator('.toolbar-menu-btn', { has: page.locator('.ri-eye-2-fill') }).click()
  await sleep(250)
  await page.locator('.toolbar-submenu-item', { hasText: '预览模式' }).click()
  await sleep(600)
  const backToEdit = await page.locator('.textus-editor-shell .ProseMirror').count()
  check('模式切换后回到 Milkdown 编辑', backToEdit > 0, `ProseMirror=${backToEdit}`)
  const mdAfterMode = await editor().evaluate((el) => el.textContent)
  check('模式往返后内容保真（未丢内容）', /保真测试内容/.test(mdAfterMode), `text="${mdAfterMode}"`)

  // 选中当前行（Home→Shift+End）的辅助
  const selectLine = async () => {
    await editor().click()
    await sleep(150)
    await page.keyboard.press('End')
    await page.keyboard.press('Home')
    await page.keyboard.down('Shift')
    await page.keyboard.press('End')
    await page.keyboard.up('Shift')
    await sleep(150)
  }
  // 每个格式用独立的新建文档（隔离嵌套 span 干扰）
  const freshDoc = async () => {
    await page.locator('.toolbar-menu-btn', { has: page.locator('.ri-file-add-line') }).click()
    await sleep(250)
    await page.locator('.toolbar-submenu-item', { hasText: '新建文档' }).click()
    await sleep(700)
    await editor().click()
    await sleep(200)
  }
  const typeAndSelect = async (text) => {
    await editor().click()
    await sleep(150)
    await page.keyboard.type(text)
    await sleep(250)
    await selectLine()
  }

  // 4. 顶栏「粗体」真实生效（selection.bold → md_span rung 2 → <strong>）
  await freshDoc()
  await typeAndSelect('加粗测试')
  await page.locator('.toolbar-btn', { has: page.locator('.ri-bold') }).click()
  await sleep(400)
  const bold = await spanInfo('strong[data-type="md_span"]')
  check('顶栏粗体：selection.bold 真实生效（<strong> md_span）', bold.exists && /加粗测试/.test(bold.text), `strong="${bold.text}"`)

  // 5. 顶栏「斜体」真实生效（selection.italic → md_span rung 1 → <em>）
  await freshDoc()
  await typeAndSelect('斜体测试')
  await page.locator('.toolbar-btn', { has: page.locator('.ri-italic') }).click()
  await sleep(400)
  const italic = await spanInfo('em[data-type="md_span"]')
  check('顶栏斜体：selection.italic 真实生效（<em> md_span）', italic.exists && /斜体测试/.test(italic.text), `em="${italic.text}"`)

  // 6. 顶栏「删除线」真实生效（selection.strike → md_span ~ → <del>）
  await freshDoc()
  await typeAndSelect('删除线测试')
  await page.locator('.toolbar-btn', { has: page.locator('.ri-strikethrough') }).click()
  await sleep(400)
  const strike = await spanInfo('del[data-type="md_span"]')
  check('顶栏删除线：selection.strike 真实生效（<del> md_span）', strike.exists && /删除线测试/.test(strike.text), `del="${strike.text}"`)

  // 7. 顶栏「标题 1」真实生效（insert.heading1 → h1）
  await freshDoc()
  await typeAndSelect('标题一测试')
  await page.locator('.toolbar-menu-btn', { has: page.locator('.ri-text-wrap') }).click()
  await sleep(250)
  await page.locator('.toolbar-submenu-item', { hasText: '标题 1' }).click()
  await sleep(400)
  const h1 = await spanInfo('h1')
  check('顶栏格式→标题1：insert.heading1 真实生效（h1）', h1.exists && /标题一测试/.test(h1.text), `h1="${h1.text}"`)

  // 8. 表格：走真实 UI 流程（工具栏→插入表格→面板→确认）。先把选区收起
  //    （End），否则面板按当前选区替换内容而非在光标处插入。
  await freshDoc()
  await page.keyboard.type('表格前内容')
  await sleep(250)
  await page.keyboard.press('End')
  await sleep(150)
  await page.locator('.toolbar-menu-btn', { has: page.locator('.ri-table-2') }).click()
  await sleep(250)
  await page.locator('.toolbar-submenu-item', { hasText: '插入表格' }).click()
  await sleep(400)
  await page.waitForSelector('.ui-modal', { timeout: 6000 })
  await page.locator('.ui-modal').getByRole('button', { name: '插入表格', exact: true }).click()
  await sleep(700)
  const tableCount = await page.evaluate(() => document.querySelectorAll('.textus-editor-shell .ProseMirror table').length)
  check('顶栏表格→插入表格：UI 流程真实生效（table 节点）', tableCount >= 1, `table=${tableCount}`)

  // 9. 顶栏「查找」面板打开
  await page.locator('.toolbar-btn', { has: page.locator('.ri-search-line') }).click()
  await sleep(400)
  const searchOpen = await page.locator('.search-panel-bar, .ui-modal-overlay').count()
  check('顶栏查找：面板打开', searchOpen > 0, `open=${searchOpen}`)
  await page.keyboard.press('Escape')
  await sleep(300)

  // 10. 顶栏「AI 助手」面板打开（AI 回写依赖 facade.getSelection）
  await page.locator('.toolbar-btn', { has: page.locator('.ri-openai-fill') }).click()
  await sleep(500)
  const aiOpen = await page.locator('.ai-chat-panel').count()
  check('顶栏 AI：面板打开', aiOpen > 0, `open=${aiOpen}`)

  check('冒烟全部通过：Milkdown 完整链挂载 + 顶栏命令真实生效', true)
})
