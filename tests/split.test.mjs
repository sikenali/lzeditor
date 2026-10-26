import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  SPLITTER_WIDTH,
  MIN_PANE_WIDTH,
  DEFAULT_RATIO,
  KEY_STEP,
  clampRatio,
  ratioFromPointer,
  gridColumns,
} from '../src/utils/split.ts'

test('常量取值与 backtickle 对齐', () => {
  assert.equal(SPLITTER_WIDTH, 6)
  assert.equal(MIN_PANE_WIDTH, 240)
  assert.equal(DEFAULT_RATIO, 0.5)
  assert.equal(KEY_STEP, 0.02)
})

test('clampRatio 区间内原样返回', () => {
  // 2000px 容器里最小占比是 240/1994 ≈ 0.12，所以下面三个值都落在有效区间内
  const containerWidth = 2000
  assert.equal(clampRatio(0.5, containerWidth), 0.5)
  assert.equal(clampRatio(0.3, containerWidth), 0.3)
  assert.equal(clampRatio(0.8, containerWidth), 0.8)
})

test('clampRatio 触碰最小栏宽时夹住', () => {
  const containerWidth = 1000
  const min = MIN_PANE_WIDTH / (containerWidth - SPLITTER_WIDTH)
  assert.equal(clampRatio(0.05, containerWidth), min, '低于下限夹到最小占比')
  assert.equal(clampRatio(0.99, containerWidth), 1 - min, '高于上限夹到 1 - 最小占比')
  assert.equal(clampRatio(0.0, containerWidth), min)
  assert.equal(clampRatio(1.0, containerWidth), 1 - min)
})

test('容器装不下两栏时退回 50/50', () => {
  // 400 - 6 = 394 可用，小于 240 * 2 = 480
  assert.equal(clampRatio(0.2, 400), DEFAULT_RATIO)
  assert.equal(clampRatio(0.8, 400), DEFAULT_RATIO)
  assert.equal(clampRatio(0.5, 0), DEFAULT_RATIO, '容器宽度未知')
  assert.equal(clampRatio(0.5, -50), DEFAULT_RATIO, '容器宽度为负')
})

test('ratioFromPointer 中间位置是 50/50', () => {
  const containerLeft = 100
  const containerWidth = 1000
  const usable = containerWidth - SPLITTER_WIDTH
  const mid = containerLeft + SPLITTER_WIDTH / 2 + usable / 2
  assert.equal(ratioFromPointer(mid, containerLeft, containerWidth), 0.5)
})

test('ratioFromPointer 越出边界会被夹住', () => {
  const containerLeft = 100
  const containerWidth = 1000
  const min = MIN_PANE_WIDTH / (containerWidth - SPLITTER_WIDTH)
  assert.equal(ratioFromPointer(0, containerLeft, containerWidth), min, '拉到左边外')
  assert.equal(ratioFromPointer(2000, containerLeft, containerWidth), 1 - min, '拉到右边外')
})

test('ratioFromPointer 容器太窄时退回 50/50', () => {
  assert.equal(ratioFromPointer(50, 0, 400), DEFAULT_RATIO)
  assert.equal(ratioFromPointer(50, 0, 0), DEFAULT_RATIO)
})

test('gridColumns 输出两栏 fr 加中间 6px', () => {
  assert.match(gridColumns(0.3, 1200), /^minmax\(0, [\d.]+fr\) 6px minmax\(0, [\d.]+fr\)$/)
  assert.match(gridColumns(0.5, 1200), /^minmax\(0, 0\.5fr\) 6px minmax\(0, 0\.5fr\)$/)
})

test('gridColumns 两栏占比和为 1', () => {
  // toFixed(4) 截断最多带 0.0001 的误差，所以和值容差取 1e-3
  for (const ratio of [0.5, 0.3, 0.8, 0.618]) {
    const m = gridColumns(ratio, 1200).match(/minmax\(0, ([\d.]+)fr\) 6px minmax\(0, ([\d.]+)fr\)/)
    assert.ok(m, '必须输出两栏 fr')
    assert.ok(Math.abs(Number(m[1]) + Number(m[2]) - 1) < 1e-3, '两栏占比和为 1')
  }
})

test('gridColumns 比例超界时先夹住，两栏都不会低于最小宽度', () => {
  const containerWidth = 1000
  const min = MIN_PANE_WIDTH / (containerWidth - SPLITTER_WIDTH)
  for (const ratio of [0.01, 0.99, 0, 1]) {
    const m = gridColumns(ratio, containerWidth).match(/minmax\(0, ([\d.]+)fr\) 6px minmax\(0, ([\d.]+)fr\)/)
    assert.ok(m, '必须输出两栏 fr')
    assert.ok(Number(m[1]) >= min - 1e-4, '左栏不低于最小占比')
    assert.ok(Number(m[2]) >= min - 1e-4, '右栏不低于最小占比')
  }
})
