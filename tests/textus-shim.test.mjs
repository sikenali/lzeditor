import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useSettings } from '../src/additional/milkdown/textus/shim/settings-context.ts'

test('useSettings 提供英文翻译对象与编辑器默认 settings', () => {
  const { t, settings } = useSettings()
  assert.equal(typeof t.splitPreview, 'string')
  assert.ok(t.splitPreview.length > 0, 't.splitPreview 应为非空字符串（SplitPreview aria-label）')
  assert.equal(typeof t.hoverCard, 'string')
  assert.equal(typeof t.missingImageRemote, 'string')
  assert.equal(settings.enableMath, true, '预览须绘制 math')
  assert.equal(settings.enableMermaid, true, '预览须绘制 mermaid')
  assert.equal(settings.language, 'en')
})
