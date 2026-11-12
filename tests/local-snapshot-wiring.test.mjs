import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const app = read('src/App.tsx')

// debounce 里 addVersion：传 docId + source:'local'
assert.match(app, /addVersion\(/)
assert.match(app, /source: 'local'/)
assert.match(app, /nextVersionId\(\)/)
assert.match(app, /countLineDiff\(/)
assert.match(app, /formatTimeTs\(/)
// 抑制标记：程序化载入期间不采快照
assert.match(app, /isVersionSuppressed\(\)/)
assert.match(app, /import \{ countLineDiff, formatTimeTs \} from '\.\/utils\/historyTimeline'/)
assert.match(app, /import \{ nextVersionId \} from '\.\/utils\/versionId'/)

console.log('local snapshot wiring ok')
