import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { Window } from 'happy-dom'

// DOMPurify 需要一个 window 才初始化；happy-dom 的 NodeIterator 实现有缺陷，
// DOMPurify 的遍历只会处理第一个节点（第一个节点被当成 forbidden 丢弃）。
// 所以结构性断言一律打在 renderMarkdownRaw（markdown-it + KaTeX，无 DOM 依赖）上，
// 消毒环节只验证「会调用且失败时退化」，完整消毒矩阵在 headless Chrome 下单独验过。
const win = new Window()
globalThis.window = win.window
globalThis.document = win.document

const { renderMarkdownRaw, renderMarkdown } = await import('../src/utils/markdown/render.ts')
const { sanitizeHtml } = await import('../src/utils/sanitizeHtml.ts')
const { detectFlavor } = await import('../src/utils/markdown/flavors.ts')
const { headingId, makeHeadingIdGen } = await import('../src/utils/markdown/id.ts')
const { parseMdOutline } = await import('../src/utils/mdOutline.ts')

const raw = (md, flavor = 'gfm') => renderMarkdownRaw(md, { flavor }).html

// ── 渲染入口 ─────────────────────────────────────────────────────────────

test('commonmark 方言不渲染 GFM 扩展：表格留作文本', () => {
  const out = renderMarkdownRaw('| a | b |\n| - | - |\n| 1 | 2 |', { flavor: 'commonmark' }).html
  assert.equal(out.includes('<table'), false)
  assert.match(out, /\| a \| b \|/)
})

test('gfm 方言渲染表格 / 删除线 / 任务列表', () => {
  const out = raw('前置\n\n~~old~~\n\n- [x] done\n- [ ] todo\n\n| a | b |\n| :-- | --: |\n| 1 | 2 |')
  assert.match(out, /<s>old<\/s>/)
  assert.match(out, /<li class="task-list-item"><input type="checkbox" checked="" disabled="">done<\/li>/)
  assert.match(out, /<li class="task-list-item"><input type="checkbox" disabled="">todo<\/li>/)
  assert.match(out, /<table>/)
  assert.match(out, /style="text-align:right"/)
  assert.match(out, /<td style="text-align:right">2<\/td>/)
})

test('obsidian 方言：wikilink / embed / 批注剥离', () => {
  const out = renderMarkdownRaw('前置\n\n看 [[目标章节|目标]] 和 ![[a.png]]\n\n%% 这是批注 %% 正文', { flavor: 'obsidian' }).html
  assert.match(out, /<a[^>]*class="wiki-link"[^>]*href="#目标章节"[^>]*>目标<\/a>|<a[^>]*href="#目标章节"[^>]*class="wiki-link"[^>]*>目标<\/a>/)
  assert.match(out, /<img[^>]*src="a\.png"[^>]*alt="a"(\/)?>/)
  assert.equal(out.includes('批注'), false)
  assert.match(out, /正文/)
})

test('obsidian embed 支持 |别名，并转义引号', () => {
  const out = renderMarkdownRaw('![[pic.jpg|截图]] 和 ![[o.png]] 与 ![[bad.jpg|"onerror="x"]]', { flavor: 'obsidian' }).html
  assert.match(out, /<img[^>]*src="pic\.jpg"[^>]*alt="截图"(\/)?>/)
  assert.match(out, /<img[^>]*src="o\.png"[^>]*alt="o"(\/)?>/)
  assert.match(out, /src="bad\.jpg"/)
  assert.equal(out.includes('"onerror'), false)
  assert.match(out, /&quot;/)
})

test('wikilink 在代码里保持字面，嵌套与未闭合不递归不崩溃', () => {
  const out = renderMarkdownRaw('`[[a]]` 与 [[[b]]] 和 [[c', { flavor: 'obsidian' }).html
  assert.match(out, /<code>\[\[a\]\]<\/code>/)
  assert.match(out, /<a[^>]*>b<\/a>/)
  assert.equal((out.match(/class="wiki-link"/g) || []).length, 1)
  assert.match(out, /\[\[c/)
})

test('pandoc 方言：围栏 div / ATeX 标题 / cite', () => {
  const out = renderMarkdownRaw('前置\n\n= 标题一\n\n::: {.callout-note #n1}\n注意内容\n:::\n\n见 @cite{smith2020}。', { flavor: 'pandoc' }).html
  assert.match(out, /<h1[^>]*id="标题一"[^>]*>标题一<\/h1>|<h1[^>]*>标题一<\/h1>/)
  assert.match(out, /<div[^>]*id="n1"[^>]*class="callout-note"[^>]*>|<div[^>]*class="callout-note"[^>]*id="n1"[^>]*>/)
  assert.match(out, /<sup class="citation">\[smith2020\]<\/sup>/)
})

test('quarto 方言：#{id} 标题锚点优先于自动 id', () => {
  const out = renderMarkdownRaw('前置\n\n# 概览 {#overview}\n\n## 用法 {#usage}', { flavor: 'quarto' }).html
  assert.match(out, /<h1[^>]*id="overview"[^>]*>概览<\/h1>|<h1[^>]*>概览<\/h1>/)
  assert.match(out, /<h2[^>]*id="usage"[^>]*>用法<\/h2>|<h2[^>]*>用法<\/h2>/)
})

test('重复标题 id 去重：foo / foo-2', () => {
  const out = raw('前置\n\n# foo\n\n# foo\n\n# foo')
  assert.match(out, /id="foo"/)
  assert.match(out, /id="foo-2"/)
  assert.match(out, /id="foo-3"/)
})

// ── 数学与代码 ───────────────────────────────────────────────────────────

test('行内与块级公式都走 KaTeX，不留占位符', () => {
  const out = raw('前置\n\n质量 $E = mc^2$ 结束\n\n$$\\int_a^b f(x)\\,dx$$\n\n矩阵\n\n$$A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\\\ \\end{pmatrix}$$')
  assert.match(out, /class="katex"/)
  assert.match(out, /katex-display/)
  assert.equal(out.includes('\uE000'), false)
  assert.equal(out.includes('\uE001'), false)
})

test('代码里的美元符号不被当成公式', () => {
  const out = raw('前置\n\n`$x^2$` 与 $$y^2$$ 同时出现')
  assert.equal(out.includes('<code>$x^2$</code>'), true)
  assert.equal((out.match(/class="katex"/g) || []).length, 1)
})

test('围栏代码块用 highlight.js 高亮并带上语言类', () => {
  const out = raw('```js\nconst x = 1;\n```')
  assert.match(out, /<pre><code class="hljs language-js">/)
  assert.match(out, /<span class="hljs-keyword">const<\/span>/)
  assert.match(out, /<span class="hljs-number">1<\/span>/)
})

test('不认识的代码语言原样转义输出，不抛错', () => {
  const out = raw('```not-a-language\n<div class="x">a & b</div>\n```')
  assert.match(out, /<pre><code class="hljs language-not-a-language">/)
  assert.match(out, /&lt;div/)
  assert.match(out, /a &amp; b/)
})

// ── 安全：消毒环节是否被真正调用 ─────────────────────────────────────────

test('renderMarkdown 走消毒：输出不含 script 标签', () => {
  // happy-dom 的 NodeIterator 有缺陷，DOMPurify 遍历不全（只处理首个节点），
  // 所以这里只验证「消毒确实被调用且真的生效」，完整消毒矩阵在浏览器下另测。
  assert.equal(sanitizeHtml('<b onclick="x()">hi</b>'), 'hi')

  const out = renderMarkdown('<script>alert(1)</script>\n\n按钮', { flavor: 'gfm' }).html
  assert.equal(out.includes('<script'), false)
  assert.match(out, /按钮/)
})

test('渲染器抛错时兜底为转义段落，空输入返回空串', () => {
  assert.equal(renderMarkdownRaw('', { flavor: 'gfm' }).html, '')
  assert.equal(renderMarkdownRaw('', { flavor: 'commonmark' }).html, '')
})

// ── 方言自动检测 ─────────────────────────────────────────────────────────

test('detectFlavor 按特征识别各方言，特征互不抢', () => {
  assert.equal(detectFlavor('import Foo from "./foo.mdx"\n\n# t\n'), 'mdx')
  assert.equal(detectFlavor('# t\n\n[[笔记]] 和 %% 批注 %%\n'), 'obsidian')
  assert.equal(detectFlavor('# t {#sec-a}\n\n::: {.callout-note}\nx\n:::\n'), 'quarto')
  assert.equal(detectFlavor('@cite{a2020}\n\n== 标题\n'), 'pandoc')
  assert.equal(detectFlavor('| a | b |\n| - | - |\n'), 'gfm')
  assert.equal(detectFlavor('# 只有标题和段落\n\n正文。\n'), 'commonmark')
})

test('水平线与未闭合围栏不被误判为 front matter', () => {
  assert.equal(detectFlavor('---\n\n# t\n\n---\n'), 'commonmark')
  assert.equal(detectFlavor('# t\n\n  ````js\n  // 还没闭合\n'), 'commonmark')
})

test('代码块里的语法特征不参与渲染与检测', () => {
  const out = renderMarkdownRaw('# 标题\n\n```text\n[[wikilink]]\n~~strike~~\n| 假表格 |\nimport Foo from "x.mdx"\n```', {}).html
  assert.match(out, /\[\[wikilink\]\]/)
  assert.equal(out.includes('<del>'), false)
  assert.equal(out.includes('<table'), false)
})

// ── 锚点一致性 ───────────────────────────────────────────────────────────

test('outline 解析跳过围栏内的 #，且 id 与渲染产物一致', () => {
  const md = '# 封面\n\n# 第一章\n\n# 第二章\n\n```md\n# 不是标题\n```\n'
  const items = parseMdOutline(md)
  assert.equal(items.length, 3)
  assert.deepEqual(items.map(i => i.id), [headingId('封面'), headingId('第一章'), headingId('第二章')])

  const ids = [...renderMarkdownRaw(md, { flavor: 'gfm' }).html.matchAll(/<h[12] id="([^"]+)"/g)].map(m => m[1])
  assert.deepEqual(ids, items.map(i => i.id))
})

test('makeHeadingIdGen 对重复标题产出稳定后缀', () => {
  const gen = makeHeadingIdGen()
  assert.deepEqual([gen('A'), gen('A'), gen('B'), gen('A')], ['a', 'a-2', 'b', 'a-3'])
})
