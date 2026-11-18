import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/styles/settings-dialog.css')
const exportDialog = read('src/components/panels/ExportDialog.tsx')

const body = css.match(/\.ud-preview-body\s*\{[^}]*\}/)?.[0] || ''
assert.match(body, /height:\s*280px/, '导出预览固定高度 280px（2026-11-18 紧凑化，原 380）')
assert.match(body, /overflow-y:\s*auto/, '导出预览可滚动（纵向）')
assert.match(exportDialog, /width=\{780\}/, '导出弹框收窄至 780')

console.log('export preview height ok')
