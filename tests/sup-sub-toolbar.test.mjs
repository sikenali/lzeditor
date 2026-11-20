import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const actions = read('src/components/layout/editorActions.tsx')
const toolbar = read('src/components/layout/Toolbar.tsx')

// ── 上标/下标：顶栏单图标 → 2 子菜单（用户要求，替代格式菜单里的两个独立项）──

// FORMAT_ITEMS 不再含 上标/下标 两个独立项（改由 SUP_SUB_ITEMS 单图标承载）
const fmtBlock = actions.match(/const FORMAT_ITEMS[\s\S]*?\n\]/)?.[0] || ''
assert.ok(!fmtBlock.includes("action: 'sup'"), 'FORMAT_ITEMS 不得再含上标（改单图标）')
assert.ok(!fmtBlock.includes("action: 'sub'"), 'FORMAT_ITEMS 不得再含下标（改单图标）')
assert.ok(!fmtBlock.includes("label: '上标'"), 'FORMAT_ITEMS 不得再含「上标」项')
assert.ok(!fmtBlock.includes("label: '下标'"), 'FORMAT_ITEMS 不得再含「下标」项')

// SUP_SUB_ITEMS：单图标下的 2 个子菜单（上标/下标）
const supSubBlock = actions.match(/const SUP_SUB_ITEMS[\s\S]*?\n\]/)?.[0] || ''
assert.match(supSubBlock, /label: '上标', action: 'sup'/, 'SUP_SUB_ITEMS 必须含「上标」子项')
assert.match(supSubBlock, /label: '下标', action: 'sub'/, 'SUP_SUB_ITEMS 必须含「下标」子项')
assert.ok((supSubBlock.match(/action: 'sup'|action: 'sub'/g) || []).length === 2, 'SUP_SUB_ITEMS 必须恰好 2 个子项')

// Toolbar 必须有顶栏「上标/下标」单图标按钮，且 ActionMenu 用 SUP_SUB_ITEMS
assert.match(toolbar, /aria-label="上标\/下标"/, '顶栏必须有「上标/下标」单图标按钮')
assert.match(toolbar, /flyout\.open\('sup-sub'/, '按钮必须打开 sup-sub 飞层')
assert.match(toolbar, /flyout\.key === 'sup-sub' \? SUP_SUB_ITEMS/, 'ActionMenu 必须用 SUP_SUB_ITEMS 渲染 2 子菜单')
assert.match(toolbar, /key === 'sup-sub'\) formatAction\(action\)/, 'sup-sub 动作必须走 formatAction（sup/sub 映射）')

console.log('sup-sub toolbar ok')
