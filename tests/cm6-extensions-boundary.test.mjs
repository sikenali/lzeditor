import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const ext = read('src/components/editor/facade/cm6/cm6-extensions.ts')
const render = read('src/utils/markdown/render.ts')
const echarts = read('src/utils/markdown/echarts.ts')
const preview = read('src/components/sidebar/SidebarPreview.tsx')

// ── createCm6Settings configures the source editor ──
assert.match(ext, /createCm6Settings/, 'must export createCm6Settings')
assert.match(ext, /@codemirror\/lang-markdown/, 'must use the markdown language')
assert.match(ext, /closeBrackets/, 'must include auto-pairing')

// ── render-ext is NOT wired into the shared preview renderer ──
// (installKatex would duplicate createMarkdownIt's math rules; the preview
// already renders mermaid via renderMermaidBlocks and KaTeX via its own rules.)
assert.doesNotMatch(render, /installRenderExt|render-ext|installKatex/, 'createMarkdownIt must not import render-ext')

// ── echarts survives in the preview via a post-render hydrator (mirrors mermaid) ──
assert.match(echarts, /renderEchartsBlocks/, 'must export renderEchartsBlocks for the preview')
assert.match(echarts, /language-echarts/, 'must target code.language-echarts blocks')
assert.match(preview, /renderEchartsBlocks/, 'SidebarPreview must hydrate echarts')

console.log('cm6 extensions ok')
