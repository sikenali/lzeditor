import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// CM6 编辑设置接线：设置面板的开关必须真正传入编辑器并控制对应扩展。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const ext = read('src/components/editor/facade/cm6/cm6-extensions.ts')
const codeEditor = read('src/components/editor/CodeEditor.tsx')

// ── createCm6Settings 必须接受设置并按开关装配（不再是无参硬编码） ──
assert.match(ext, /createCm6Settings\(\s*\)/, 'createCm6Settings must be the settings controller')
assert.match(ext, /build\(\s*settings/i, 'createCm6Settings.build must accept settings')

// ── 每个开关都读设置并按值装配对应扩展 ──
assert.match(ext, /softWrap/, 'must read softWrap')
assert.match(ext, /currentLine/, 'must read currentLine')
assert.match(ext, /autoPair/, 'must read autoPair')
assert.match(ext, /tabSize/, 'must read tabSize')
assert.match(ext, /showLineNumbers/, 'must read showLineNumbers')
assert.match(ext, /enableSpellCheck|spellCheckLang/, 'must read spell check settings')

// ── 装配目标（真正控制行为） ──
assert.match(ext, /EditorView\.lineWrapping/, 'must wire softWrap → lineWrapping')
assert.match(ext, /highlightActiveLine/, 'must wire currentLine → highlightActiveLine')
assert.match(ext, /closeBrackets/, 'must wire autoPair → closeBrackets')
assert.match(ext, /indentUnit|EditorState\.tabSize/, 'must wire tabSize → indentUnit')
assert.match(ext, /lineNumbers/, 'must wire showLineNumbers → lineNumbers')
assert.match(ext, /contentAttributes/, 'must wire spellcheck → contentAttributes')

// ── 设置切换必须能在运行时生效（Compartment 重配置），而非仅挂载时读一次 ──
assert.match(ext, /Compartment/, 'must use Compartment for runtime reconfiguration')
assert.match(ext, /reconfigure/, 'must expose reconfigure for runtime toggles')

// ── CodeEditor 必须从 store 读设置并传给 buildCM6Extensions ──
assert.match(codeEditor, /buildCM6Extensions\(\s*\{[^}]*softWrap|buildCM6Extensions\(settings|createCm6Settings/, 'CodeEditor must pass settings into buildCM6Extensions')
assert.match(codeEditor, /useSettingsStore/, 'CodeEditor reads settings store')

console.log('cm6 settings wiring ok')
