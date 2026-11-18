import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// --- Task 4: ACKS 门面 / 宿主边界断言（后续 Task 5/6/8 追加） ---
const acksThemes = read('src/styles/acks-themes.ts')
assert.match(acksThemes, /renderAcksArticle/, '门面必须导出 renderAcksArticle')
assert.match(acksThemes, /ms-doc/, 'Milestone 用 .ms-doc')
assert.match(acksThemes, /doc\.dataset\.milestone/, 'Milestone 必须挂 data-milestone')
assert.match(acksThemes, /data-theme-asset/, '必须解析 data-theme-asset 资源')
assert.match(acksThemes, /lz-acks-theme-css/, 'ACKS CSS 注入独立 style 节点')
assert.match(acksThemes, /import\.meta\.glob/, '签名 svg 用 import.meta.glob 载入')
assert.match(acksThemes, /sig\.svg = svg/, '必须回填 MD.SIGNATURES[k].svg（applyDecorations 依赖）')
assert.match(acksThemes, /THEME_ASSETS/, '必须定义 THEME_ASSETS（applyDecorations 依赖）')
