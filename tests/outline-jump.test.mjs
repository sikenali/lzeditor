import assert from 'node:assert/strict'
import { registerOutlineJumper, getOutlineJumper, clearOutlineJumper } from '../src/utils/outlineJump.ts'

// 未注册时返回 null
assert.equal(getOutlineJumper(), null, '未注册时 getOutlineJumper 返回 null')

// 注册后返回该函数
const fn = (id) => { void id }
registerOutlineJumper(fn)
assert.equal(getOutlineJumper(), fn, '注册后 getOutlineJumper 返回该函数')

// 重复注册覆盖
const fn2 = (id) => { void id }
registerOutlineJumper(fn2)
assert.equal(getOutlineJumper(), fn2, '重复注册覆盖旧回调')

// 清空后返回 null
clearOutlineJumper()
assert.equal(getOutlineJumper(), null, 'clearOutlineJumper 后返回 null')

console.log('outline jump registry ok')
