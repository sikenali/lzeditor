import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

/**
 * Verifies the vendored Textus editor CSS (Task 8) is fully scoped under a
 * `.textus-editor-shell` container, replacing the brief's crude regex with a
 * real postcss walk that checks every rule's selectors.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const V = join(ROOT, 'src', 'additional', 'milkdown', 'textus')
const SHELL = '.textus-editor-shell'

const FILES = [
  ['theme/content-base.css', 'src/theme/content-base.css'],
  ['editor/milkdown-theme.css', 'src/editor/milkdown-theme.css'],
  ['theme/content-themes.css', 'src/theme/content-themes.css'],
  ['editor/completion/completion-panel.css', 'src/editor/completion/completion-panel.css'],
  ['editor/diagram-zoom.css', 'src/editor/diagram-zoom.css'],
  ['editor/hover/hover-card.css', 'src/editor/hover/hover-card.css'],
]

/** True if `rule` sits anywhere inside an `@keyframes` block. */
function isInsideKeyframes(rule) {
  let p = rule.parent
  while (p) {
    if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return true
    p = p.parent
  }
  return false
}

test('each vendored Textus CSS file is fully scoped under .textus-editor-shell', () => {
  for (const [rel] of FILES) {
    const file = join(V, rel)
    let css
    try {
      css = readFileSync(file, 'utf8')
    } catch {
      assert.fail(`${rel}: file missing — copy the 6 Textus CSS files before scoping`)
    }
    const root = postcss.parse(css, { from: rel })
    let ruleCount = 0
    let scopedCount = 0
    root.walkRules((rule) => {
      // Keyframe steps (from/to/%) are not element selectors — exempt.
      if (isInsideKeyframes(rule)) return
      ruleCount++
      for (const sel of rule.selectors) {
        assert.match(
          sel,
          /^\.textus-editor-shell(?![\w-])/,
          `${rel}: selector "${sel}" is not scoped under ${SHELL}`,
        )
        scopedCount++
      }
    })
    assert.ok(ruleCount > 0, `${rel}: expected at least one scoped rule`)
    assert.ok(scopedCount > 0, `${rel}: expected at least one scoped selector`)
  }
})

test('no :root remains — token definitions moved onto the shell', () => {
  for (const [rel] of FILES) {
    const file = join(V, rel)
    const css = readFileSync(file, 'utf8')
    const root = postcss.parse(css, { from: rel })
    root.walkRules((rule) => {
      if (isInsideKeyframes(rule)) return
      for (const sel of rule.selectors) {
        assert.ok(
          !sel.includes(':root'),
          `${rel}: selector "${sel}" still targets :root`,
        )
      }
    })
  }
})

test('the shell class selector actually appears in each scoped file', () => {
  for (const [rel] of FILES) {
    const file = join(V, rel)
    const css = readFileSync(file, 'utf8')
    const root = postcss.parse(css, { from: rel })
    let found = false
    root.walkRules((rule) => {
      if (isInsideKeyframes(rule)) return
      for (const sel of rule.selectors) {
        if (sel.startsWith(SHELL)) found = true
      }
    })
    assert.ok(found, `${rel}: no ${SHELL} selector found`)
  }
})

test('keyframe animation names stay global (not prefixed/renamed)', () => {
  for (const [rel] of FILES) {
    const file = join(V, rel)
    const css = readFileSync(file, 'utf8')
    const root = postcss.parse(css, { from: rel })
    root.walkAtRules('keyframes', (kf) => {
      // The animation name must not be prefixed with the shell class.
      assert.ok(
        !kf.params.startsWith(SHELL),
        `${rel}: @keyframes name "${kf.params}" was prefixed`,
      )
      // Step selectors inside keyframes must not be prefixed either.
      kf.walkRules((step) => {
        for (const sel of step.selectors) {
          assert.ok(
            !sel.startsWith(SHELL),
            `${rel}: keyframe step "${sel}" was prefixed`,
          )
        }
      })
    })
  }
})

// The floating layers the vendored editor appends (the / completion panel, the
// link hover card, the diagram-zoom viewer) render inside document.body, which
// is NOT a descendant of the .textus-editor-shell div. Scoping the CSS to the
// shell would orphan them, so each must host its layer under the shell instead.
const FLOATING_LAYER_HOSTS = [
  'editor/completion/completion-panel.ts',
  'editor/hover/hover-card.ts',
  'editor/diagram-zoom.ts',
]

test('floating layers are hosted under .textus-editor-shell, not document.body', () => {
  for (const rel of FLOATING_LAYER_HOSTS) {
    const src = readFileSync(join(V, rel), 'utf8')
    // The append target must resolve to the shell (with a document.body fallback
    // so it never throws), i.e. contain a querySelector for the shell class.
    assert.match(
      src,
      /querySelector\(["']\.textus-editor-shell["']\)/,
      `${rel}: floating layer must be appended under .textus-editor-shell`,
    )
    // No bare append-to-body for the floating layer may remain.
    assert.ok(
      !/document\.body\s*\.\s*append/.test(src),
      `${rel}: floating layer still appends to document.body (orphaned from the shell)`,
    )
  }
})
