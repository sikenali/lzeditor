import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const buttons = read('src/components/panels/ImportButtons.tsx')

// CATEGORIES 只剩 docs/url/local；Git仓库/博客/GitBook 消失
assert.ok(!buttons.includes("label: 'Git 仓库'"))
assert.ok(!buttons.includes("label: '博客'"))
assert.ok(!buttons.includes("label: 'GitBook'"))
assert.match(buttons, /label: 'URL 在线导入'/)
assert.match(buttons, /label: '本地导入'/)

// props 改为 onImportUrl/onImportLocal
assert.match(buttons, /onImportUrl: \(url: string\) => Promise<void>/)
assert.match(buttons, /onImportLocal: \(\) => void/)
assert.ok(!buttons.includes('onImportGit'))

// url 分支渲染输入框 + 导入按钮
assert.match(buttons, /category === 'url'/)
assert.match(buttons, /placeholder=[^>]*\.md|粘贴.*\.md|直链/)
assert.ok(buttons.includes('onImportUrl('))

// local 分支渲染本地导入按钮
assert.match(buttons, /category === 'local'/)
assert.match(buttons, /从本地导入 Markdown/)

console.log('import buttons 2 tabs ok')
