import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── task 9：状态栏真实统计（字数/字符/行列/阅读时长），task 10：页脚中间图标 hover 提示 ──

const app = read('src/App.tsx')
const milkdown = read('src/components/editor/MilkdownEditor.tsx')
const footer = read('src/components/layout/Footer.tsx')
const layout = read('src/styles/layout.css')
const stats = read('src/utils/textStats.ts')

// 编辑内容变化 → 真实字数/字符数（此前 setWordCount/setCharCount 从未被调用，恒 0）
assert.match(app, /import \{ countWords, countChars \} from '\.\/utils\/textStats'/, 'App 必须导入 countWords/countChars')
assert.match(app, /es\.setWordCount\(countWords\(md\)\)/, 'handleEditorChange 必须按真实 md 计算字数')
assert.match(app, /es\.setCharCount\(countChars\(md\)\)/, 'handleEditorChange 必须按真实 md 计算字符数')

// Milkdown（WYSIWYG）光标行列跟踪（此前不更新，恒 行1列1）
assert.match(milkdown, /import \{ lineColFromSource \} from '\.\.\/\.\.\/utils\/textStats'/, 'MilkdownEditor 必须导入 lineColFromSource')
assert.match(milkdown, /onSelectionChange\(\(sel\) =>/, 'MilkdownEditor 必须订阅 onSelectionChange（光标行列）')
assert.match(milkdown, /setCursorPosition\(\{ line, column \}\)/, 'MilkdownEditor 必须写回 cursorPosition')

// 阅读时长：0 字 → 0 分钟（此前 Math.max(1,…) 恒 1 分钟）
assert.match(footer, /const readTime = wordCount === 0 \? 0 : Math\.max\(1, Math\.ceil\(wordCount \/ 200\)\)/, '阅读时长 0 字必须 0 分钟')

// textStats 工具：CJK 逐字 + 拉丁/数字词、非空白字符、行列换算
assert.match(stats, /export function countWords/, '必须有 countWords')
assert.match(stats, /export function countChars/, '必须有 countChars')
assert.match(stats, /export function lineColFromSource/, '必须有 lineColFromSource')
assert.match(stats, /\\u4e00-\\u9fff/, 'countWords 必须按 CJK 逐字计数')

// task 10：页脚中间图标 hover 文字（工具提示），与 statusbar-action 统一样式
assert.match(layout, /\.app-footer-btn\[data-title\]\s*\{\s*position:\s*relative;\s*\}/, '页脚按钮必须 position:relative（工具提示锚点）')
assert.match(layout, /\.app-footer-btn\[data-title\]:hover::after\s*\{[\s\S]*?content:\s*attr\(data-title\);/, '页脚按钮 hover 必须显示 data-title 文字')
assert.match(layout, /\.app-footer-btn\[data-title\]:hover::after\s*\{[\s\S]*?background:\s*var\(--chrome-tooltip-bg/, '页脚工具提示必须用统一 chrome-tooltip 背景')
assert.match(footer, /data-title="大纲"/, '页脚大纲按钮必须有 data-title')
assert.match(footer, /data-title="即时预览"/, '页脚即时预览按钮必须有 data-title')
assert.match(footer, /data-title="样式预览"/, '页脚样式预览按钮必须有 data-title')

console.log('status stats + footer tooltip ok')
