import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// WYSIWYG 模式下工具栏命令整体失效的根因：MilkdownEditor 不注册 editor facade，
// getEditorFacade() 为 null → runMapped 静默 return false，粗体/斜体/删除线、
// 格式菜单（标题/清除/列表）、插入引用、查找、大纲跳转全部点了没反应。
// 修复：wysiwyg 下禁用需要 facade 的命令型入口（诚实表达不可用），
// runMapped 不再静默失败（快捷键等兜底 toast 提示）。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const actions = read('src/components/layout/editorActions.tsx')
const toolbar = read('src/components/layout/Toolbar.tsx')

// ── 必须有 applyWysiwygItems 动态禁用辅助 ──
assert.match(actions, /applyWysiwygItems/, '必须导出 applyWysiwygItems（wysiwyg 下禁用命令型项）')

// ── 命令型菜单项在 wysiwyg 下 disabled，面板型项保留可用 ──
const fn = actions.match(/export const applyWysiwygItems[\s\S]*?\n}/)?.[0] || ''
assert.ok(fn.includes('disabled'), 'applyWysiwygItems 必须给命令型项标 disabled')
assert.match(actions, /PANEL_ACTIONS/, 'applyWysiwygItems 必须用 PANEL_ACTIONS 区分面板型（保留可用）')

// ── runMapped 不得在 wysiwyg 下静默 no-op（需 toast 提示）──
assert.match(actions, /toast/, 'editorActions 必须 import toast（wysiwyg 下提示而非静默）')
assert.match(actions, /wysiwyg[\s\S]{0,200}toast|toast[\s\S]{0,80}wysiwyg/, 'runMapped 必须在 wysiwyg + 无 facade 时 toast 提示')

// ── Toolbar 命令型按钮必须禁用（粗体/斜体/删除线）──
assert.match(toolbar, /disabled=\{wysiwyg\}/, 'Toolbar 粗体/斜体/删除线必须 disabled={wysiwyg}')

// ── Toolbar 格式/插入菜单用动态 wysiwyg items ──
assert.match(toolbar, /applyWysiwygItems\(FORMAT_ITEMS/, 'Toolbar 格式菜单必须用 applyWysiwygItems')
assert.match(toolbar, /applyWysiwygItems\(INSERT_ITEMS/, 'Toolbar 插入菜单必须用 applyWysiwygItems')

console.log('wysiwyg toolbar disable ok')
