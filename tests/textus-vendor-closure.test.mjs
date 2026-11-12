import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// ── 任务要求的门禁冒烟测试：脚本必须能运行且以 0 退出 ──
test('vendor 闭包 import 全部可解析（npm 依赖已在 package.json）', () => {
  assert.doesNotThrow(() => execFileSync('node', ['scripts/check-textus-vendor.mjs'], { stdio: 'pipe' }))
})

// ── 行为验证：用临时 V 树 + TEXTUS_VENDOR_ROOT 指过去，确认门禁真的拦截逃逸 ──
// （TEXTUS_VENDOR_ROOT 是脚本的测试钩子，不设时走仓库内真实路径，见脚本头注释。）
function runGate(vRoot) {
  try {
    const out = execFileSync('node', ['scripts/check-textus-vendor.mjs'], {
      stdio: 'pipe',
      env: { ...process.env, TEXTUS_VENDOR_ROOT: vRoot },
    })
    return { ok: true, output: String(out) }
  } catch (err) {
    return { ok: false, output: String(err.stdout || '') + String(err.stderr || '') }
  }
}

function withVTree(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'textus-vendor-'))
  try {
    for (const [rel, src] of Object.entries(files)) {
      const p = join(root, rel)
      mkdirSync(dirname(p), { recursive: true })
      writeFileSync(p, src)
    }
    fn(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('相对 import 命中 V 内已存在文件 → 通过', () => {
  withVTree({
    'a.ts': `import { b } from './b'\n`,
    'b.ts': `export const b = 1\n`,
  }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, true, r.output)
  })
})

test('相对 import 指向 V 内不存在的文件 → 硬失败', () => {
  withVTree({ 'a.ts': `import { x } from './missing'\n` }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, false, '应检测到 V 内不存在的相对 import 并失败')
  })
})

test('相对 import 逃逸出 V → 硬失败', () => {
  withVTree({ 'a.ts': `import { x } from '../../outside'\n` }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, false, '应检测到逃逸出 V 的相对 import 并失败')
  })
})

test('裸 import 命中 npm 允许表 → 通过', () => {
  withVTree({ 'a.ts': `import { kit } from '@milkdown/kit'\n` }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, true, r.output)
  })
})

test('裸 import 为允许包名的子路径（如 @milkdown/kit/core）→ 通过', () => {
  withVTree({
    'a.ts': [
      `import { core } from '@milkdown/kit/core'\n`,
      `import { state } from '@milkdown/kit/prose/state'\n`,
      `import { utils } from '@milkdown/kit/utils'\n`,
    ].join(''),
  }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, true, r.output)
    assert.match(r.output, /检查 1 个文件 \/ 3 条 import/, '应识别出 3 条子路径 import')
  })
})

test('裸 import 不在允许表 → 硬失败', () => {
  withVTree({ 'a.ts': `import x from 'definitely-not-a-dependency'\n` }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, false, '应检测到未声明的裸 import 并失败')
  })
})

test('相对 import 指向 V/shim 尚未落盘的文件 → 硬失败（STRICT_SHIMS=true）', () => {
  withVTree({ 'a.ts': `import { x } from './shim/not-yet'\n` }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, false, 'STRICT_SHIMS=true 下 shim 未落盘应硬失败')
    assert.match(r.output, /FAIL/, '应报告硬失败')
  })
})

test('类型专用裸 import（@types/<spec> 已在 package.json 声明）→ 通过', () => {
  withVTree({ 'a.ts': `import type { Root } from 'mdast'\n` }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, true, r.output)
  })
})

test('多行 import / re-export / export 内嵌动态 import 均被正确解析', () => {
  withVTree({
    'a.ts': [
      `import {\n  b,\n  c,\n} from './b'\n`,
      `export {\n  d,\n} from './d'\n`,
      `export const lazy = await import('./e')\n`,
    ].join(''),
    'b.ts': `export const b = 1\n`,
    'd.ts': `export const d = 1\n`,
    'e.ts': `export const e = 1\n`,
  }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, true, r.output)
    assert.match(r.output, /检查 4 个文件 \/ 3 条 import/, '应识别出 3 条 import')
  })
})

test('字符串/注释里的假 import 与 import.meta、成员访问不误报', () => {
  withVTree({
    'a.ts': [
      `import { b } from './b'\n`,
      `const fake = "import { z } from 'fake-string-dep'"\n`,
      `// import { y } from 'comment-fake-dep'\n`,
      `const url = import.meta.url\n`,
      `const req = obj.require('member-fake')\n`,
    ].join(''),
    'b.ts': `export const b = 1\n`,
  }, (root) => {
    const r = runGate(root)
    assert.equal(r.ok, true, r.output)
    assert.match(r.output, /检查 2 个文件 \/ 1 条 import/, '只应识别出真实的那条 import')
  })
})
