import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// buildCM6Extensions 是 Compartment 重构前的一次性旧入口：生产无人 import
// （CodeEditor 用 [...buildCM6Core(), ...settingsCtrl.current.build(...)]），
// 仅被测试文本断言。删除死导出，测试改为断言 createCm6Settings 是唯一装配路径。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const ext = read('src/components/editor/facade/cm6/cm6-extensions.ts')

// ── 死导出必须删除 ──
assert.ok(!/export function buildCM6Extensions/.test(ext), 'buildCM6Extensions 死导出必须删除（生产无人 import）')

// ── 唯一装配路径：createCm6Settings（Compartment 控制器）──
assert.match(ext, /export function createCm6Settings/, '必须保留 createCm6Settings（唯一装配路径）')
assert.match(ext, /buildCM6Core/, '必须保留 buildCM6Core（核心扩展）')

console.log('buildCM6Extensions dead export removed ok')
