import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/components/layout/DocumentMetaBar.tsx', import.meta.url), 'utf8')
assert.match(src, /showWelcome/, 'DocumentMetaBar 必须感知 showWelcome')
assert.match(src, /activeDocId/, 'DocumentMetaBar 必须感知 activeDocId')
assert.match(src, /return null/, '无文档/欢迎页时应整体不渲染')
console.log('meta-tabs visibility guarded')
