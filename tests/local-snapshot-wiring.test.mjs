import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const app = read('src/App.tsx')

// Ctrl+S 保存：后端记录时间（/api/versions），历史面板非 git 时间线显示最近 10 次
assert.match(app, /saveCurrentDoc/)
assert.match(app, /recordVersion\(/)          // 后端记录保存
assert.match(app, /key === 's'/)              // Ctrl+S 绑定
assert.match(app, /addVersion\(/)             // 写回 store（后端成功或本地回退）
assert.match(app, /source: 'local'/)
assert.match(app, /nextVersionId\(\)/)
assert.match(app, /countLineDiff\(/)
assert.match(app, /formatTimeTs\(/)
assert.doesNotMatch(app, /isVersionSuppressed\(\)/, 'auto-capture 已移除：版本仅由 Ctrl+S 创建')
assert.match(app, /import \{ countLineDiff, formatTimeTs \} from '\.\/utils\/historyTimeline'/)
assert.match(app, /import \{ nextVersionId \} from '\.\/utils\/versionId'/)
assert.match(app, /import \{ recordVersion \} from '\.\/services\/versionApi'/)

console.log('ctrl+s save wiring ok')
