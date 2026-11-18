import assert from 'node:assert/strict'
import {
  acksThemeToLzCss,
  acksThemeToLzTokens,
  buildTypographyTheme,
  acksThemeCardMeta,
  DEFAULT_TYPOGRAPHY_THEME,
  LZ_HOST_SELECTORS,
} from '../src/styles/acks-mapping.ts'

const t = {
  id: 'milestone-clean-light',
  name: '清隽阅读 · 浅色',
  bg: '#FBFAF8',
  text: '#2a2722',
  heading: '#23211d',
  accent: '#C2613A',
  accent2: '#C2613A',
  emphasis: '#C2613A',
  sectionHeading: '#23211d',
  titleText: '#23211d',
  titleBg: '#FBFAF8',
  thBg: '#f3efe5',
  thText: '#23211d',
  quoteBg: '#FBFAF8',
  quoteText: '#9b9483',
  quoteBorder: '#C2613A',
  codeBg: '#f0ebe0',
  codeText: '#9a4d27',
  codeBlockBg: '#f5f1e8',
  codeBlockText: '#3a372f',
  zebra: '#f6f2ea',
  bodySize: 18,
  lineHeight: 1.78,
  letterSpacing: 0.1,
  h1: 36.9,
  h2: 27,
  h3: 20,
  h4: 17,
  fontFamily: "'Lora',Georgia,serif",
  headingFamily: "'Source Serif 4','Lora',serif",
  milestoneKey: 'clean',
  milestoneVariant: 'light',
  themeVersion: 2,
  editorialProfile: 'milestone-clean',
  signature: 'ms-clean',
}

assert.equal(DEFAULT_TYPOGRAPHY_THEME, 'graphite')
assert.ok(LZ_HOST_SELECTORS.includes('.preview-doc'))
assert.ok(!LZ_HOST_SELECTORS.includes('.style-read-article'), 'token CSS 不能命中排版界面宿主')

const css = acksThemeToLzCss(t, '.preview-doc')
assert.match(css, /\.preview-doc\{color:#2a2722;font-family:'Lora'/)
assert.match(css, /\.preview-doc blockquote\{border-color:#C2613A/)
assert.doesNotMatch(css, /\.style-read-article/, '作用域不含 .style-read-article')

const tok = acksThemeToLzTokens(t)
assert.equal(tok.primary, '#C2613A')
assert.equal(tok.text, '#2a2722')
assert.equal(tok.heading, '#23211d')

const meta = acksThemeCardMeta(t)
assert.equal(meta.name, '清隽阅读 · 浅色')
assert.equal(meta.color, '#C2613A')
assert.equal(meta.bg, '#FBFAF8')
assert.equal(meta.text, '#2a2722')

const tt = buildTypographyTheme(t)
assert.equal(tt.id, 'milestone-clean-light')
assert.equal(tt.color, '#C2613A')
assert.match(tt.css, /\.read-article-body/)
