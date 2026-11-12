import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeTimeline, commitShortHash, countLineDiff, formatTimeTs } from '../src/utils/historyTimeline.ts'

const local = (id, ts) => ({ id, ts, source: 'local', time: '10:00:00', date: '2026-11-12', desc: '', changes: 1, html: '', md: '' })
const git = (oid, ts, changes) => ({ oid, message: `m${oid.slice(0,2)}`, author: 'a', ts, changes, gitPath: 'f.md' })

test('mergeTimeline：git+local 按 ts 倒序，git 项映射正确', () => {
  const merged = mergeTimeline([local('1', 1000), local('2', 3000)], [git('abc123', 2000, 5)], 'f.md')
  assert.equal(merged.length, 3)
  assert.deepEqual(merged.map(v => v.id), ['2', 'abc123', '1'])
  const g = merged.find(v => v.source === 'git')
  assert.equal(g.id, 'abc123'); assert.equal(g.isFromGit, true); assert.equal(g.gitPath, 'f.md'); assert.equal(g.desc, 'mab'); assert.equal(g.changes, 5)
})

test('mergeTimeline：git 空 → 纯 local', () => {
  assert.deepEqual(mergeTimeline([local('1', 1000)], []).map(v => v.id), ['1'])
})

test('commitShortHash：git SHA 取前 6 位，数字 id 走 16 进制', () => {
  assert.equal(commitShortHash('a1b2c3d4e5'), 'a1b2c3')
  assert.equal(commitShortHash('255'), 'ff')
})

test('countLineDiff：行增删', () => {
  assert.equal(countLineDiff('a\nb\nc', 'a\nb\nc'), 0)
  assert.equal(countLineDiff('a\nb', 'a\nb\nc\nd'), 2)
  assert.equal(countLineDiff('a\nb\nc', 'a\nx\nc'), 2)
})

test('formatTimeTs：YYYY-MM-DD + HH:MM:SS', () => {
  const { date, time } = formatTimeTs(new Date(2026, 10, 12, 9, 5, 7).getTime())
  assert.equal(date, '2026-11-12'); assert.equal(time, '09:05:07')
})
