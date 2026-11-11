import assert from 'node:assert/strict'
import { buildTableMd } from '../src/utils/tableMd.ts'

// 有标题表格：首行表头 + 分隔行 + 正文行
const withHeader = buildTableMd(3, 2, [['A', 'B'], ['1', '2']], true)
assert.ok(withHeader.includes('| --- | --- |'), '有标题表格必须含 GFM 分隔行')
assert.ok(withHeader.startsWith('| A | B |'), '有标题表格首行为表头')

// 无标题表格：虽然 GFM 把首行当表头，但必须含分隔行，否则整块退化成纯文本
const noHeader = buildTableMd(3, 2, [['A', 'B'], ['1', '2']], false)
assert.ok(noHeader.includes('| --- | --- |'), '无标题表格必须含 GFM 分隔行（否则渲染成纯文本）')
assert.ok(noHeader.split('\n').length >= 3, '无标题表格必须有 3 行（数据 + 分隔 + 数据）')

// 越界收敛
assert.ok(buildTableMd(0, 0).split('\n').length >= 2, '0×0 也收敛为最小表格')
assert.ok(buildTableMd(100, 40).split('\n').length <= 51, '行数收敛到 50 以内')

console.log('buildTableMd ok')
