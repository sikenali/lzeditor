import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── task 2：设置图标 hover 黑底看不清 —— 修复为可见的主题色 pill 底（浅/深主题均非黑、对比清晰）──
const css = read('src/styles/settings-dialog.css')

// 「查看」（API Key 眼睛按钮 .form-key-toggle）hover 必须有可见背景 pill，且背景走主题 token（绝不用黑）
const toggle = css.match(/\.form-key-toggle:hover\s*\{[^}]*\}/)?.[0] || ''
assert.match(toggle, /background:\s*var\(--color-bg-secondary\)/, '查看/眼睛按钮 hover 必须有 --color-bg-secondary pill 底（task 2）')
assert.ok(!toggle.includes('#000') && !toggle.includes('black'), '查看按钮 hover 不得用黑色背景（task 2）')

// hover 后图标颜色必须提亮到可读主色（非停留在 muted）
const toggleRemix = css.match(/\.form-key-toggle:hover\s+\.remix\s*\{[^}]*\}/)?.[0] || ''
assert.match(toggleRemix, /color:\s*var\(--color-text-primary\)/, '查看按钮 hover 图标必须可读主色（task 2）')

// 同类设置图标按钮（保存密钥行的 测试/编辑/删除）hover 背景也必须走主题 token（不得黑）
// 规则是合并选择器 `.saved-key-test:hover, .saved-key-edit:hover { ... }`，须按逗号分组匹配。
for (const sel of ['.saved-key-test:hover', '.saved-key-edit:hover']) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(esc + '\\s*(?:,\\s*[^{]+)?\\s*\\{[^}]*\\}')
  const b = css.match(re)?.[0] || ''
  assert.match(b, /var\(--color-bg-secondary\)/, `${sel} 必须用主题 token 背景（不得黑）`)
  assert.ok(!b.includes('#000') && !b.includes('black'), `${sel} 不得用黑色背景`)
}

console.log('settings hover contrast ok')
