import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const hp = read('src/components/panels/HistoryPanel.tsx')

assert.match(hp, /mergeTimeline\(/)            // 合并时间线
assert.match(hp, /commitShortHash\(/)           // 兼容 git SHA
assert.match(hp, /hydrateVersions\(/)           // 启动播种本地快照
assert.match(hp, /gitHistory\(/)                // 异步拉 git 历史
assert.match(hp, /gitShow/)                     // git 项取内容
assert.match(hp, /source === 'git'/)            // 区分来源
assert.match(hp, /ri-git-commit-line/)          // git 图标
assert.match(hp, /ri-history-line/)             // 本地图标
assert.match(hp, /setVersionSuppressed\(/)      // 回滚/重播抑制快照
assert.match(hp, /loading/)                     // git 异步 loading 态
assert.match(hp, /mdToHtml\(/)                  // git 内容转 html 预览

// ── 评审 Important #1：切文档时重置 git 提交（防上一文档提交泄漏进合并时间线）──
assert.match(hp, /setGitCommits\(\[\]\)/)       // 效果体开头重置提交
assert.match(hp, /cancelled/)                    // stale 异步响应丢弃守卫

// ── 评审 Important #2：重启后 allowedPaths 已清空 → 打开时重新授权持久化 diskPath ──
assert.match(hp, /gitAuthorize/)                 // 打开/切文档时重新授权 diskPath

console.log('history panel wiring ok')
