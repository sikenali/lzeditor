import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 文档库 Git/博客/GitBook 三个「连接…」按钮实际都是本地 md 文件选择器
// （LibraryPanel handleImportGit/Blog/Gitbook 全开 <input type=file accept=".md">），
// 与「连接 Git 仓库 / 从博客导入 / 从 GitBook 导入」文案不符。修复：统一为真实行为。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const buttons = read('src/components/panels/ImportButtons.tsx')
const panel = read('src/components/panels/LibraryPanel.tsx')

// ── ImportButtons 不得再出现误导的「连接 X」文案 ──
for (const misleading of ['连接 Git 仓库', '连接博客', '连接 GitBook']) {
  assert.ok(!buttons.includes(misleading), `ImportButtons 不得含误导文案「${misleading}」`)
}

// ── 必须体现真实行为（从本地导入 Markdown）──
assert.match(buttons, /从本地导入 Markdown/, 'ImportButtons 必须注明「从本地导入 Markdown」真实行为')

// ── 误导 desc 不得再描述在线导入 ──
assert.ok(!buttons.includes('在线博客同步'), '不得再描述在线博客同步（实际是本地导入）')
assert.ok(!buttons.includes('Git 仓库中的 Markdown'), '不得再描述 Git 仓库导入（实际是本地导入）')

// ── LibraryPanel 三个 handler 应统一为本地导入（不再 3 份重复选择器）──
const localImports = (panel.match(/type = 'file'/g) || []).length
assert.ok(localImports <= 1, `LibraryPanel 本地文件选择器应统一为 1 处（当前 ${localImports} 处，Git/博客/GitBook 三份重复）`)

console.log('import buttons honest ok')
