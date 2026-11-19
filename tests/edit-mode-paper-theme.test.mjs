import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * 编辑模式（WYSIWYG Milkdown）改用 Textus 暖纸张衬线渲染（paper 主题）。
 *
 * 用户反馈：「编辑模式的样式貌似不是很好看，Textus 的 md 显示好看」——
 * Textus 的标志外观是暖奶油底 + 衬线 + 大行距。当前编辑模式硬编码
 * data-content-theme="slate"（Inter 无衬线、冷色）。本测试钉死：
 * 1) MilkdownEditor 用 paper 主题（不用 slate）；
 * 2) content-themes.css 的 paper 主题含 .milkdown 衬线字体规则
 *    （--doc-font 的 var() 链在 lzeditor 里不可靠，需显式兜底）。
 */
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('编辑模式用 paper 主题（Textus 暖纸张衬线）而非 slate', () => {
  const milkdown = read('src/components/editor/MilkdownEditor.tsx')
  assert.match(
    milkdown,
    /data-content-theme="paper"/,
    '编辑模式应使用 data-content-theme="paper"（Textus 暖纸张渲染）',
  )
  assert.doesNotMatch(
    milkdown,
    /data-content-theme="slate"/,
    '编辑模式不应再用冷色 slate 主题',
  )
})

test('paper 主题的 .milkdown 有衬线字体兜底规则（--doc-font 链不可靠）', () => {
  const themes = read('src/additional/milkdown/textus/theme/content-themes.css')
  assert.match(
    themes,
    /\.textus-editor-shell\[data-content-theme="paper"\] \.milkdown\s*\{[^}]*font-family:[^}]*serif/i,
    'paper 主题应给 .milkdown 设置衬线 font-family（含 serif 兜底）',
  )
})
