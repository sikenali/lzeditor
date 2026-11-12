#!/usr/bin/env node
/**
 * 检查 vendored Textus 编辑器内核的 import 闭包（供后续任务做每任务门禁）。
 *
 * 遍历 src/additional/milkdown/textus 下所有 .ts/.tsx 文件（下称 V），收集所有
 * 相对 import 与裸 import，保证：
 *   - 相对 import 用 path.resolve 解析后，必须落在 V 内（且解析到实际存在的
 *     文件），或命中 V/shim——shim 文件在 Task 3 前允许尚未落盘：仅警告
 *     不失败；STRICT_SHIMS 置 true 后改为硬失败。
 *   - 裸 import 必须是 package.json dependencies + devDependencies 的键，或是
 *     某个允许包名的子路径（如 @milkdown/kit/core）。
 * 任一硬失败以非 0 退出码结束，并逐条打印「文件 — import — 原因」与摘要。
 *
 * 用法：node scripts/check-textus-vendor.mjs
 *
 * 测试钩子：设 TEXTUS_VENDOR_ROOT 可把 V 指到别处（tests/ 用临时目录验证
 * 门禁行为），不设时用仓库内真实路径。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const V = process.env.TEXTUS_VENDOR_ROOT || join(ROOT, 'src', 'additional', 'milkdown', 'textus')
const SHIM = join(V, 'shim')
/** Task 3 起由控制器改为 true：shim 尚未落盘即硬失败。 */
const STRICT_SHIMS = true

// npm 允许表 = dependencies ∪ devDependencies 的键
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const ALLOWED = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
])

const problems = [] // { kind: 'FAIL'|'WARN', file, spec, reason }

function underDir(p, dir) {
  return p === dir || p.startsWith(dir + sep)
}

/** 把相对 import 解析到实际存在的文件（补扩展名 / index 后缀）；不存在返回 null。 */
function resolveExisting(base) {
  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}.jsx`,
    join(base, 'index.ts'), join(base, 'index.tsx'), join(base, 'index.js'),
  ]
  for (const c of candidates) {
    try { if (statSync(c).isFile()) return c } catch { /* 换下一个候选 */ }
  }
  return null
}

/** 递归收集 V 下所有 .ts/.tsx 文件；目录不存在返回空数组。 */
function walk(dir, out = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const name of entries) {
    const p = join(dir, name)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, out)
    else if (st.isFile() && (name.endsWith('.ts') || name.endsWith('.tsx'))) out.push(p)
  }
  return out
}

// ── import 提取：逐字符扫描，跳过字符串与注释，避免注释/字符串里的假 import ──

function isWord(src, i, word) {
  if (!src.startsWith(word, i)) return false
  const before = i > 0 ? src[i - 1] : ''
  const after = src[i + word.length] || ''
  return !/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after)
}

function skipSpace(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++
  return i
}

/** 跳过引号字符串；反引号模板里的 ${...} 插值体简单跳过（模板内出现 import 罕见）。 */
function skipQuoted(src, i) {
  const quote = src[i]
  i++
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\') { i += 2; continue }
    if (ch === quote) return i + 1
    if (quote === '`' && ch === '$' && src[i + 1] === '{') {
      let depth = 1
      i += 2
      while (i < src.length && depth > 0) {
        if (src[i] === '{') depth++
        else if (src[i] === '}') depth--
        i++
      }
      continue
    }
    i++
  }
  return i
}

function skipLine(src, i) {
  while (i < src.length && src[i] !== '\n') i++
  return i
}

function skipBlock(src, i) {
  i += 2
  while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
  return i + 2
}

/** 从 i（指向引号）读模块说明符；返回 { spec, end }，end 指向闭引号后一位。 */
function readModuleSpec(src, i) {
  const quote = src[i]
  let j = i + 1
  let spec = ''
  while (j < src.length && src[j] !== quote) {
    if (src[j] === '\\') j++
    spec += src[j]
    j++
  }
  return { spec, end: j + 1 }
}

/**
 * 在 [i, n) 内找 from 关键字后的字符串说明符；在括号深度 0 处遇到语句边界
 * （; 或换行）仍未找到 from 则返回 found:false，让调用方决定是 re-export 还是
 * 普通语句。括号内（多行 import/export 子句）的换行不算边界。
 */
function scanForFromSpec(src, i) {
  let j = i
  let depth = 0
  while (j < src.length) {
    const ch = src[j]
    if (depth === 0 && (ch === ';' || ch === '\n')) return { spec: null, end: j, found: false }
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1)
    if (isWord(src, j, 'from')) {
      const q = skipSpace(src, j + 4)
      if (src[q] === '"' || src[q] === "'") {
        const r = readModuleSpec(src, q)
        return { spec: r.spec, end: r.end, found: true }
      }
      return { spec: null, end: j + 4, found: true }
    }
    if (ch === '"' || ch === "'" || ch === '`') { j = skipQuoted(src, j); continue }
    if (ch === '/' && src[j + 1] === '/') { j = skipLine(src, j); continue }
    if (ch === '/' && src[j + 1] === '*') { j = skipBlock(src, j); continue }
    j++
  }
  return { spec: null, end: j, found: false }
}

function parseImport(src, i) {
  let j = skipSpace(src, i + 6)
  if (src[j] === '.') return { spec: null, end: i + 6 } // import.meta，非 import 语句
  if (src[j] === '(') { // 动态 import('mod')
    const p = skipSpace(src, j + 1)
    if (src[p] === '"' || src[p] === "'" || src[p] === '`') return readModuleSpec(src, p)
    return { spec: null, end: j + 1 }
  }
  if (src[j] === '"' || src[j] === "'") return readModuleSpec(src, j) // 副作用 import 'mod'
  return scanForFromSpec(src, j) // 静态 import ... from 'mod'
}

function parseExport(src, i) {
  const r = scanForFromSpec(src, i + 6) // export ... from 'mod'（含 export * / export {} from）
  if (!r.found) return { spec: null, end: i + 6 } // 非 re-export：仅跳 export，让主循环继续找内嵌 import
  return r
}

function parseRequire(src, i) {
  const j = skipSpace(src, i + 7)
  if (src[j] === '(') {
    const p = skipSpace(src, j + 1)
    if (src[p] === '"' || src[p] === "'") return readModuleSpec(src, p)
  }
  return { spec: null, end: i + 7 }
}

/** 提取 import/export/require 的模块说明符（相对或裸）。 */
function extractSpecs(source) {
  const specs = []
  let i = 0
  const n = source.length
  while (i < n) {
    const ch = source[i]
    if (ch === '"' || ch === "'" || ch === '`') { i = skipQuoted(source, i); continue }
    if (ch === '/' && source[i + 1] === '/') { i = skipLine(source, i); continue }
    if (ch === '/' && source[i + 1] === '*') { i = skipBlock(source, i); continue }
    const member = source[i - 1] === '.' // a.import(...)/obj.require(...) 是属性访问，非关键字
    if (!member && isWord(source, i, 'import')) {
      const r = parseImport(source, i)
      if (r.spec) specs.push(r.spec)
      i = r.end
      continue
    }
    if (!member && isWord(source, i, 'export')) {
      const r = parseExport(source, i)
      if (r.spec) specs.push(r.spec)
      i = r.end
      continue
    }
    if (!member && isWord(source, i, 'require')) {
      const r = parseRequire(source, i)
      if (r.spec) specs.push(r.spec)
      i = r.end
      continue
    }
    i++
  }
  return specs
}

/** 裸 import 是否在允许表内：精确键，或某个允许包名的子路径（如 @milkdown/kit/core）。 */
function isAllowedBare(spec) {
  for (const k of ALLOWED) {
    if (spec === k || spec.startsWith(k + '/')) return true
  }
  // 类型专用包：`import type { … } from "mdast"` 由已安装的 `@types/mdast`
  // 提供（TS 的 typeRoots 解析）。这类裸 import 只有类型、运行期被擦除，故
  // 只要对应 `@types/<spec>` 已安装即允许——避免把合法类型导入误判为失败。
  if (
    spec.indexOf('/') < 0 &&
    existsSync(join(ROOT, 'node_modules', '@types', spec))
  ) {
    return true
  }
  return false
}

function checkSpec(file, spec) {
  if (spec.startsWith('.')) {
    const resolved = resolve(dirname(file), spec)
    if (underDir(resolved, SHIM)) {
      if (!resolveExisting(resolved)) {
        if (STRICT_SHIMS) {
          problems.push({ kind: 'FAIL', file, spec, reason: '命中 V/shim 但文件尚未落盘（STRICT_SHIMS=true）' })
        } else {
          problems.push({ kind: 'WARN', file, spec, reason: '命中 V/shim 且文件尚未落盘（Task 3 前仅警告）' })
        }
      }
    } else if (underDir(resolved, V)) {
      if (!resolveExisting(resolved)) {
        problems.push({ kind: 'FAIL', file, spec, reason: 'V 内相对 import 未解析到存在文件' })
      }
    } else {
      problems.push({ kind: 'FAIL', file, spec, reason: '相对 import 逃逸出 V（既不在 V 内也不在 V/shim）' })
    }
  } else if (!isAllowedBare(spec)) {
    problems.push({ kind: 'FAIL', file, spec, reason: '裸 import 不在 npm 允许表（package.json dependencies + devDependencies）' })
  }
}

const files = walk(V)
let importCount = 0
for (const f of files) {
  const source = readFileSync(f, 'utf8')
  const specs = extractSpecs(source)
  importCount += specs.length
  for (const spec of specs) checkSpec(f, spec)
}

const fails = problems.filter((p) => p.kind === 'FAIL')
const warns = problems.filter((p) => p.kind === 'WARN')
for (const p of problems) {
  console.log(`${p.kind}: ${p.file} — ${p.spec} — ${p.reason}`)
}
console.log(`检查 ${files.length} 个文件 / ${importCount} 条 import：${fails.length} 个硬失败，${warns.length} 个警告`)

process.exit(fails.length ? 1 : 0)
