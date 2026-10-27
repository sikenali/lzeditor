import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { Window } from 'happy-dom'

// applyTypographyOverrides 直接写 document.documentElement，需要一个 DOM。
// 这条链路是用户唯一能看见的排版入口：变量写错了，所有预览/阅读/导出一起静默退化。
const win = new Window()
globalThis.window = win.window
globalThis.document = win.document

const { applyTypographyOverrides } = await import('../src/styles/themes.ts')
const { fontStackFor } = await import('../src/hooks/useTypographyOverrides.ts')
const { DEFAULT_SETTINGS } = await import('../src/store/settingsStore.ts')

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const fileExists = (p) => existsSync(new URL(`../${p}`, import.meta.url))

// ── fontStackFor：映射错了用户的字体选择会静默失效 ──────────────────────────
test('fontStackFor 把设置值映射到 CSS 变量而不是裸字体名', () => {
  assert.equal(fontStackFor('sans-serif'), 'var(--font-sans)')
  assert.equal(fontStackFor('serif'), 'var(--font-serif)')
  assert.equal(fontStackFor('monospace'), 'var(--font-mono)')
  // 没设置过（老用户 localStorage 里没有这个键）必须落到默认栈，不能返回 undefined
  assert.equal(fontStackFor(undefined), 'var(--font-sans)')
})

test('fontStackFor 透传自定义字体栈', () => {
  const custom = '"PingFang SC", sans-serif'
  assert.equal(fontStackFor(custom), custom)
})

// ── applyTypographyOverrides：默认值必须真的写进 :root ──────────────────────
test('默认设置写出的 --read-* 变量符合预期', () => {
  applyTypographyOverrides({
    fontSize: DEFAULT_SETTINGS.defaultFontSize,
    lineHeight: DEFAULT_SETTINGS.lineHeight,
    fontFamily: fontStackFor(DEFAULT_SETTINGS.editorFont),
    textIndent: DEFAULT_SETTINGS.textIndent,
    textJustify: DEFAULT_SETTINGS.textJustify,
  })
  const root = document.documentElement
  assert.equal(root.style.getPropertyValue('--read-font-size'), '16px')
  assert.equal(root.style.getPropertyValue('--read-line-height'), '1.7')
  assert.equal(root.style.getPropertyValue('--read-font-family'), 'var(--font-sans)')
  // 首行缩进默认关：必须不写，写了就是所有段落凭空缩进
  assert.equal(root.style.getPropertyValue('--read-text-indent'), '')
  // 两端对齐默认开（新默认）
  assert.equal(root.style.getPropertyValue('--read-text-align'), 'justify')
})

test('关掉开关后变量被移除，不是留下残留值', () => {
  applyTypographyOverrides({ textIndent: true, textJustify: true })
  const root = document.documentElement
  assert.equal(root.style.getPropertyValue('--read-text-indent'), '2em')
  assert.equal(root.style.getPropertyValue('--read-text-align'), 'justify')

  applyTypographyOverrides({ textIndent: false, textJustify: false })
  assert.equal(root.style.getPropertyValue('--read-text-indent'), '')
  assert.equal(root.style.getPropertyValue('--read-text-align'), '')
})

// ── 字体文件：url() 打错一个字就静默出豆腐块，必须逐个核对存在 ──────────────
test('fonts.css 引用的每个字体子集文件都真实存在', () => {
  const css = read('src/styles/fonts.css')
  const urls = [...css.matchAll(/url\(\s*['"]?([^'")]+\.(?:woff2|woff|ttf|otf))\s*['"]?\s*\)/g)].map((m) => m[1])
  assert.ok(urls.length >= 14, `expected >= 14 font subsets, got ${urls.length}`)
  for (const u of urls) {
    assert.ok(existsSync(new URL(u, new URL('../src/styles/', import.meta.url))), `font file missing: ${u}`)
  }
  assert.equal(new Set(urls).size, urls.length, 'duplicate font url')
})

test('fonts.css 声明了自托管的三个字体族', () => {
  const css = read('src/styles/fonts.css')
  for (const fam of ["font-family: 'Inter'", "font-family: 'JetBrains Mono'", "font-family: 'Noto Sans SC'"]) {
    assert.match(css, new RegExp(fam), `missing @font-face for ${fam}`)
  }
})

// ── 变量消费链：定义 + 消费两端都要在，缺一端就是静默失效 ───────────────────
test('--read-* 变量每个都有消费方，不是写了没人读', () => {
  const readCss = read('src/styles/read-mode.css')
  for (const v of ['--read-font-size', '--read-line-height', '--read-font-family', '--read-text-indent', '--read-text-align']) {
    assert.match(readCss, new RegExp(`var\\(${v}`), `--read-* var ${v} has no consumer`)
  }
})

test('排版变量接到段落选择器，不接到编辑区', () => {
  // text-indent / text-align 只应作用于渲染出来的段落；CM6 源码每一行是独立 .cm-line，
  // 挂上去会把标题、列表、代码行全部缩进，比不生效更糟。
  const readCss = read('src/styles/read-mode.css')
  const idx = readCss.indexOf('text-indent: var(--read-text-indent')
  assert.ok(idx > 0, 'read-text-indent rule missing')
  // { 之前的文本就是这条规则的选择器
  const before = readCss.slice(0, idx)
  const braceIdx = before.lastIndexOf('{')
  assert.ok(braceIdx > 0, 'no rule block before the var')
  const selector = before.slice(0, braceIdx).trim()
  assert.match(selector, /\.read-article-body p|\.preview-doc p/, `must scope to rendered paragraphs, got: ${selector}`)
  for (const f of ['src/styles/app.css', 'src/components/editor/LZEditor.tsx', 'src/components/editor/CM6Editor.tsx']) {
    const src = read(f)
    assert.doesNotMatch(src, /read-text-indent|read-text-align/, `${f} must not consume paragraph vars`)
  }
})

test('字体栈链路：--font-sans 一路追到自托管的思源黑体', () => {
  const colors = read('src/styles/color-tokens.css')
  const tokens = read('src/styles/tokens.css')
  assert.match(colors, /--font-sans:\s*var\(--font-family\)/)
  assert.match(colors, /--font-mono:\s*"JetBrains Mono"/)
  assert.match(tokens, /--font-family:.*'Inter'.*'Noto Sans SC'/)
})

test('未托管字体与 Google Fonts CDN 已全部清除', () => {
  const all = ['tokens.css', 'color-tokens.css', 'read-mode.css', 'layout.css', 'panels.css']
    .map((f) => read(`src/styles/${f}`))
    .join('\n')
    + read('index.html')
    + read('src/services/exportService.ts')
  assert.doesNotMatch(all, /Ma Shan Zheng|SourceHanSans|fonts\.googleapis|fonts\.gstatic/, 'unhosted font or CDN reference')
})

test('fonts.css 已在 main.tsx 引入', () => {
  assert.match(read('src/main.tsx'), /styles\/fonts\.css/)
})

test('useTypographyOverrides 挂在 App 上而非编辑器里', () => {
  const app = read('src/App.tsx')
  assert.match(app, /useTypographyOverrides\(\)/, 'hook must be called in App')
  // 读/历史模式会把 LZEditor 整个替换掉，所以变量写入必须挂在更上层
  assert.doesNotMatch(read('src/components/editor/LZEditor.tsx'), /applyTypographyOverrides/, 'must not live in LZEditor')
})
