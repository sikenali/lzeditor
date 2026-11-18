import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// --- Task 4: ACKS 门面 / 宿主边界断言（后续 Task 5/6/8 追加） ---
const acksThemes = read('src/styles/acks-themes.ts')
assert.match(acksThemes, /renderAcksArticle/, '门面必须导出 renderAcksArticle')
assert.match(acksThemes, /ms-doc/, 'Milestone 用 .ms-doc')
assert.match(acksThemes, /doc\.dataset\.milestone/, 'Milestone 必须挂 data-milestone')
assert.match(acksThemes, /data-theme-asset/, '必须解析 data-theme-asset 资源')
assert.match(acksThemes, /lz-acks-theme-css/, 'ACKS CSS 注入独立 style 节点')
assert.match(acksThemes, /import\.meta\.glob/, '签名 svg 用 import.meta.glob 载入')
assert.match(acksThemes, /sig\.svg = svg/, '必须回填 MD.SIGNATURES[k].svg（applyDecorations 依赖）')
assert.match(acksThemes, /THEME_ASSETS/, '必须定义 THEME_ASSETS（applyDecorations 依赖）')

// --- Task 5: typography-themes 改走 ACKS（删 13 款手写主题） ---
const typo = read('src/styles/typography-themes.ts')
assert.doesNotMatch(typo, /const classic: TypographyTheme/, '13 款手写主题已删除')
assert.match(typo, /getAcksTheme\(id\) \?\? getAcksTheme\(DEFAULT_TYPOGRAPHY_THEME\)/, '未知 id 回退 graphite')
assert.match(typo, /buildTypographyTheme/, 'getTypographyTheme 走 buildTypographyTheme')
assert.match(typo, /ACKS_THEME_IDS\.map/, 'TYPOGRAPHY_THEMES 由 43 款 ACKS id 生成')
assert.doesNotMatch(typo, /wechatGreen|techBlue|lanying|orangeHeart|minimalGray/, '旧主题名不再出现')

// --- Task 6: exportService 改走 ACKS token ---
const exp = read('src/services/exportService.ts')
assert.doesNotMatch(exp, /TYPOGRAPHY_THEME_VARS|DEFAULT_THEME_VARS/, '旧 13 款主题变量已删除')
assert.match(exp, /acksThemeToLzTokens/, '导出走 ACKS 结构化 token')
assert.doesNotMatch(exp, /'classic'/, '导出不再回退 classic')
assert.match(exp, /DEFAULT_TYPOGRAPHY_THEME/, '导出默认走常量')
