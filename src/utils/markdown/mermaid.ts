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

export function collectMermaidJobs(root: HTMLElement): Job[] {
  const done: Job[] = [...root.querySelectorAll<HTMLElement>(`.mermaid-diagram[${DONE_ATTR}]`)].map(el => ({
    holder: el,
    src: el.getAttribute(DONE_ATTR) || '',
    kind: 'done' as const,
  }))

  const fresh: Job[] = [...root.querySelectorAll<HTMLElement>(FRESH_SELECTOR)]
    .map<Job | null>(code => {
      const pre = code.parentElement
      if (!pre) return null
      return { holder: pre, src: code.textContent || '', kind: 'fresh' as const }
    })
    .filter((j): j is Job => j !== null)

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
 * Mermaid 流程图渲染：把预览/阅读里 ```mermaid 代码块渲染成真图。
 *
 * 管线现状（src/utils/markdown/render.ts:455）已经把块渲成
 * <pre><code class="hljs language-mermaid">源码</code></pre>，
 * 所以本模块只负责事后增强，不动渲染管线：
 *  - fresh：源码从 code.textContent 取（HTML 实体已解码，逐字保真）
 *  - done ：源码从 data-mermaid-src 取（换主题时整批重渲用）
 *
 * mermaid 走动态 import，拆成独立 chunk，不进主包。
 * 真实 mermaid 在 happy-dom 下跑不了（SVG 序列化返回空串），
 * 所以渲染器可注入，测试里换成假的。
 */
export async function renderMermaidBlocks(root: HTMLElement, dark: boolean): Promise<void> {
  const jobs = collectMermaidJobs(root)
  // 提前返回，避免白加载 mermaid（这个包很重）
  if (!jobs.length) return

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
