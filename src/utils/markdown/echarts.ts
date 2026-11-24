const DONE_ATTR = 'data-echarts-src'
const FRESH_SELECTOR = 'pre > code.language-echarts'

export type EchartsRenderer = {
  init: (
    el: HTMLElement,
  ) => {
    setOption: (option: unknown, notMerge?: boolean) => void
    dispose?: () => void
  }
}

let injectedRenderer: EchartsRenderer | null = null
let dynamicRenderer: EchartsRenderer | null = null

/** 测试注入假 echarts 渲染器（null 恢复动态 import）。 */
export function _setEchartsForTest(renderer: EchartsRenderer | null): void {
  injectedRenderer = renderer
  dynamicRenderer = null
}

async function getRenderer(): Promise<EchartsRenderer> {
  if (injectedRenderer) return injectedRenderer
  if (dynamicRenderer) return dynamicRenderer
  const echarts = await import('echarts')
  dynamicRenderer = echarts as unknown as EchartsRenderer
  return dynamicRenderer
}

function parseOption(source: string): unknown {
  const text = source.trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * ECharts 图渲染：把预览/阅读里 ```echarts 代码块渲染成真图。
 *
 * 渲染管线（src/utils/markdown/render.ts）已把块渲成
 * <pre><code class="hljs language-echarts">JSON</code></pre>，本模块只做事后
 * 增强（与 mermaid 同模式）。option 按 JSON 解析（不 eval 用户脚本）；解析
 * 失败降级为 raw 代码块 + 错误提示。echarts 走动态 import，拆独立 chunk。
 */
export async function renderEchartsBlocks(root: HTMLElement): Promise<void> {
  const codes = [...root.querySelectorAll<HTMLElement>(FRESH_SELECTOR)]
  if (!codes.length) return

  const echarts = await getRenderer()
  for (const code of codes) {
    const pre = code.parentElement
    if (!pre) continue
    if (pre.hasAttribute(DONE_ATTR)) continue
    const src = code.textContent || ''
    const option = parseOption(src)
    if (!option || typeof option !== 'object') {
      pre.setAttribute(DONE_ATTR, src)
      const note = document.createElement('span')
      note.className = 'echarts-error-note'
      note.textContent = 'ECharts 配置错误，无法渲染'
      pre.appendChild(note)
      continue
    }
    const holder = document.createElement('div')
    holder.className = 'echarts-diagram'
    pre.replaceWith(holder)
    try {
      const chart = echarts.init(holder)
      chart.setOption(option, true)
      holder.setAttribute(DONE_ATTR, src)
    } catch {
      // 初始化失败：保留占位，不抛进渲染事务
    }
  }
}
