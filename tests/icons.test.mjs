import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { test } from 'node:test'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 只扫文本源码找 `ri-*` 类名；跳过二进制资源（字体/图片等）。否则把 woff2 当 utf8 读，
// 随机字节会解码成 `ri-c`/`ri-g` 之类的假命中，误报"图标名不存在"。
const SKIP_BINARY = /\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|ico|mp3|mp4|wasm)$/i
function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) out.push(...walk(p))
    else if (!SKIP_BINARY.test(p)) out.push(p)
  }
  return out
}

const srcFiles = [...walk('src'), 'index.html']
const remixPath = ['node_modules/remixicon/fonts/remixicon.css', 'node_modules/remixicon/remixicon.css'].find(existsSync)

test('RemixIcon 字体随包本地化，不再依赖远程 CDN', () => {
  assert.equal(!!remixPath, true, 'remixicon 必须作为依赖安装')
  const css = read('src/styles/globals.css')
  assert.match(css, /src:\s*url\('\.\.\/assets\/fonts\/remixicon\.woff2'\)/, '@font-face 必须指向仓库内的字体文件')
  assert.doesNotMatch(css, /https?:\/\/[^'"]*remixicon/, '不能从 CDN 拉图标字体：断网或 CDN 被墙时整块图标消失')
  assert.equal(existsSync('src/assets/fonts/remixicon.woff2'), true, 'woff2 必须提交进仓库')
  assert.doesNotMatch(read('index.html'), /preconnect[^>]*cdn\.jsdelivr\.net/, '字体本地化后 jsdelivr 的 preconnect 没用了')
})

test('Electron 用 file:// 打开 dist，资产路径必须是相对的', () => {
  assert.match(read('vite.config.ts'), /base:\s*'\.\/'/, "base 必须是 './'，绝对 /assets/* 在 file:// 下会全部 404")
})

if (remixPath) {
  const valid = new Set(
    [...readFileSync(remixPath, 'utf8').matchAll(/\.ri-[a-z0-9-]+:before/g)]
      .map(m => m[0].replace(/^\./, '').replace(/:before$/, '')),
  )

  test('源码引用的每个 RemixIcon 名都在字体里，否则渲染出来是空格', () => {
    const names = new Set()
    for (const f of srcFiles) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\bri-[a-z0-9-]+/g)) names.add(m[0])
    }
    names.delete('ri-spin-anim')
    const broken = [...names].filter(n => !valid.has(n)).sort()
    assert.deepEqual(broken, [], `这些图标名在 remixicon 3.5.0 里不存在，会渲染成空位：${broken.join(', ')}`)
  })
}
