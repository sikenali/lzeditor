import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const store = read('src/store/editorStore.ts')
const types = read('src/shared/types.ts')
const cat = read('src/utils/docCatalog.ts')

assert.match(store, /versionsByDoc:/)                       // 全局 versions 已改
assert.ok(!/versions:\s*\[\]/.test(store))                  // 旧的全局 versions 数组不存在
assert.match(store, /addVersion: \(docId: string, version: DocVersion\)/)   // 按文档
assert.match(store, /createDoc: \(title\?: string, path = '', libraryId\?: string, diskPath\?: string\)/)
assert.match(store, /hydrateVersions:/)
assert.match(store, /diskPath: d\.diskPath/)                // saveCatalog 带上 diskPath
assert.match(types, /versionsByDoc: Record<string, DocVersion\[\]>/)
assert.match(types, /ts: number/)                            // DocVersion 有 ts
assert.match(types, /source: 'git' \| 'local'/)
assert.match(cat, /diskPath\?: string/)                      // CatalogEntry

console.log('history store wiring ok')
