import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 远程导入经产品决策判定为「无 UI 入口的死代码」，应整体移除。
// RemoteImportDialog 从未被任何组件引用，remoteImport.ts 只被该对话框引用。
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const dialog = join(root, 'src/components/panels/RemoteImportDialog.tsx')
const service = join(root, 'src/services/remoteImport.ts')

assert.equal(existsSync(dialog), false, 'RemoteImportDialog.tsx 必须删除（死代码无 UI 入口）')
assert.equal(existsSync(service), false, 'remoteImport.ts 必须删除（仅被死对话框引用）')

// 全 src 不得再有任何对这两个模块的引用
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(ts|tsx|js|mjs|css)$/.test(name)) out.push(p)
  }
  return out
}
for (const file of walk(join(root, 'src'))) {
  const src = readFileSync(file, 'utf8')
  assert.doesNotMatch(src, /RemoteImportDialog|remoteImport/, `${file} 不得引用已删除的远程导入模块`)
}

console.log('remote import dead code removed ok')
