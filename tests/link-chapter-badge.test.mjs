import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const link = read('src/components/panels/LinkDialog.tsx')
const uiSelect = read('src/components/ui/UiSelect.tsx')
const uiCss = read('src/styles/ui.css')

// 章节引用下拉项必须带 H 级徽标（H1/H2/H3…），不再用全角空格缩进表达层级
assert.match(link, /badge:\s*`H\$\{c\.level\}`/, '章节引用下拉项必须带 H 级徽标')
assert.doesNotMatch(link, /　\.repeat\(c\.level\s*-\s*1\)/, '章节引用不再用全角空格缩进表达层级')

// UiSelect 支持可选 badge 字段，并在下拉项与触发器中渲染
assert.match(uiSelect, /badge\?: string/, 'UiSelectOption 支持可选 badge 字段')
assert.match(uiSelect, /ui-select-item-badge/, 'UiSelect 渲染下拉项 badge')
assert.match(uiSelect, /selected\?\.badge/, 'UiSelect 触发器也渲染选中项 badge')

// badge 有样式（含行内排布）
assert.match(uiCss, /\.ui-select-item-badge/, 'badge 必须有样式')
assert.match(uiCss, /\.ui-select-item-row\s*\{[\s\S]*display:\s*flex/, 'badge 与标题必须同行排布')

console.log('link chapter badge checks passed')
