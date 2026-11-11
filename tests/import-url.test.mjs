import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateImportUrl, looksLikeHtml, deriveTitleFromUrl, fetchMarkdownFromUrl } from '../src/utils/importUrl.ts'

test('validateImportUrl：拒绝空/非 http(s)', () => {
  assert.ok(validateImportUrl(''))
  assert.ok(validateImportUrl('ftp://x/y.md'))
  assert.ok(validateImportUrl('not-a-url'))
  assert.equal(validateImportUrl('https://a/b.md'), null)
  assert.equal(validateImportUrl('http://a/b.md'), null)
})

test('looksLikeHtml：HTML 页面判定', () => {
  // 完整 HTML 页面（doctype / html / head / body）→ true
  assert.ok(looksLikeHtml('<!doctype html><html><body>x</body></html>'))
  assert.ok(looksLikeHtml('<html><head><title>t</title></head><body>x</body></html>'))
  assert.ok(looksLikeHtml('<head><meta charset="utf-8"></head>'))
  // markdown 里的行内 HTML（徽章块等合法行内 HTML）→ false，不误判为页面
  assert.equal(looksLikeHtml('<div class="post">hi</div>'), false)
  assert.equal(looksLikeHtml('<p align="center"><img src="a.png"></p>\n# Title\nbody'), false)
  assert.equal(looksLikeHtml('# 标题\n\n正文 **加粗**'), false)
})

test('deriveTitleFromUrl：末段文件名去扩展名', () => {
  assert.equal(deriveTitleFromUrl('https://raw.githubusercontent.com/a/b/main/README.md'), 'README')
  assert.equal(deriveTitleFromUrl('https://gist.github.com/u/abc/raw/file.md'), 'file')
  assert.equal(deriveTitleFromUrl('https://example.com/a/b/c'), 'c')
})

// ── fetchMarkdownFromUrl：仅 .md 直链契约（stub global fetch）──
const mockFetch = (impl) => {
  const orig = globalThis.fetch
  globalThis.fetch = impl
  return () => { globalThis.fetch = orig }
}

test('fetchMarkdownFromUrl：markdown 直链 → {title, md}', async () => {
  const restore = mockFetch(async () => ({
    ok: true, status: 200,
    text: async () => '# Hello\n\nbody',
  }))
  try {
    const r = await fetchMarkdownFromUrl('https://raw.githubusercontent.com/a/b/main/README.md')
    assert.equal(r.title, 'README')
    assert.equal(r.md, '# Hello\n\nbody')
  } finally { restore() }
})

test('fetchMarkdownFromUrl：markdown 以 HTML 徽章块开头 → 不误判，正常导入', async () => {
  const restore = mockFetch(async () => ({
    ok: true, status: 200,
    text: async () => '<p align="center"><img src="badge.png"></p>\n# Title\n\nbody',
  }))
  try {
    const r = await fetchMarkdownFromUrl('https://raw.githubusercontent.com/a/b/main/README.md')
    assert.equal(r.title, 'README')
    assert.ok(r.md.startsWith('<p align="center">'))
  } finally { restore() }
})

test('fetchMarkdownFromUrl：HTML 返回 → 报「请提供 .md 直链」', async () => {
  const restore = mockFetch(async () => ({
    ok: true, status: 200,
    text: async () => '<!doctype html><html><body><article>blog</article></body></html>',
  }))
  try {
    await assert.rejects(
      () => fetchMarkdownFromUrl('https://example.com/post'),
      /请提供 \.md 直链/,
    )
  } finally { restore() }
})

test('fetchMarkdownFromUrl：HTTP 非 2xx → 报错', async () => {
  const restore = mockFetch(async () => ({ ok: false, status: 404, text: async () => '' }))
  try {
    await assert.rejects(
      () => fetchMarkdownFromUrl('https://example.com/missing.md'),
      /HTTP 404/,
    )
  } finally { restore() }
})
