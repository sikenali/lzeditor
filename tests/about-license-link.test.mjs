import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'

// 关于页按 lzmail 参考实现不含「开源许可」链接（只有单个居中 GitHub 图标）。
// 但 THIRD_PARTY_NOTICES.md（开源许可声明）必须保留在 public/ 供后续接入。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const about = read('src/components/panels/settings/AboutSettingsTab.tsx')

// ── 不得再指向不存在的 /licenses/ 路径 ──
assert.ok(!about.includes('/licenses/'), 'AboutSettingsTab 不得引用不存在的 /licenses/ 路径（404 死链）')

// ── lzmail 参考实现：关于页只保留单个 GitHub 图标，不含开源许可链接 ──
assert.doesNotMatch(about, /THIRD_PARTY_NOTICES\.md/, '关于页按 lzmail 参考实现不应链接开源许可')

// ── public/ 必须保留该文件（Vite 原样复制到 dist，可随时重新接入）──
const root = new URL('..', import.meta.url)
assert.ok(
  existsSync(new URL('public/THIRD_PARTY_NOTICES.md', root)),
  'public/THIRD_PARTY_NOTICES.md 必须保留（开源许可声明不能丢）',
)

console.log('about license link ok')
