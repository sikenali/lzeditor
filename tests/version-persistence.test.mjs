import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeVersions, capVersions } from '../src/utils/versionPersistence.ts'

const v = (id, ts) => ({ id, ts, source: 'local', time: '10:00:00', date: '2026-11-12', desc: '', changes: 1, html: '', md: '' })

test('normalizeVersions：丢弃缺 ts/source 的脏条目', () => {
  assert.equal(normalizeVersions([v('1', 1), { id: 'bad' }, null, v('2', 2)]).length, 2)
})
test('capVersions：上限 10，保留最新', () => {
  const many = Array.from({ length: 15 }, (_, i) => v(String(i), i))
  const capped = capVersions(many)
  assert.equal(capped.length, 10)
  assert.equal(capped[0].id, '5')
})
