import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(new URL('../src/styles/fonts.css', import.meta.url), 'utf8')
// css 中的 url('../assets/...') 相对 src/styles/ 解析
const cssDir = dirname(fileURLToPath(new URL('../src/styles/fonts.css', import.meta.url)))

// 11 款 ACKS 主题展示字体必须全部有 @font-face
const fams = ['Lora','Playfair Display','EB Garamond','Cormorant Garamond','Space Grotesk','DM Sans','Archivo','Anton','Source Serif 4','Noto Serif SC','Ma Shan Zheng']
for (const f of fams) {
  // font-family 后允许有/无空格（与现有 fonts.css 的 house style 及 brief 模板兼容）
  assert.match(css, new RegExp(`@font-face[^}]*font-family:\\s*'${f.replace(/ /g, '\\s')}'`), `${f} 必须有 @font-face`)
}

// Ma Shan Zheng 单 weight 400；Noto Serif SC 变体 wght 100-900
assert.match(css, /font-family:\s*'Ma Shan Zheng'[^}]*font-weight:\s*400/, 'Ma Shan Zheng 单 weight')
assert.match(css, /font-family:\s*'Noto Serif SC'[^}]*font-weight:\s*100 900/, 'Noto Serif SC variable')

// 全部自托管：不得有外部 https:// 的 src（所有字体文件都在仓库内）
const srcUrls = [...css.matchAll(/src:\s*url\(['"]?([^'")]+)['"]?\)/g)].map(m => m[1])
assert.ok(srcUrls.length > 0, '至少有一个 @font-face src')
for (const u of srcUrls) {
  assert.ok(!/^https?:/.test(u), `@font-face src 不得为外部 URL：${u}`)
}

// 每个引用的字体文件都必须真实存在于仓库内（相对 src/styles/ 解析）
const missing = srcUrls.filter(u => !existsSync(resolve(cssDir, u)))
assert.deepEqual(missing, [], `以下字体文件不存在：${missing.join(', ')}`)

console.log(`acks-fonts.test: 通过（${fams.length} 款 @font-face 齐全，${srcUrls.length} 个本地 src 全部存在，无外部 URL）`)
