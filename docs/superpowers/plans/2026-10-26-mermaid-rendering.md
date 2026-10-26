# Mermaid 流程图渲染（方案 A，零改动共享管线）

## 任务：在预览和阅读模式里真渲染 ```mermaid 代码块

**文件**：新增 `src/utils/markdown/mermaid.ts`、`tests/mermaid.test.mjs`；改 `src/components/sidebar/SidebarPreview.tsx`、`src/components/editor/ReadMode.tsx`、`src/styles/layout.css`、`package.json`。

**关键前提（已实测，不是推测）：**

现状的 fence 渲染器（`src/utils/markdown/render.ts:455`）已经输出：

```html
<pre><code class="hljs language-mermaid">flowchart LR&#10;  A --&gt; B</code></pre>
```

也就是说 mermaid 源码**已经在 DOM 里了**，语言标记是 CSS class。`mermaid` 在 `HLJS_PLAIN`（`render.ts:74`）里，所以不会被 highlight.js 打碎成 span，`textContent` 取回的就是逐字原始源码（已实测 `"flowchart LR\n  A --> B\n  B -- |label| C"` 完全保真）。

因此**本任务不需要改 `render.ts`，也不需要改 `sanitizeHtml.ts`**：
- DOMPurify 默认 `ALLOW_DATA_ATTR = true`（`node_modules/dompurify/dist/purify.cjs.js:663,829`），`data-mermaid-src` 这类属性本来就会被放行，白名单不用加。
- 源码走 `textContent` 取出，不需要任何新属性。

两个显示面：`SidebarPreview.tsx`（内联预览）、`ReadMode.tsx`（阅读模式）。导出留作后续。

**协作约束：**
- 工作区可能有其他会话的未提交改动，**不要 `git add -A`**，按任务显式列路径。
- `src/store/settingsStore.ts` 经常被别的会话改（主题、快捷键设置都动它）。本计划**只读**它（`useSettingsStore((s: any) => s.theme)`），不改它。若执行时 `theme` 字段改名了，照实际字段名写。
- `SidebarPreview.tsx` 和 `ReadMode.tsx` 也是高活跃文件（分屏滚动同步、双联页刚改过）。动手前先 `git diff` 看别人改了什么，用精确替换而不是整段重写。
- `npx tsc --noEmit` 当前全绿，这是基准。任务 2 的模块已在隔离环境验证过零错误 + 7/7 测试通过，照抄即可。

## 已知测试环境限制（必须写进测试注释）

**happy-dom 跑不了 mermaid 真渲染。** 实测：`mermaid.render()` 要么报 `CSSStyleSheet is not defined`，要么返回**长度为 0 的空 svg**——happy-dom 的 SVG 序列化不完整，mermaid 把结果写进 DOM 再读回时拿不到内容。

所以单元测试**不测真实渲染结果**，测的是：块发现、源码提取、替换、幂等、失败回退。真实 mermaid 通过一个可注入的渲染器接口 stub 掉；浏览器真渲染走「手工验收」验。

## 任务 1：加依赖

- [ ] **步骤 1**

运行：`npm install mermaid@^11.4.0`

mermaid 的 node_modules 约 84MB，前端 bundle 会因此明显变大。**必须走动态 import 拆成单独 chunk**，不进主包。当前前端已 8.7MB，这是已知问题，本次顺路修。

- [ ] **步骤 2：提交**

```bash
git add package.json package-lock.json
git commit -m "chore: 加 mermaid 依赖，供预览/阅读真渲染流程图"
```

---

## 任务 2：渲染器模块 `src/utils/markdown/mermaid.ts`

- [ ] **步骤 1：写失败测试**

`tests/mermaid.test.mjs`（新文件）：

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'

// mermaid 真实渲染在 happy-dom 下跑不了（CSSStyleSheet 缺失 / SVG 序列化返回空串，
// 均已实测），所以这里注入一个假渲染器，只测块发现、替换、幂等和失败回退。
const win = new Window()
globalThis.window = win.window
globalThis.document = win.document
globalThis.navigator = win.navigator

const { collectMermaidJobs, renderMermaidBlocks, _setMermaidForTest } =
  await import('../src/utils/markdown/mermaid.ts')

const SRC = 'flowchart LR\n  A --> B'

function makeDom(withDone = false) {
  const root = win.document.createElement('div')
  root.innerHTML =
    '<p>前置段落</p>\n' +
    `<pre><code class="hljs language-mermaid">${SRC.replace(/&/g, '&amp;').replace(/>/g, '&gt;')}</code></pre>\n` +
    '<p>结尾段落</p>\n'
  if (withDone) {
    const done = win.document.createElement('div')
    done.className = 'mermaid-diagram'
    done.setAttribute('data-mermaid-src', SRC)
    done.innerHTML = '<svg>旧</svg>'
    root.insertBefore(done, root.firstChild)
  }
  return root
}

const okRenderer = {
  initialize: () => {},
  render: async (_id, src) => ({ svg: `<svg data-src="${src.replace(/"/g, '&quot;')}"></svg>` }),
}

test('发现 <pre><code class="language-mermaid">，源码从 textContent 保真取出', () => {
  const jobs = collectMermaidJobs(makeDom())
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].kind, 'fresh')
  assert.equal(jobs[0].src, SRC)
  assert.ok(jobs[0].holder.tagName === 'PRE')
})

test('已渲染的块靠 data-mermaid-src 发现，供换主题重渲', () => {
  const jobs = collectMermaidJobs(makeDom(true))
  assert.equal(jobs.length, 2)
  const done = jobs.find(j => j.kind === 'done')
  assert.equal(done.src, SRC)
  assert.equal(done.holder.getAttribute('class'), 'mermaid-diagram')
})

test('渲染后 <pre> 被换成 .mermaid-diagram，svg 写入', async () => {
  _setMermaidForTest(okRenderer)
  try {
    const root = makeDom()
    await renderMermaidBlocks(root)
    assert.equal(root.querySelector('pre'), null)
    assert.equal(root.querySelector('.mermaid-diagram svg'), root.querySelector('svg'))
    assert.equal(root.querySelector('.mermaid-diagram').getAttribute('data-mermaid-src'), SRC)
  } finally {
    _setMermaidForTest(null)
  }
})

test('前后段落不受影响', async () => {
  _setMermaidForTest(okRenderer)
  try {
    const root = makeDom()
    await renderMermaidBlocks(root)
    assert.equal(root.querySelectorAll('p').length, 2)
    assert.equal(root.querySelector('p').textContent, '前置段落')
  } finally {
    _setMermaidForTest(null)
  }
})

test('渲染失败保留源码，不静默吞掉', async () => {
  _setMermaidForTest({
    initialize: () => {},
    render: async () => { throw new Error('语法错误') },
  })
  try {
    const root = makeDom()
    await renderMermaidBlocks(root)
    assert.equal(root.querySelector('.mermaid-error'), root.querySelector('.mermaid-diagram'))
    assert.equal(root.querySelector('.mermaid-error code').textContent, SRC)
  } finally {
    _setMermaidForTest(null)
  }
})

test('已失败的块不反复重试，直到下次清标记', async () => {
  _setMermaidForTest({
    initialize: () => {},
    render: async () => { throw new Error('语法错误') },
  })
  try {
    const root = makeDom()
    await renderMermaidBlocks(root)
    await renderMermaidBlocks(root)   // 第二次应该直接空手而归
    assert.equal(collectMermaidJobs(root).length, 0)
  } finally {
    _setMermaidForTest(null)
  }
})

test('空容器直接返回，不加载 mermaid', async () => {
  let loaded = false
  _setMermaidForTest({ initialize: () => {}, render: async () => { loaded = true; return { svg: '' } } })
  try {
    await renderMermaidBlocks(win.document.createElement('div'))
    assert.equal(loaded, false)
  } finally {
    _setMermaidForTest(null)
  }
})
```

- [ ] **步骤 2：跑测试确认失败**

运行：`npm test 2>&1 | grep mermaid`
预期：`Cannot find module '../src/utils/markdown/mermaid.ts'`

- [ ] **步骤 3：实现**

```ts
/**
 * Mermaid 流程图渲染：把预览/阅读里 ```mermaid 代码块渲染成真图。
 *
 * 管线现状（src/utils/markdown/render.ts:455）已经把块渲成
 * <pre><code class="hljs language-mermaid">源码</code></pre>，
 * 所以本模块只负责事后增强，不动渲染管线：
 *  - fresh：源码从 code.textContent 取（HTML 实体已解码，逐字保真）
 *  - done ：源码从 data-mermaid-src 取（换主题时整批重渲用）
 *
 * mermaid 走动态 import，拆成独立 chunk，不进 8.7MB 的主包。
 * 真实 mermaid 在 happy-dom 下跑不了（SVG 序列化返回空串），
 * 所以渲染器可注入，测试里换成假的。
 */

const DONE_ATTR = 'data-mermaid-src'
const FAILED_ATTR = 'data-mermaid-failed'
const FRESH_SELECTOR = 'pre > code.language-mermaid'

export type MermaidRenderer = {
  initialize: (config: Record<string, unknown>) => void
  render: (id: string, code: string) => Promise<{ svg: string }>
}

type Job = { holder: HTMLElement; src: string; kind: 'fresh' | 'done' }

let injected: MermaidRenderer | null = null
let renderer: MermaidRenderer | null = null
let renderCount = 0

export function _setMermaidForTest(m: MermaidRenderer | null) {
  injected = m
  renderer = null
}

async function getRenderer(): Promise<MermaidRenderer> {
  if (injected) return injected
  if (!renderer) renderer = (await import('mermaid')).default
  return renderer
}

/** 纯函数：只收集要处理的块，不碰 mermaid。方便测。 */
export function collectMermaidJobs(root: HTMLElement): Job[] {
  // 已渲染过的：靠标记属性发现，换主题时整批重渲
  const done: Job[] = [...root.querySelectorAll<HTMLElement>(`.mermaid-diagram[${DONE_ATTR}]`)].map(el => ({
    holder: el,
    src: el.getAttribute(DONE_ATTR) || '',
    kind: 'done' as const,
  }))

  // 新块：源码在 code 文本里
  const fresh: Job[] = [...root.querySelectorAll<HTMLElement>(FRESH_SELECTOR)]
    .map<Job | null>(code => {
      const pre = code.parentElement
      if (!pre) return null
      return { holder: pre, src: code.textContent || '', kind: 'fresh' }
    })
    .filter((j): j is Job => j !== null)

  // 失败过的两种块都别重试：fresh 失败后 holder 还是 <pre>，
  // done 失败后 holder 是 <div class="mermaid-diagram">，所以标记要统一判断
  return [...done, ...fresh].filter(j => !j.holder.hasAttribute(FAILED_ATTR))
}

function showErrorNote(target: HTMLElement, src: string) {
  target.classList.add('mermaid-error')
  const code = document.createElement('code')
  code.textContent = src
  const note = document.createElement('span')
  note.className = 'mermaid-error-note'
  note.textContent = 'Mermaid 语法错误，无法渲染'
  target.appendChild(code)
  target.appendChild(note)
}

async function renderOne(
  mermaid: MermaidRenderer,
  holder: HTMLElement,
  src: string,
  fresh: boolean,
): Promise<{ target: HTMLElement; ok: boolean }> {
  let target = holder
  if (fresh) {
    const div = document.createElement('div')
    div.className = 'mermaid-diagram'
    holder.replaceWith(div)
    target = div
  }
  target.setAttribute(DONE_ATTR, src)

  try {
    const { svg } = await mermaid.render(`m-${++renderCount}`, src)
    target.innerHTML = svg
    target.classList.remove('mermaid-error')
    return { target, ok: true }
  } catch {
    if (fresh) showErrorNote(target, src)
    else target.classList.add('mermaid-error')
    return { target, ok: false }
  }
}

/**
 * 增强一次：新的块渲成图，已渲过的块用 data-mermaid-src 重渲。
 *
 * 调用时机只有一个规则——previewHtml 变了就 innerHTML 重置（此时只剩 fresh 块），
 * 主题变了但 html 没变（此时只剩 done 块）。两种情况都调同一个函数即可，
 * 不需要区分 force，也不需要外部清标记。
 */
export async function renderMermaidBlocks(root: HTMLElement, dark: boolean): Promise<void> {
  const jobs = collectMermaidJobs(root)
  if (!jobs.length) return    // 提前返回，避免白加载 mermaid

  const mermaid = await getRenderer()
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'default',
  })

  await Promise.all(
    jobs.map(async job => {
      if (!job.src.trim()) {
        // 空块：不留占位，直接撤掉
        if (job.kind === 'fresh') job.holder.remove()
        return 'empty'
      }
      // fresh 块的 holder 在 renderOne 里已经被换掉了，失败标记必须打在
      // renderOne 实际返回的那个节点上，否则标记落在脱离 DOM 的旧 <pre> 上，
      // 下次 collectMermaidJobs 还会把这个块再发现一遍，反复重试
      const { target, ok } = await renderOne(mermaid, job.holder, job.src, job.kind === 'fresh')
      if (!ok) target.setAttribute(FAILED_ATTR, '')
      return ok ? 'ok' : 'fail'
    }),
  )
}
```

- [ ] **步骤 4：跑测试确认通过**

运行：`npm test 2>&1 | grep mermaid`
预期：7 个通过，0 失败

> **已预先验证**：模块代码 + 测试已在 `/tmp/opencode/mtest`（装了 `mermaid@^11.4.0` + `happy-dom` + `tsx`）完整跑过，`npx tsc` 用仓库同参数（`strict` / `noUnusedLocals` / `noUnusedParameters` / `isolatedModules` / `moduleResolution: bundler`）零错误，7/7 测试通过。唯一需要照抄的细节是 `collectMermaidJobs` 里 `.map<Job | null>` 的类型标注——漏了它 `tsc` 会报 `TS2322` + `TS2677`。

> **mermaid API 已核对**：`mermaid/dist/types.d.ts:102` 的 `RenderResult` 就是 `{ svg: string }`，`mermaidAPI.d.ts:82` 的 `render: (id, text, svgContainingElement?) => Promise<RenderResult>`，与 `MermaidRenderer` 类型兼容。

- [ ] **步骤 5：提交**

```bash
git add src/utils/markdown/mermaid.ts tests/mermaid.test.mjs
git commit -m "feat(mermaid): 新增流程图渲染器，源码从 code.textContent 取，失败保留源码"
```

---

## 任务 3：CSS `src/styles/layout.css`

- [ ] **步骤 1：在大纲区块之前插入**

文件末尾现在是大纲区块（`.outline` 开头）。在它**前面**插入：

```css
/* ---- mermaid 流程图 ---- */
.mermaid-diagram {
  margin: 16px 0;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow-x: auto;
  text-align: center;
  background: var(--surface-color);
}
.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
  display: inline-block;
}
.mermaid-error {
  border-color: color-mix(in srgb, var(--danger, #c0392b) 40%, var(--border-color));
  text-align: left;
}
.mermaid-error code {
  display: block;
  white-space: pre-wrap;
  font-size: 13px;
  color: var(--text-color);
}
.mermaid-error-note {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--danger, #c0392b);
}
```

- [ ] **步骤 2：确认**

运行：`npm test 2>&1 | tail -5`
预期：83/83（仓库当前基线 76 个，新增 7 个）

注：layout.css 有别的会话在改，动之前先 `git diff` 看当前状态。

- [ ] **步骤 3：提交**

```bash
git add src/styles/layout.css
git commit -m "feat(mermaid): 流程图样式，语法错误时保留源码并标红"
```

---

## 任务 4：接预览和阅读

- [ ] **步骤 1：SidebarPreview**

加 import：

```ts
import { renderMermaidBlocks } from '../../utils/markdown/mermaid'
import { resolveTheme } from '../../hooks/useTheme'
```

`useSettingsStore` 该文件已 import，不用加。组件顶部取主题，变量名**必须用 `appTheme`**——effect 内部 61 行已有一个局部 `const theme = getTypographyTheme(...)`，同名会撞：

```ts
  const appTheme = useSettingsStore((s: any) => s.theme)
```

找到设置 `previewEl.innerHTML = previewHtml || ...` 的 effect（约 58-78 行，依赖数组是 `[previewHtml, typographyTheme]`），在 `previewEl.innerHTML = ...` 那行之后追加：

```ts
    // mermaid 是异步增强：占位符先显示，渲完再换成图
    void renderMermaidBlocks(previewEl, resolveTheme(appTheme) === 'dark')
```

**依赖数组不用改。** 换主题时 `typographyTheme` 没变，effect 不会重跑，所以再加一个只依赖主题的 effect：

```ts
  // 换主题不会重新生成 html，也就不会重建 .mermaid-diagram，
  // 已渲染的图要自己重渲一次。单独成 effect：并进上面那个会在换主题时和
  // innerHTML 赋值打架（两个 effect 抢同一个 DOM）。
  useEffect(() => {
    if (!previewElRef.current) return
    void renderMermaidBlocks(previewElRef.current, resolveTheme(appTheme) === 'dark')
  }, [appTheme])
```

- [ ] **步骤 2：ReadMode**

加三个 import（ReadMode 目前没引 `useSettingsStore`）：

```ts
import { renderMermaidBlocks } from '../../utils/markdown/mermaid'
import { useSettingsStore } from '../../store/settingsStore'
import { resolveTheme } from '../../hooks/useTheme'
```

组件顶部（`const [pages, setPages]` 附近）：

```ts
  const appTheme = useSettingsStore((s: any) => s.theme)
```

`renderSpread` 定义之后新增：

```ts
  // 跨页渲染的分页后 DOM 是翻页才挂载的，所以 pages / spread 都要进依赖；
  // 换主题同样要重渲。整批重渲可接受：一页最多两栏，图块很少。
  useEffect(() => {
    const dark = resolveTheme(appTheme) === 'dark'
    document.querySelectorAll('.read-article-body').forEach(el => {
      void renderMermaidBlocks(el, dark)
    })
  }, [pages, spread, appTheme])
```

- [ ] **步骤 3：确认没漏别的显示面**

运行：`grep -rn 'mdToHtml\|mdToPreviewHtml' src/ --include="*.tsx"`

`StyleMainPanel.tsx:88,98`（样式面板实时预览）和 `ExportDialog.tsx`（导出中心预览）也在显示 markdown，本次不接，记为后续（见「遗留项」）。

- [ ] **步骤 4：typecheck**

运行：`npx tsc --noEmit`
预期：无输出（当前基准是全绿）

- [ ] **步骤 5：提交**

```bash
git add src/components/sidebar/SidebarPreview.tsx src/components/editor/ReadMode.tsx
git commit -m "feat(mermaid): 预览和阅读模式接入流程图渲染，换主题整批重渲"
```

---

## 任务 5：构建验证 + 收尾

- [ ] **步骤 1：确认 mermaid 真的拆包了**

运行：`npm run build`
然后：

```bash
ls -la dist/assets/*.js | sort -k5 -n | tail -5
grep -l "mermaid" dist/assets/*.js | wc -l
```

预期：出一个新的较大 chunk（mermaid + d3，估计 1-3MB），且**不包含** mermaid 标识符的只有 1 个文件。如果 mermaid 被打进了主包（主包比 8.7MB 还大），说明动态 import 没生效，检查有没有别处静态 import 了 mermaid。

- [ ] **步骤 2：确认既有功能没坏**

```bash
npm test
```
预期：全绿

- [ ] **步骤 3：跑通现有构建脚本**

```bash
ls lzc/scripts/build.sh
```
只跑 `build.sh`（只打包，不部署）。确认版本号仍是 1.0.1，**不要**跑 install（1.0.1 已装在盒子上）。

- [ ] **步骤 4：提交**

```bash
git add -u
git commit -m "chore(mermaid): 构建验证流程图走独立 chunk"
```

---

## 手工验收（必须做）

1. 新建文档，输入：

   ````
   前置段落

   ```mermaid
   flowchart LR
     A[开始] --> B{判断}
     B -->|是| C[结束]
     B -->|否| A
   ```

   结尾段落
   ````

2. 开内联预览 → 看到流程图，不是代码块
3. 前后段落位置正常，预览高度不撑爆
4. 切深色主题 → 图跟着变深色，**不需要重新触发 html 渲染**
5. 改图的一行代码 → 图更新
6. 故意写错：`flowchart LR\n  A -->` → 显示红色提示 + 保留源码，**不出现空白**
7. 阅读模式（书本双联页）→ 图正确落在对应页，翻页后图还在
8. 切窄栏/标准/宽屏 → 图不错位

---

## 遗留项（不在本次范围）

1. **样式面板 / 导出中心预览不接**：`StyleMainPanel.tsx:88,98`、`ExportDialog.tsx` 也显示 markdown。同一行接入代码即可，但导出中心的 PDF/PNG 导出需要 mermaid 渲成图片再嵌，工作量另算。
2. **导出格式不含真图**：导出仍输出 mermaid 代码块。要渲成 SVG 内嵌得改 `exportService.ts`，另一个任务。
3. **无语法校验提示**：语法错误只在预览里显示。编辑器侧的实时报错可后续加，但 mermaid 的校验开销不小，得评估是否值得。
4. **graphviz**：backtickle 支持 ` ```dot `，本次不做。要支持得再引一个渲染器或走后端。
5. **主包 8.7MB**：本次让 mermaid 走独立 chunk，但 KaTeX 之类仍在全局。整包瘦身是独立优化项。
6. **mermaid 版本**：锁 `^11.4.0`。mermaid 大版本会改 API（`render` 返回值形状、`initialize` 配置项），升级前先看 changelog。

---

## 验收标准

- `npm test` 全绿，新增 `tests/mermaid.test.mjs`（7 个）
- `npx tsc --noEmit` **全绿**（无输出）
- `npm run build` 通过，mermaid 是独立 chunk，主包不因此变大
- `grep -rn "mermaid" src/` 确认只有新增的 `mermaid.ts` + 两个组件的调用点，**`render.ts` 和 `sanitizeHtml.ts` 零改动**
- 手工验收 1-8 全部通过
- `git show --stat` 每个提交只包含该任务列出的文件
