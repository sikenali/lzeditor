import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * 模式显示重构第 4 点：所有内容区统一「760px 内容列 + 27.33px 行高」。
 *
 * - settingsStore 默认 contentWidth '760'，旧存档 '1024'/'1280' 迁移为 '760'；
 * - WYSIWYG（milkdown.css）与 CM6（code-editor.css）内容列 --document-width: 760px；
 * - paper 主题正文 --doc-line-height: 27.33px（精确命中规格）。
 * 注：预览/阅读正文（read-mode.css .read-article-body/.preview-doc）仍走
 * --read-line-height 设置管线（默认 1.7 → 16px 下 ≈27.2px，与 27.33px 视觉不可分），
 * 避免把 --read-line-height 写成死变量并保持「排版模式不变」。
 */
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('settings 默认内容宽 760，旧存档迁移到 760', () => {
  const s = read('src/store/settingsStore.ts')
  assert.match(s, /contentWidth: '760'/, 'contentWidth 默认必须 760px（统一内容测度）')
  assert.match(s, /SETTINGS_VERSION = 4/, 'settings 版本升到 4（迁移触发）')
  assert.match(s, /raw\?\.contentWidth === '1280'[\s\S]{0,120}raw\.contentWidth = '760'/, '旧 1280 必须迁移到 760')
  assert.match(s, /raw\?\.contentWidth === '1024'[\s\S]{0,120}raw\.contentWidth = '760'/, '旧 1024 必须迁移到 760')
})

test('WYSIWYG/CM6 内容列 760px', () => {
  assert.match(read('src/additional/milkdown/milkdown.css'), /--document-width: 760px/, 'WYSIWYG 内容列 760px')
  assert.match(read('src/styles/code-editor.css'), /--document-width: 760px/, 'CM6 内容列 760px')
})

test('正文行高 27.33px（编辑内容，精确命中规格）', () => {
  assert.match(read('src/additional/milkdown/textus/theme/content-themes.css'), /data-content-theme="paper"[\s\S]{0,200}--doc-line-height: 27\.33px/, 'paper 正文行高 27.33px')
})
