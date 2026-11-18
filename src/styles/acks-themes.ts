// 门面：ACKS 43 款排版主题引擎（Task 1 已 vendor 进 src/vendor/acks/engine/）。
// 消费方：Task 5（typography-themes）、Task 6（exportService）、Task 8（排版界面 / SidebarPreview）。
// 职责：把 ACKS 引擎暴露为类型化 API（getAcksTheme/ACKS_THEME_IDS/renderAcksArticle/resolveThemeAssets/injectAcksCss），
//       并 hydrate 签名 SVG 原始文本 + 挂载 THEME_ASSETS（applyDecorations 依赖裸全局）。
// 注意：本文件执行副作用（import 引擎、挂全局 THEME_ASSETS、回填 MD.SIGNATURES[k].svg）。

// @ts-ignore —— vendor JS 无类型声明，side-effect import（等价 ACKS 构建产物）；若 tsc 报缺声明，改补 src/vendor/acks/engine/index.d.ts
import '../vendor/acks/engine/index.js'
import glassRibbon from '../vendor/acks/engine/assets/glass-ribbon.png'
import inkGesture from '../vendor/acks/engine/assets/ink-gesture.png'
import paperEdge from '../vendor/acks/engine/assets/paper-edge.png'
import articleCss from '../vendor/acks/engine/article.css?raw'
import milestoneBaseCss from '../vendor/acks/engine/milestone-base.css?raw'
import milestoneGeneratedCss from '../vendor/acks/engine/milestone-generated.css?raw'
import themeRevisionCss from '../vendor/acks/engine/theme-revision.css?raw'
import themeCatalogCss from '../vendor/acks/engine/theme-catalog.css?raw'
import { type AcksTheme, DEFAULT_TYPOGRAPHY_THEME } from './acks-mapping'

const MD: any = (globalThis as any).MD
const RENDER: any = (globalThis as any).ACKS_RENDER
const THEME_ASSETS: Record<string, string> = { 'glass-ribbon': glassRibbon, 'ink-gesture': inkGesture, 'paper-edge': paperEdge }
// ACKS 的 applyDecorations 用裸全局 THEME_ASSETS，需在建 DOM 前挂到全局。
;(globalThis as any).THEME_ASSETS = THEME_ASSETS

// hydrate signature.svg —— applyDecorations 读 MD.SIGNATURES[k].svg（原始 SVG 文本，replaceAll 换色）。
// 30 个 type:"svg" 签名用 import.meta.glob(?raw) 载入，按 file 名回填到 MD.SIGNATURES。
const signatureSvgs: Record<string, string> = import.meta.glob(
  '../vendor/acks/engine/theme-signatures/*.svg',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>
const signatures: Record<string, any> = MD?.SIGNATURES ?? {}
for (const [p, svg] of Object.entries(signatureSvgs)) {
  const fname = p.split('/').pop()!
  for (const sig of Object.values(signatures)) {
    if (sig?.type === 'svg' && sig.file === fname && !sig.svg) sig.svg = svg
  }
}

export function getAcksTheme(id: string): AcksTheme | undefined {
  return MD?.THEMES?.[id]
}

export const ACKS_THEME_IDS: string[] = MD ? Object.keys(MD.THEMES) : []

export function resolveThemeAssets(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>('img[data-theme-asset]').forEach((img) => {
    const key = img.getAttribute('data-theme-asset')
    if (key && THEME_ASSETS[key]) img.src = THEME_ASSETS[key]
  })
}

// ACKS 引擎 CSS 是静态导入，拼接一次缓存；renderAcksArticle 每次都会调用 injectAcksCss，
// 用已写入值比对，避免每次渲染都重写 ~130KB 的 textContent。
const ACKS_THEME_CSS = [articleCss, milestoneBaseCss, milestoneGeneratedCss, themeRevisionCss, themeCatalogCss].join('\n')
let lastInjectedCss: string | null = null

export function injectAcksCss(): void {
  let el = document.getElementById('lz-acks-theme-css') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'lz-acks-theme-css'
    document.head.appendChild(el)
  }
  // 只在内容真正变化时写 textContent（卸载时不移除节点，评审判定无害，保留）。
  if (lastInjectedCss === ACKS_THEME_CSS) return
  el.textContent = ACKS_THEME_CSS
  lastInjectedCss = ACKS_THEME_CSS
}

export function renderAcksArticle(host: HTMLElement, mdHtml: string, themeId: string): void {
  const t = getAcksTheme(themeId) ?? getAcksTheme(DEFAULT_TYPOGRAPHY_THEME)
  if (!t) return
  const doc = document.createElement('section')
  doc.className = t.milestoneKey ? 'ms-doc' : 'md-doc'
  if (t.milestoneKey) doc.dataset.milestone = `${t.milestoneKey}-${t.milestoneVariant || 'light'}`
  doc.dataset.revision = String(t.themeVersion || 1)
  doc.dataset.profile = t.editorialProfile || 'legacy'
  doc.innerHTML = mdHtml
  doc.querySelectorAll('p').forEach((n) => n.classList.add('md-p'))
  doc.querySelectorAll('blockquote').forEach((n) => n.classList.add('md-bq'))
  doc.querySelectorAll('table').forEach((n) => n.classList.add('md-table'))
  doc.querySelectorAll('hr').forEach((n) => n.classList.add('md-hr'))
  doc.querySelectorAll('img').forEach((n) => n.classList.add('md-img'))
  doc.querySelectorAll('code').forEach((n) => n.classList.add('md-ci'))
  doc.querySelectorAll('pre').forEach((n) => n.classList.add('md-pre'))
  RENDER.applyDesignAttrs(doc, t)
  RENDER.applyDecorations(doc, t)
  RENDER.applyLayout(doc, t)
  resolveThemeAssets(doc)
  RENDER.paintTokens(doc, t)
  host.replaceChildren(doc)
  injectAcksCss()
}
