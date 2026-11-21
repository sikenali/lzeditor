import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const output = read('src/additional/milkdown/textus/editor/markdown/markdown-output.ts')

// ── 空块序列化崩溃（containerPhrasing）：Milkdown 把空标题（键入 `# ` 所得）
//    或空段落（`Enter` 所得）转 mdast 时可能不设 children（undefined），
//    mdast-util-to-markdown runtime（index.js）的 containerPhrasing 会访问
//    node.children.length 崩溃（其 lib 源码有 `|| []` 兜底，但 runtime 没有）。
//    root 预处理必须在任何节点写出前给所有容器补 children=[]。 ──

assert.match(output, /const CONTAINER_TYPES = new Set\(\[/, 'markdown-output 定义容器类型集合')
assert.match(output, /"heading",/, '容器类型含 heading（空标题崩溃点）')
assert.match(output, /"paragraph",/, '容器类型含 paragraph（空段落）')
assert.match(output, /"blockquote",/, '容器类型含 blockquote')
assert.match(output, /"listItem",/, '容器类型含 listItem')
assert.match(output, /function ensureBlockChildren/, '定义 ensureBlockChildren 递归兜底')
assert.match(
  output,
  /n\.children === undefined\) n\.children = \[\]/,
  'ensureBlockChildren 给 undefined children 补空数组',
)
assert.match(output, /ensureBlockChildren\(node\);/, 'root 预处理调用 ensureBlockChildren（序列化前）')

console.log('empty-block-children ok (空块序列化补 children=[] 防 containerPhrasing 崩溃)')
