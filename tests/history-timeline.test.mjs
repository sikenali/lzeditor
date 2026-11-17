import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeTimeline, commitShortHash, countLineDiff, formatTimeTs, MAX_TIMELINE } from '../src/utils/historyTimeline.ts'

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

// ── 历史页硬截断：mergeTimeline 只返回最近 MAX_TIMELINE 条 ──
test('mergeTimeline：超过 10 条 → 只返回最近 10 条（历史页硬截断）', () => {
  const local = Array.from({ length: 8 }, (_, i) => ({ id: `L${i}`, ts: i * 100, source: 'local', time: '', date: '', desc: '', changes: 1, html: '', md: '' }))
  const git = Array.from({ length: 8 }, (_, i) => ({ oid: `G${i}`, message: 'm', author: 'a', ts: 1000 + i * 100, changes: 1, gitPath: 'f.md' }))
  const merged = mergeTimeline(local, git, 'f.md')
  assert.equal(merged.length, MAX_TIMELINE, '必须只返回 10 条')
  // 必须是最近 10 条：ts 最大的 10 个（local 项有 .id，git 项在 all 里还是 .oid）
  const all = [...local, ...git].sort((a, b) => b.ts - a.ts)
  assert.deepEqual(merged.map(v => v.id), all.slice(0, 10).map(v => v.id ?? v.oid), '返回的必须是最新的 10 条')
})

test('mergeTimeline：≤10 条 → 原样返回（本地无 git 时 no-op）', () => {
  const local = Array.from({ length: 5 }, (_, i) => ({ id: `L${i}`, ts: i * 100, source: 'local', time: '', date: '', desc: '', changes: 1, html: '', md: '' }))
  const merged = mergeTimeline(local, [], undefined)
  assert.equal(merged.length, 5, '≤10 条必须原样返回')
})
