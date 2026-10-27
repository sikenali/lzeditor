import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// ─────────────────────────────────────────────────────────────────────────
// §8.2 UiInput 规范：高度 42px、0.7px solid var(--color-border)、
// 背景 var(--color-bg-secondary)、focus 时 var(--color-bg-white) + var(--color-primary)
// 边框、圆角 var(--radius-md)、placeholder var(--color-text-muted)。
//
// 以下四处输入框有三处没走 UiInput 组件、各自手写了类，历史上全都偏离过 §8.2：
// 34px/无高度、6px 圆角、--border-subtle(#EDE9E0) 代替 --color-border(#E5DFD3)、
// --background-elevated/--background 代替 --color-bg-secondary(#F7F3EA)。
// 这里逐个断言，防止再漂移。唯一有意例外：.library-folder-rename-input 高度取
// 34px（紧凑档，等同 .ui-input--sm）——树行本身约 33px，套 42px 会让整行在编辑时跳动。
// ─────────────────────────────────────────────────────────────────────────

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const uiCss = read('src/styles/ui.css')
const panelsCss = read('src/styles/panels.css')
const layoutCss = read('src/styles/layout.css')
const tokensCss = read('src/styles/tokens.css')

// 取一个选择器的完整声明块（到第一个 }）
const block = (css, sel) => {
  const i = css.indexOf(sel)
  if (i < 0) return ''
  const end = css.indexOf('}', i)
  return css.slice(i, end === -1 ? i + 400 : end + 1)
}

test('§8.2 依赖的 token 值本身是对的', () => {
  assert.match(tokensCss, /--radius-md:\s*10px/, '圆角 10px 由 --radius-md 提供')
  assert.match(tokensCss, /--color-border:\s*#E5DFD3/, '§8.2 的边框色')
  assert.match(tokensCss, /--color-bg-secondary:\s*#F7F3EA/, '§8.2 的底色')
  assert.match(tokensCss, /--color-bg-white:\s*#FFFFFF/, '§8.2 的 focus 底色')
})

// 四处输入框的声明块 + focus 块 + 高度（唯一例外是 rename 的 34px）
const CHECKS = [
  { name: '.ui-input（UiInput 组件，md 基线）', css: uiCss, sel: '.ui-input  {', focus: '.ui-input:focus-within  {', height: 42, placeholder: '.ui-input-control::placeholder  {' },
  { name: '.search-input-group（查找/替换）', css: panelsCss, sel: '.search-input-group  {', focus: '.search-input-group:focus-within  {', height: 42, placeholder: '.search-input::placeholder  {' },
  { name: '.library-search-input（文库搜索）', css: layoutCss, sel: '.library-search-input  {', focus: '.library-search-input:focus  {', height: 42, placeholder: '.library-search-input::placeholder  {' },
  { name: '.library-folder-rename-input（树内重命名）', css: layoutCss, sel: '.library-folder-rename-input  {', focus: '.library-folder-rename-input:focus  {', height: 34, placeholder: null },
]

for (const c of CHECKS) {
  const body = block(c.css, c.sel)
  const focusBody = block(c.css, c.focus)

  test(`${c.name}：§8.2 高度/边框/圆角/背景`, () => {
    assert.notEqual(body, '', `${c.sel} 必须存在`)
    assert.match(body, new RegExp(`height:\\s*${c.height}px`), `${c.name} 高度应为 ${c.height}px`)
    assert.match(body, /border:\s*0\.7px solid var\(--color-border\)/, `${c.name} 边框必须是 0.7px var(--color-border)`)
    assert.match(body, /border-radius:\s*var\(--radius-md\)/, `${c.name} 圆角必须是 --radius-md(10px)`)
    assert.match(body, /background:\s*var\(--color-bg-secondary\)/, `${c.name} 背景必须是 --color-bg-secondary`)
  })

  test(`${c.name}：§8.2 focus 变白 + 主色边框`, () => {
    assert.notEqual(focusBody, '', `${c.focus} 必须存在`)
    assert.match(focusBody, /background:\s*var\(--color-bg-white\)/, `${c.name} focus 背景必须变 --color-bg-white`)
    assert.match(focusBody, /border-color:\s*var\(--color-primary\)/, `${c.name} focus 边框必须是主色`)
  })

  if (c.placeholder) {
    test(`${c.name}：§8.2 placeholder 颜色`, () => {
      assert.match(block(c.css, c.placeholder), /color:\s*var\(--color-text-muted\)/, `${c.name} placeholder 必须是 --color-text-muted`)
    })
  }
}

// 三处手写输入框不得再用遗留色 token（§8.2 只认 --color-*）
test('三处手写输入框不再用遗留 token', () => {
  for (const c of CHECKS.slice(1)) {
    const body = block(c.css, c.sel)
    for (const legacy of ['--border-subtle', '--accent-primary', '--background-elevated', 'var(--background)']) {
      assert.ok(!body.includes(legacy), `${c.name} 不应再用 ${legacy}`)
    }
  }
})

// ─────────────────────────────────────────────────────────────────────────
// 防止「§8.2 源码写对了、渲染却出不来」。历史上有两条这样的根因，都不体现在上面
// 的声明块断言里，必须单独守：
//
// 1) globals.css 曾写 `input[type="text"], ... , textarea { background: var(--t-bg-6) !important;
//    border-color: var(--t-bd-1) !important; }`。!important 连组件类都压得过，把 §8.2 的
//    底色/边框/聚焦态全部否决——连 .ui-input 组件本身都渲染成白底 + --border-subtle 边框。
//    现在必须包进 :where()，特异性归零，任何组件类都能覆盖它。
// 2) panels.css 曾在文件尾部用 `.search-input-group { background: var(--t-bg-21);
//    border-color: var(--t-bd-10); }` 重复定义一次，同特异性按源码顺序压掉 §8.2 的样式。
// ─────────────────────────────────────────────────────────────────────────
const globalsCss = read('src/styles/globals.css')

test('全局输入框兜底规则不得用 !important 否决组件样式', () => {
  const idx = globalsCss.indexOf('input[type="text"]')
  assert.ok(idx > -1, '输入框兜底规则应存在')
  // 向前多看 40 字符，把选择器开头的 :where( 也纳入检查范围
  const rule = globalsCss.slice(Math.max(0, idx - 40), idx + 260)
  assert.ok(!/!important/.test(rule), `兜底规则不得用 !important（会否决 §8.2 的底色/边框/聚焦态）：\n${rule}`)
  assert.match(rule, /:where\(/, '兜底规则必须包在 :where() 里，特异性归零，组件类才能覆盖它')
})

test('.search-input-group 只允许定义一次，不允许被尾部重复定义压掉 §8.2', () => {
  // 只匹配「类名后直接跟 {」的声明块；:focus-within 这类伪类选择器不会命中
  const n = (panelsCss.match(/\.search-input-group\s*\{/g) || []).length
  assert.equal(n, 1, `.search-input-group 声明块只应出现 1 次，实际 ${n} 次`)
})
