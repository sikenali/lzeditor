#!/usr/bin/env node
/**
 * Scope Textus's editor CSS under `.textus-editor-shell`.
 *
 * Textus's stylesheet targets the app root (`:root`) and global `.milkdown`
 * classes; lzeditor hosts the vendored editor inside a `.textus-editor-shell`
 * div so it can coexist with the app's own theme (B1). This script rewrites
 * every selector to be a descendant of that shell:
 *
 *   - `.milkdown`                     → `.textus-editor-shell .milkdown`
 *   - `:root { … }`                   → `.textus-editor-shell { … }`
 *   - `:root[data-theme="dark"] …`    → `.textus-editor-shell[data-theme="dark"] …`
 *
 * It deliberately does NOT touch:
 *   - rules inside `@keyframes` (the `from`/`to`/`%` steps are keyframe
 *     selectors, not element selectors; the animation name stays global),
 *   - `@font-face` / `@import` / `@charset` at-rules,
 *   - any declaration values (the `--doc-*` / `--t-*` tokens keep Textus's
 *     values; they simply move onto the shell via the `:root`→shell swap).
 *
 * `@media` / `@layer` / `@supports` at-rules themselves are kept as-is; only
 * their inner selectors get prefixed. Selectors already starting with
 * `.textus-editor-shell` are left alone (idempotent).
 *
 * Usage: node scripts/scope-textus-css.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const V = join(ROOT, 'src', 'additional', 'milkdown', 'textus')
const SHELL = '.textus-editor-shell'

/** [target path under V, source path under /tmp/opencode/textus] */
const FILES = [
  ['theme/content-base.css', 'src/theme/content-base.css'],
  ['editor/milkdown-theme.css', 'src/editor/milkdown-theme.css'],
  ['theme/content-themes.css', 'src/theme/content-themes.css'],
  ['editor/completion/completion-panel.css', 'src/editor/completion/completion-panel.css'],
  ['editor/diagram-zoom.css', 'src/editor/diagram-zoom.css'],
  ['editor/hover/hover-card.css', 'src/editor/hover/hover-card.css'],
]

/** True if `rule` sits anywhere inside an `@keyframes` (or vendor-prefixed) block. */
function isInsideKeyframes(rule) {
  let p = rule.parent
  while (p) {
    if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return true
    p = p.parent
  }
  return false
}

/** A leading `:root` (optionally with attribute/pseudo compounds) becomes the
 *  shell itself, so the token definitions and `data-*` switches move onto it. */
function replaceLeadingRoot(sel) {
  if (sel.startsWith(':root')) return SHELL + sel.slice(':root'.length)
  return null
}

/** Scope one selector to the shell, idempotently. */
function scopeSelector(sel) {
  if (/^\.textus-editor-shell(?![\w-])/.test(sel)) return sel // already scoped
  const rooted = replaceLeadingRoot(sel)
  if (rooted) return rooted
  return `${SHELL} ${sel}`
}

/** Rewrite every non-keyframe rule's selectors; returns the scoped CSS text. */
function scopeCss(css, file) {
  const root = postcss.parse(css, { from: file })
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return
    rule.selector = rule.selectors.map(scopeSelector).join(', ')
  })
  // Hard-fail if a `:root` survived (e.g. nested inside :is()/:not()) — that
  // would mean a rule still targets the document root, defeating the scope.
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return
    for (const sel of rule.selectors) {
      if (sel.includes(':root')) {
        throw new Error(`${file}: unsupported :root position in selector "${sel}"`)
      }
    }
  })
  return root.toString()
}

for (const [rel] of FILES) {
  const target = join(V, rel)
  const css = readFileSync(target, 'utf8')
  const out = scopeCss(css, rel)
  writeFileSync(target, out)
  console.log(`scoped ${rel}`)
}
console.log(`done: ${FILES.length} files scoped under ${SHELL}`)
