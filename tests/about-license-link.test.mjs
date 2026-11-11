import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'

// 关于页「开源许可」是死链：href 指向 /licenses/THIRD_PARTY_NOTICES.md，但 public/
// 与 dist/ 都没有 licenses/ 目录，点击 404。文件实际在项目根 THIRD_PARTY_NOTICES.md。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const about = read('src/components/panels/settings/AboutSettingsTab.tsx')

// ── 不得再指向不存在的 /licenses/ 路径 ──
assert.ok(!about.includes('/licenses/'), 'AboutSettingsTab 不得引用不存在的 /licenses/ 路径（404 死链）')

// ── 必须指向真实存在的路径 ──
assert.match(about, /THIRD_PARTY_NOTICES\.md/, '开源许可必须引用真实存在的 THIRD_PARTY_NOTICES.md')

// ── public/ 必须提供该文件（Vite 原样复制到 dist，dev/build 都能访问）──
const root = new URL('..', import.meta.url)
assert.ok(
  existsSync(new URL('public/THIRD_PARTY_NOTICES.md', root)),
  'public/THIRD_PARTY_NOTICES.md 必须存在（否则 dev/build 下仍 404）',
)

console.log('about license link ok')
