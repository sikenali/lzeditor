import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextVersionId } from '../src/utils/versionId.ts'

test('nextVersionId：单调递增且唯一', () => {
  const a = nextVersionId(), b = nextVersionId(), c = nextVersionId()
  assert.ok(/^\d+$/.test(a))
  assert.ok(Number(b) > Number(a))
  assert.ok(Number(c) > Number(b))
})
