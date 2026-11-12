import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const main = read('electron/main.ts')
const preload = read('electron/preload.ts')
const api = read('electron/api.ts')

assert.match(main, /ipcMain\.handle\('git:authorize'/)
assert.match(main, /ipcMain\.handle\('git:history'/)
assert.match(main, /ipcMain\.handle\('git:show'/)
assert.match(main, /getGitHistory\(/)          // 复用 electron/gitHistory
assert.match(main, /isAllowedPath\(/)           // 授权闸门
assert.match(preload, /gitHistory: \(filePath: string\) => ipcRenderer\.invoke\('git:history', filePath\)/)
assert.match(preload, /gitShow: \(filePath: string, oid: string\) => ipcRenderer\.invoke\('git:show', filePath, oid\)/)
assert.match(preload, /gitAuthorize: \(filePath: string\) => ipcRenderer\.invoke\('git:authorize', filePath\)/)
assert.match(preload, /getPathForFile: \(file: File\) => webUtils\.getPathForFile\(file\)/)
assert.match(preload, /webUtils/)
assert.match(api, /gitHistory: \(filePath: string\) => Promise<GitHistoryResult>/)
assert.match(api, /gitShow: \(filePath: string, oid: string\) => Promise<GitShowResult>/)
assert.match(api, /getPathForFile: \(file: File\) => string/)
assert.match(api, /interface GitHistoryResult/)

console.log('git ipc wiring ok')
