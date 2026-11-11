import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

// src/additional/ 的插件子系统整簇死代码：additional/index.ts（桶文件）从未被任何
// 代码 import，plugins/* 与 i18n/strings.ts、utils/match-words.ts、milkdown/index.ts
// 只被该桶/内部互相引用，从 main.tsx 入口不可达（约 1560 行）。
// 只有 MilkdownEditor.tsx + milkdown.css 是活的（App 在 wysiwyg 模式下渲染）。
const f = (p) => new URL(`../src/additional/${p}`, import.meta.url)

const DEAD = [
  'index.ts',
  'plugins/index.ts',
  'plugins/plugin-api.ts',
  'plugins/app/commands.ts',
  'plugins/host/rpc.ts',
  'plugins/store/files.ts',
  'plugins/store/lifecycle.ts',
  'plugins/store/manifest-parse.ts',
  'plugins/store/manifest.ts',
  'plugins/store/permissions.ts',
  'plugins/store/plugin-records.ts',
  'i18n/strings.ts',
  'utils/match-words.ts',
  'milkdown/index.ts',
]
for (const p of DEAD) {
  assert.equal(existsSync(f(p)), false, `src/additional/${p} 必须删除（不可达死代码）`)
}

// ── 活文件必须保留 ──
assert.ok(existsSync(f('milkdown/MilkdownEditor.tsx')), 'MilkdownEditor.tsx 必须保留（wysiwyg 模式在用）')
assert.ok(existsSync(f('milkdown/milkdown.css')), 'milkdown.css 必须保留')

console.log('additional dead cluster removed ok')
