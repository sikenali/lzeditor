import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const fp = read('src/utils/filePath.ts')
const di = read('src/utils/docImport.ts')
const panel = read('src/components/panels/LibraryPanel.tsx')
const fpFile = read('src/components/panels/FilePanel.tsx')

assert.match(fp, /getDiskPath/)
assert.match(fp, /getPathForFile/)     // webUtils 桥优先
assert.match(fp, /\.path/)             // File.path fallback
assert.match(di, /openMarkdownDoc\(title: string, md: string, path = '', diskPath\?: string\)/)
assert.match(di, /getDiskPath\(/)
assert.match(di, /gitAuthorize/)
assert.match(panel, /getDiskPath\(/)
assert.match(panel, /openMarkdownDoc\(file\.name, text, file\.name\.replace\([^)]*\), disk\)/)
assert.match(panel, /gitAuthorize/)
assert.match(fpFile, /getDiskPath\(/)

console.log('filepath wiring ok')
