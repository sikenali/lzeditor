import { strict as assert } from 'node:assert'
import { test, before, after } from 'node:test'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

// ═══════════════════════════════════════════════════════════════════════════
// 真实浏览器 E2E：驱动 headless Chrome 跑生产构建，验证「界面操作真的生效」。
//
// 与 tests/*.test.mjs（happy-dom 断言 React 处理器/样式 prop）不同，这里量的是
// 计算样式和真实 DOM 副作用——点开关后 aria-checked 翻没翻、localStorage 落没落、
// 输入框 focus 出没出外发光。happy-dom 做不到这些。
//
// 跑法：npm run test:e2e（先 npm run build，再用 vite preview 伺服 dist）
// 依赖：系统里要有 Chrome（chromium/google-chrome），没有则跳过（exit 0）。
// ═══════════════════════════════════════════════════════════════════════════

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PORT = Number(process.env.E2E_PORT || 0) // 0 = 自动挑空闲端口

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
    try { if ((await fetch(url)).ok) return } catch { /* 还没起来 */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`预览服务器 ${url} 未就绪`)
}

before(async () => {
  if (!chromePath) {
    console.log('E2E 跳过：未找到 Chrome（可设 CHROME_PATH 指定）')
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
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 40000 })
  await page.waitForTimeout(900)
})

after(async () => {
  if (browser) await browser.close()
  if (server) server.kill()
})

test('真实浏览器：设置中心全量交互 + DESIGN.md §8/§9/§10 样式', async (t) => {
  if (!chromePath || !page) {
    t.skip('未找到 Chrome，E2E 跳过')
    return
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const check = (name, cond, detail = '') => {
    t.diagnostic(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)
    assert.ok(cond, `${name}${detail ? ' — ' + detail : ''}`)
  }
  const getLS = () => page.evaluate(() => ({ ...localStorage }))
  const lsGet = async (key) => JSON.parse((await getLS())[key] || 'null')

  // 0. 新建文档，让编辑器/预览挂载
  await page.locator('.welcome-btn--primary').click()
  await sleep(700)
  check('新建文档：编辑器挂载', (await page.locator('.cm-editor').count()) > 0)

  // 1. 打开设置中心
  await page.locator('.toolbar-btn', { has: page.locator('.ri-settings-3-fill') }).click()
  await page.waitForSelector('.settings-panel-shell', { timeout: 10000 })
  await sleep(300)
  const modal = page.locator('.ui-modal').first()
  check('设置中心弹框已打开', (await modal.count()) > 0)
  const ms = await modal.evaluate((el) => {
    const c = getComputedStyle(el)
    const ov = document.querySelector('.ui-modal-overlay')
    return {
      w: parseFloat(c.width), h: parseFloat(c.height), r: parseFloat(c.borderRadius),
      mask: ov ? getComputedStyle(ov).backgroundColor : '',
    }
  })
  check('§8.1 尺寸 = min(92vw,1400px) × min(92vh,calc(100vh-40px))',
    Math.abs(ms.w - Math.min(1440 * 0.92, 1400)) < 2 && Math.abs(ms.h - Math.min(900 * 0.92, 860)) < 2,
    `${ms.w}px × ${ms.h}px`)
  check('§8.1 圆角 18px', ms.r === 18, `实测 ${ms.r}px`)
  check('§8.1 遮罩 rgba(0,0,0,0.4)', /rgba\(0,\s*0,\s*0,\s*0\.4\)/.test(ms.mask), ms.mask)

  const rowSwitch = (text) => page.locator('.settings-panel-shell').locator(`text="${text}"`)
    .locator('xpath=ancestor::*[.//button[@role="switch"]][1]').locator('button[role="switch"]')

  // 2. 编辑设置：排版开关
  await page.locator('.settings-nav-row', { hasText: '个性设置' }).click()
  await sleep(250)
  await page.locator('.settings-subtab', { hasText: '编辑设置' }).click()
  await sleep(400)
  async function toggleAndVerify(label, key) {
    const sw = rowSwitch(label)
    const before = (await sw.getAttribute('aria-checked')) === 'true'
    await sw.click()
    await sleep(400)
    const after = (await sw.getAttribute('aria-checked')) === 'true'
    const ls = await lsGet('lzeditor-settings')
    check(`${label} 开关：取反且落盘`, after !== before && ls && ls[key] === after, `${before}→${after}, ls.${key}=${ls && ls[key]}`)
  }
  await toggleAndVerify('首行缩进', 'textIndent')
  await toggleAndVerify('两端对齐', 'textJustify')

  // 3. 编辑字体下拉框
  const editorFontSel = page.locator('.settings-panel-shell .ui-select-trigger').first()
  await editorFontSel.click()
  await sleep(300)
  const opts = page.locator('.ui-select-menu:visible .ui-select-item:not(.disabled)')
  const optLabels = await opts.locator('.ui-select-item-label').allInnerTexts()
  check('编辑字体下拉框：展开出选项', optLabels.length >= 2, optLabels.join(' / '))
  const curFont = (await editorFontSel.innerText()).trim()
  const targetFont = optLabels.find((o) => o !== curFont)
  if (targetFont) {
    await opts.filter({ hasText: targetFont }).first().click()
    await sleep(450)
  }
  const newFontLabel = (await page.locator('.settings-panel-shell .ui-select-trigger').first().innerText()).trim()
  const fontLS = await lsGet('lzeditor-settings')
  check('编辑字体下拉框：选中生效并落盘', newFontLabel !== curFont && !!fontLS.editorFont, `${curFont} → ${newFontLabel}, editorFont=${fontLS.editorFont}`)

  // 4. 主题设置：主题卡/强调色/布局
  await page.locator('.settings-nav-row', { hasText: '主题设置' }).click()
  await sleep(400)
  const primaryBefore = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())
  await page.locator('.theme-preview-card', { hasText: '深色主题' }).click()
  await sleep(500)
  const primaryAfter = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())
  check('外观主题：点深色卡片即时换主题', primaryBefore !== primaryAfter, `${primaryBefore} → ${primaryAfter}`)
  await page.locator('.accent-item').first().click()
  await sleep(400)
  check('强调色：点色盘即时生效', (await lsGet('lzeditor-settings'))?.accentColor !== undefined)
  await page.locator('.layout-card', { hasText: '侧边栏模式' }).click()
  await sleep(500)
  check('导航布局：点侧边栏即时切 nav-mode-left', (await page.locator('.app.nav-mode-left').count()) > 0)

  // 5. 模型管理：UiInput 样式 + 交互（§8.2 / §10.2）
  await page.locator('.settings-nav-row', { hasText: '模型管理' }).click()
  await sleep(400)
  const inputBox = page.locator('.settings-panel-shell .ui-input').first()
  const inpStyle = await inputBox.evaluate((el) => {
    const c = getComputedStyle(el)
    return { h: c.height, borderW: c.borderTopWidth, borderS: c.borderTopStyle, radius: c.borderRadius }
  })
  check('§8.2 UiInput 高 42px', parseFloat(inpStyle.h) === 42, `实测 ${inpStyle.h}`)
  check('§8.2 UiInput 边框 0.7px solid（1x 屏被 Chrome 进位成 1px）',
    inpStyle.borderS === 'solid' && [0.7, 1].includes(parseFloat(inpStyle.borderW)), `${inpStyle.borderW} ${inpStyle.borderS}`)
  check('§8.2 UiInput 圆角 10px', parseFloat(inpStyle.radius) === 10, `实测 ${inpStyle.radius}`)
  const apiKeyInput = page.locator('.settings-panel-shell input[type="password"]').first()
  await apiKeyInput.fill('sk-test-e2e-123')
  await sleep(450)
  check('API Key 输入框：输入即持久化',
    (await apiKeyInput.inputValue()) === 'sk-test-e2e-123' && Object.keys(await lsGet('lzeditor-api-keys')).length > 0)
  await apiKeyInput.focus()
  await sleep(150)
  const focusShadow = await inputBox.evaluate((el) => getComputedStyle(el).boxShadow)
  check('§10.2 UiInput focus 出主色外发光', focusShadow && focusShadow !== 'none', focusShadow.slice(0, 60))

  // 6. 服务商下拉框
  const providerSel = page.locator('.settings-panel-shell .ui-select-trigger').first()
  await providerSel.click()
  await sleep(300)
  const provOpts = await page.locator('.ui-select-menu:visible .ui-select-item:not(.disabled) .ui-select-item-label').allInnerTexts()
  check('服务商下拉框：展开出选项', provOpts.length >= 1, provOpts.join(' / '))
  const provCur = (await providerSel.innerText()).trim()
  const provTarget = provOpts.find((o) => o !== provCur)
  if (provTarget) {
    await page.locator('.ui-select-menu:visible .ui-select-item:not(.disabled)', { hasText: provTarget }).first().click()
    await sleep(400)
  }
  check('服务商下拉框：选中生效', (await providerSel.innerText()).trim() !== provCur)

  // 7. 应用行为开关
  await page.locator('.settings-nav-row', { hasText: '个性设置' }).click()
  await sleep(250)
  await page.locator('.settings-subtab', { hasText: '应用行为' }).click()
  await sleep(400)
  const beh = page.locator('.settings-panel-shell button[role="switch"]').first()
  const behBefore = (await beh.getAttribute('aria-checked')) === 'true'
  await beh.click()
  await sleep(400)
  const behAfter = (await beh.getAttribute('aria-checked')) === 'true'
  check('应用行为开关：点击取反', behBefore !== behAfter, `${behBefore}→${behAfter}`)

  // 8. 关闭弹框
  await page.locator('.ui-modal-close').click()
  await sleep(450)
  check('关闭按钮：点击后弹框关闭', (await page.locator('.settings-panel-shell').count()) === 0)

  // 9. 排版设置作用到内容区
  const fontInfo = await page.evaluate(() => {
    const el = document.querySelector('.preview-doc') || document.querySelector('.cm-editor')
    return el ? getComputedStyle(el).fontFamily : ''
  })
  check('排版字体设置作用到内容区', fontInfo.length > 5, fontInfo.slice(0, 60))
})
