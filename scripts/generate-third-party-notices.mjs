#!/usr/bin/env node
/**
 * 生成 THIRD_PARTY_NOTICES.md + THIRD_PARTY_LICENSES.txt。
 *
 * 为什么要这个文件：lzeditor 以 LPK 二进制包分发，里面的前端产物把
 * mermaid / katex / echarts / highlight.js 等全部打包进 minified bundle。
 * Apache-2.0 §4 和 BSD-3-Clause 都要求声明随分发一起提供，所以构建产物
 * 里带不出来的许可证信息得在这里显式补上。
 *
 * 只统计运行时依赖。lock 文件里 dev: true 的（vite、typescript、
 * electron-builder、@babel/*）不会进 LPK，不列。
 *
 * 用法：node scripts/generate-third-party-notices.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'))

/** lock 里的 runtime 条目，带 lock 路径（scoped 包是 node_modules/@scope/name） */
function runtimeEntries() {
  return Object.entries(lock.packages)
    .filter(([p, m]) => p && !m.dev && !m.optional)
    .map(([p, m]) => ({ lockPath: p, name: p.replace(/^.*node_modules\//, ''), version: m.version || '?' }))
}

/** 许可证文本从包自己带的 LICENSE 文件读，不靠网上抄 */
function readLicenseText(lockPath) {
  const dir = join(ROOT, lockPath)
  let ents
  try { ents = readdirSync(dir) } catch { return null }
  // jszip 带 LICENSE.markdown、有的带 LICENSE_APACHE2，硬编码清单会漏
  const names = ents.filter((n) => /^(licen[cs]e|copying|notice)(\..*)?$/i.test(n))
  const byWeight = names.sort((a, b) =>
    ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE.markdown', 'COPYING'].indexOf(a.toUpperCase()) -
    ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE.markdown', 'COPYING'].indexOf(b.toUpperCase()))
  for (const candidate of byWeight) {
    try {
      const text = readFileSync(join(dir, candidate), 'utf8').trim()
      if (text.length > 80) return text
    } catch { /* 换下一个 */ }
  }
  return null
}

function normLicense(id) {
  if (!id) return '未声明'
  // 双许可保持原样列出，不替它猜选了哪个——那得看包自带的 LICENSE 文件才能确认
  if (id.startsWith('Apache')) return 'Apache-2.0'
  if (id.startsWith('MIT') && id.includes('AND')) return 'MIT'
  return id
}

/** package.json 的 license 字段是可选的，缺了就用包自带的 LICENSE 内容推 */
function detectLicense(text) {
  if (!text) return null
  if (/MIT License|Permission is hereby granted/i.test(text)) return 'MIT'
  if (/Apache License[\s\S]{0,60}Version 2\.0/i.test(text)) return 'Apache-2.0'
  if (/The BSD 3-Clause/i.test(text)) return 'BSD-3-Clause'
  if (/The BSD License|BSD 2-Clause/i.test(text)) return 'BSD-2-Clause'
  if (/ISC License/i.test(text)) return 'ISC'
  return null
}

const groups = new Map()
for (const { lockPath, name, version } of runtimeEntries()) {
  let pj
  try { pj = JSON.parse(readFileSync(join(ROOT, lockPath, 'package.json'), 'utf8')) }
  catch { continue }
  const raw = pj.license
  const text = readLicenseText(lockPath)
  const key = normLicense(raw || detectLicense(text))
  if (!groups.has(key)) groups.set(key, { pkgs: [], text: null })
  const g = groups.get(key)
  g.pkgs.push(`${name} ${version}`)
  if (!g.text) g.text = text
}

const sorted = [...groups.entries()].sort((a, b) => b[1].pkgs.length - a[1].pkgs.length)

const header = `# Third-party notices

lzeditor 以 LPK 包分发，前端产物把第三方依赖打包进 minified bundle。
本文件说明用到的每个第三方包及其许可证。

本文件由 \`node scripts/generate-third-party-notices.mjs\` 生成，请勿手改。
只统计运行时依赖：lock 文件里标记 dev 的（vite / typescript / electron-builder /
@babel 等）不进 LPK，不列。

## 许可证合规说明

- **Apache-2.0** 要求保留版权与许可证声明（§4），THIRD_PARTY_LICENSES.txt 已附全文。
- **BSD-3-Clause** 要求版权声明出现在随分发的文档中，已满足。
- **双许可的包必须选定一个选项**，否则整份分发会被主张为更严的那个：
  - \`jszip 3.10.2\` — MIT 或 GPL-3.0，本项目**按 MIT 使用**。不声明这一点，
    GPL-3.0 的传染性会波及整个 LPK。
  - \`dompurify 3.4.15\` — MPL-2.0 或 Apache-2.0，本项目**按 Apache-2.0 使用**。
- \`khroma\` 等包在 package.json 里省略了 license 字段，脚本按包自带的 LICENSE 文件内容推断。
- 所有包均未经修改使用，源码可从公共 registry（npmjs.com）获取。

`

const notices = sorted.map(([lic, g]) => {
  const pkgs = [...new Set(g.pkgs)].sort()
  return `## ${lic}（${pkgs.length} 个包）\n\n| 包 | 版本 |\n|---|---|\n` +
    pkgs.map((p) => {
      const [name, version] = p.split(' ')
      return `| \`${name}\` | ${version || '-'} |`
    }).join('\n') + '\n'
}).join('\n')

writeFileSync(join(ROOT, 'THIRD_PARTY_NOTICES.md'), header + notices)

let n = 0
const missing = []
let out = `Third-party licenses for lzeditor
===================================

每个许可证的全文附上一次。对应的包清单见 THIRD_PARTY_NOTICES.md。
本文件由 scripts/generate-third-party-notices.mjs 生成，请勿手改。

`
for (const [lic, g] of sorted) {
  if (!g.text) { missing.push(lic); continue }
  n++
  out += `\n\n==== License text ${n}: ${lic} ====\n\n${g.text}\n`
}
writeFileSync(join(ROOT, 'THIRD_PARTY_LICENSES.txt'), out)

console.log(`包组数 ${sorted.length} | 许可证全文 ${n} 份`)
console.log('分组: ' + sorted.map(([k, v]) => `${k}=${v.pkgs.length}`).join(', '))
if (missing.length) console.log('没读到 LICENSE 文件: ' + missing.join(', '))

