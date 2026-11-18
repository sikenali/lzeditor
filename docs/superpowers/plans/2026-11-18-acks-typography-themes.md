# ACKS 43 款排版主题移植 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 ACKS 渲染器在排版界面完整呈现 43 款排版主题（每页 10 个 + 左右箭头翻页、点选即生效），替换现有 13 款；预览/阅读/导出沿用 LZEditor 管线但共享 ACKS 配色 token；字体全量自托管（含中文）。

**Architecture:** 方案 C。把 ACKS 主题引擎（`theme-core`/`theme-revision`/`theme-catalog`/`theme-render` + `article.css`/`milestone-*`/`theme-revision`/`theme-catalog.css` + profiles/signatures）vendor 进 `src/vendor/acks/engine/`，经 `src/styles/acks-themes.ts` 门面暴露；排版界面用 `renderAcksArticle` 建 `.md-doc`/`.ms-doc[data-milestone]` DOM + 装饰 + token，宿主为新容器 `.style-read-article`（排除在 token CSS 外）。预览/阅读/导出的 `[data-typography-theme]` 主题由 `acks-mapping.ts` 的纯函数从 ACKS token 生成通用 CSS。43 款替换 13 款，默认主题 `graphite`，旧 id 回退默认。

**Tech Stack:** Electron + React 18 + TypeScript（`noUnusedLocals`/`noUnusedParameters`）+ Vite + 纯手写 CSS；测试 `node --import tsx --test tests/*.test.mjs`（边界用 `readFileSync` + 正则，纯函数用直接 import）。

**Spec:** `docs/superpowers/specs/2026-11-18-acks-typography-themes-design.md`

## Global Constraints

- 离线 Electron、盒子零系统字体、Google CDN 不可达 —— 所有 ACKS 字体必须自托管（`src/assets/fonts/`），不能运行时外链。
- 默认主题常量 `DEFAULT_TYPOGRAPHY_THEME = 'graphite'`；旧存档 id 不在 43 款 ACKS id 内一律回退 `graphite`（不逐 id 映射）。
- `src/vendor/acks/engine/*.js` 是 ACKS 原版源码，加 `// @ts-nocheck` 头，不满足 `noUnusedLocals` 也不改逻辑；只允许：注入 profiles/signatures 到 catalog、在 `theme-render.js` 末尾追加暴露 `globalThis.ACKS_RENDER`。
- 排版界面 ACKS 宿主 = 新容器 `.style-read-article`；`acksThemeToLzCss` 作用域只打 `.preview-doc`/`.read-article-body`/`.export-preview-body`/`.lz-editor-content`，**不打** `.style-read-article`。
- 43 款 ACKS id（`MD.THEMES` 键）：19 ACKS + 24 Milestone；Milestone 的 `id` = `milestone-<key>-<variant>`。

## Review Focus

1. **旧存档 id 迁移**：`settingsStore` 里存的是旧 id（`classic`/`wechat-green`/`night`/…），43 款里没有。预期：启动时这些 id 不崩、不空白，解析成 `graphite`。→ Task 5/7 测试。
2. **导出不随主题变**：换 43 款 id 后 `exportService` 若仍用旧 13 id 的 `TYPOGRAPHY_THEME_VARS` 会全部回退默认（导出/PDF 颜色错）。预期：导出用 `acksThemeToLzTokens` 按当前 ACKS id 取色。→ Task 6 测试。
3. **token CSS 泄漏到 ACKS 原版**：`acksThemeToLzCss` 若命中排版界面宿主会叠在 ACKS 装饰上破坏一致性。预期：作用域不含 `.style-read-article`。→ Task 2 测试。
4. **ACKS CSS 泄漏到非排版界面**：ACKS 的 `.md-doc`/`.ms-doc` 样式全局注入。预期：只存在于排版界面 `.style-read-article` 内，其余视图无 `.md-doc`/`.ms-doc`。→ Task 4/8 测试。
5. **字体缺失观感崩坏**：离线零系统字体，ACKS 主题引用 Lora/Playfair/Ma Shan Zheng 等。预期：全部自托管且 `@font-face` 齐全。→ Task 3 测试。
6. **大纲/章节跳转失效**：排版界面正文改 ACKS 渲染后，`parseMdOutline` 的标题 id 必须仍在 DOM 里，否则 `getOutlineJumper`/`activeTocId` 跳转失效（反目标）。预期：`mdToHtml` 输出的 heading id 经 `renderAcksArticle` 包裹后保留。→ Task 8 验证。

---

## 文件结构

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `src/vendor/acks/engine/theme-core.js` | 新建 | ACKS MD 引擎（原版） |
| `src/vendor/acks/engine/theme-revision.js` | 新建 | ACKS 版本化（原版） |
| `src/vendor/acks/engine/theme-catalog.generated.js` | 新建 | catalog + 注入 profiles/signatures（复刻 build.py） |
| `src/vendor/acks/engine/theme-render.js` | 新建 | 渲染/装饰（原版 + 末尾暴露 `ACKS_RENDER`） |
| `src/vendor/acks/engine/index.js` | 新建 | 按序 import，副作用建 `globalThis.MD`/`globalThis.ACKS_RENDER` |
| `src/styles/acks-mapping.ts` | 新建 | 纯函数：`acksThemeToLzCss`/`acksThemeToLzTokens`/`buildTypographyTheme`/`acksThemeCardMeta` + `DEFAULT_TYPOGRAPHY_THEME` |
| `src/styles/acks-themes.ts` | 新建 | 门面：`getAcksTheme`/`ACKS_THEME_IDS`/`renderAcksArticle`/`resolveThemeAssets` + `THEME_ASSETS` + 注入 ACKS CSS |
| `src/styles/typography-themes.ts` | 修改 | 删 13 款手写；`getTypographyTheme`/`applyTypographyTheme` 改走 ACKS |
| `src/services/exportService.ts` | 修改 | `TYPOGRAPHY_THEME_VARS`/`getCSSVars` 改走 `acksThemeToLzTokens` |
| `src/store/settingsStore.ts` | 修改 | 默认 `typographyTheme: 'graphite'` |
| `src/main.tsx` / `src/hooks/useTheme.ts` | 修改 | `|| 'classic'` → `DEFAULT_TYPOGRAPHY_THEME` |
| `src/components/sidebar/SidebarPreview.tsx` / `src/components/panels/ExportDialog.tsx` | 修改 | `|| 'classic'` → `DEFAULT_TYPOGRAPHY_THEME` |
| `src/components/panels/StyleMainPanel.tsx` | 修改 | ACKS 渲染进 `.style-read-article` + 分页（10/页 + 箭头） |
| `src/styles/panels.css` | 修改 | 分页箭头 + `.style-read-article` 样式 |
| `src/assets/fonts/acks/` | 新建 | 11 款字体 woff2 |
| `src/styles/fonts.css` | 修改 | 11 款 `@font-face` |
| `tests/acks-engine.test.mjs` | 新建 | 引擎组装 43 款 + `ACKS_RENDER` |
| `tests/acks-mapping.test.mjs` | 新建 | 纯映射函数断言 |
| `tests/acks-fonts.test.mjs` | 新建 | 字体自托管断言 |
| `tests/acks-theme-rewire.test.mjs` | 新建 | 边界：主题替换/导出/默认/排版界面/ACKS CSS 作用域 |

---

### Task 1: Vendor ACKS 主题引擎到 `src/vendor/acks/engine/`

**Files:**
- Create: `src/vendor/acks/engine/{theme-core.js,theme-revision.js,theme-catalog.generated.js,theme-render.js,index.js}`
- Test: `tests/acks-engine.test.mjs`

**Interfaces:**
- Produces: 副作用——`globalThis.MD`（`.THEMES` 43 键、`.CATALOG_VERSION`=3、`.SIGNATURES`、`.buildTheme`/`.decoSVG`/`.svgDataUri`/`.bgTexture`/`.mix`/`.shade`/`.tint`/`.luminance`/`.contrast`/`.compact4`/`.compactBorder`/`.hexToRgb`/`.rgbToHex`/`.readingColor`/`.stabilizeTheme`/`.mixTheme`/`.THEME_META`/`.RECIPES`/`.LEGACY_THEMES`），`globalThis.ACKS_RENDER` = `{ paintTokens, applyDesignAttrs, applyDecorations, applyLayout }`。

- [ ] **Step 1: 下载 ACKS 原始引擎文件**

```bash
mkdir -p src/vendor/acks/engine
cd src/vendor/acks/engine
BASE=https://raw.githubusercontent.com/shynloc/ACKS-Markdown-Editor/main/src
curl -sL $BASE/theme-core.js -o theme-core.js
curl -sL $BASE/theme-revision.js -o theme-revision.js
curl -sL $BASE/theme-catalog.js -o theme-catalog.raw.js
curl -sL $BASE/theme-render.js -o theme-render.js
curl -sL $BASE/milestone-profiles.json -o milestone-profiles.json
curl -sL $BASE/theme-signatures.json -o theme-signatures.json
# 给每个 .js 加 @ts-nocheck 头（首行插入）
for f in theme-core.js theme-revision.js theme-catalog.raw.js theme-render.js; do
  sed -i '1i// @ts-nocheck' "$f"
done
```

- [ ] **Step 2: 复刻 build.py 注入，生成 `theme-catalog.generated.js`**

```bash
node -e '
const fs = require("fs");
const profiles = fs.readFileSync("src/vendor/acks/engine/milestone-profiles.json","utf8");
const sig = fs.readFileSync("src/vendor/acks/engine/theme-signatures.json","utf8");
let c = fs.readFileSync("src/vendor/acks/engine/theme-catalog.raw.js","utf8");
c = c.replace(/const profiles\s*=\s*\[\];\s*\/\/ MILESTONE_PROFILES/, "const profiles="+profiles+";");
c = c.replace(/const signatures\s*=\s*\{\};\s*\/\/ THEME_SIGNATURES/, "const signatures="+sig+";");
fs.writeFileSync("src/vendor/acks/engine/theme-catalog.generated.js", c);
fs.unlinkSync("src/vendor/acks/engine/theme-catalog.raw.js");
'
```

- [ ] **Step 3: 在 `theme-render.js` 末尾暴露 `globalThis.ACKS_RENDER`**

```js
// 追加到 src/vendor/acks/engine/theme-render.js 末尾（函数为顶层声明，ESM 里不外泄）
globalThis.ACKS_RENDER = { paintTokens, applyDesignAttrs, applyDecorations, applyLayout };
```

- [ ] **Step 4: 写 `src/vendor/acks/engine/index.js`（按序副作用 import）**

```js
// @ts-nocheck
import './theme-core.js'
import './theme-revision.js'
import './theme-catalog.generated.js'
import './theme-render.js'
```

- [ ] **Step 5: 写 `tests/acks-engine.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL(`../src/vendor/acks/engine/${p}`, import.meta.url), 'utf8')
// package.json 无 "type":"module"，node 默认把 .js 当 CJS；测试用 read+eval 按序加载（等价 ACKS build 产物）
eval(read('theme-core.js'))
eval(read('theme-revision.js'))
eval(read('theme-catalog.generated.js'))
eval(read('theme-render.js'))
const MD = globalThis.MD
const RENDER = globalThis.ACKS_RENDER
assert.equal(MD.CATALOG_VERSION, 3, 'catalog version 应为 3')
assert.equal(Object.keys(MD.THEMES).length, 43, '必须正好 43 款主题')
const ms = Object.values(MD.THEMES).filter(t => t.milestoneKey)
assert.equal(ms.length, 24, 'Milestone 应为 24 款')
assert.equal(Object.keys(MD.THEMES).filter(id => !MD.THEMES[id].milestoneKey).length, 19, 'ACKS 应为 19 款')
for (const id of ['graphite','gold','milestone-clean-light','milestone-cnvertical-dark']) {
  assert.ok(MD.THEMES[id], `缺主题 ${id}`)
}
assert.equal(typeof MD.decoSVG, 'function', 'decoSVG 可用')
for (const fn of ['paintTokens','applyDesignAttrs','applyDecorations','applyLayout']) {
  assert.equal(typeof RENDER[fn], 'function', `ACKS_RENDER.${fn} 缺失`)
}
```

- [ ] **Step 6: 跑测试，确认通过**

Run: `node --import tsx --test tests/acks-engine.test.mjs`
Expected: 通过（43/24/19 计数、graphite/gold/ms 主题存在、4 渲染函数存在）。

- [ ] **Step 7: Commit**

```bash
git add src/vendor/acks/engine tests/acks-engine.test.mjs
git commit -m "feat(acks): vendor ACKS 主题引擎（43 款，CATALOG v3）"
```

---

### Task 2: 纯映射函数 `src/styles/acks-mapping.ts`

**Files:**
- Create: `src/styles/acks-mapping.ts`
- Test: `tests/acks-mapping.test.mjs`

**Interfaces:**
- Consumes: `AcksTheme` 形状（`src/vendor/acks/engine` 主题对象的字段子集：`id`、`name`、`bg`、`text`、`heading`、`accent`、`accent2`、`emphasis`、`sectionHeading`、`titleText`、`titleBg`、`thBg`、`thText`、`quoteBg`、`quoteText`、`quoteBorder`、`codeBg`、`codeText`、`codeBlockBg`、`codeBlockText`、`zebra`、`bodySize`、`lineHeight`、`letterSpacing`、`h1`、`h2`、`h3`、`h4`、`fontFamily`、`headingFamily`、`milestoneKey`、`milestoneVariant`、`themeVersion`、`editorialProfile`、`signature`）。
- Produces:
  - `DEFAULT_TYPOGRAPHY_THEME: string`（= `'graphite'`）
  - `LZ_HOST_SELECTORS: string[]`（= `['.preview-doc','.read-article-body','.export-preview-body','.lz-editor-content']`）
  - `acksThemeToLzCss(theme: AcksTheme, hostSelector: string): string`
  - `acksThemeToLzTokens(theme: AcksTheme): ExportThemeTokens`（`{ overlay, primary, text, muted, heading, code, border, amber }`，全部 `string`）
  - `buildTypographyTheme(theme: AcksTheme): TypographyTheme`（`{ id, name, color, tag, css }`）
  - `acksThemeCardMeta(theme: AcksTheme): { name: string; color: string; bg: string; text: string }`（`color`=accent 用于标题/代码/选中态，`bg` 用于卡片缩略图底，`text` 用于正文样例色）

- [ ] **Step 1: 写 `acks-mapping.ts`（纯函数，不 import 引擎/PNG）**

```ts
export const DEFAULT_TYPOGRAPHY_THEME = 'graphite'
export const LZ_HOST_SELECTORS = ['.preview-doc','.read-article-body','.export-preview-body','.lz-editor-content']

export interface AcksTheme { id: string; name: string; bg: string; text: string; heading: string; accent: string; accent2: string; emphasis: string; sectionHeading: string; titleText: string; titleBg: string; thBg: string; thText: string; quoteBg: string; quoteText: string; quoteBorder: string; codeBg: string; codeText: string; codeBlockBg: string; codeBlockText: string; zebra: string; bodySize: number; lineHeight: number; letterSpacing: number; h1: number; h2: number; h3: number; h4: number; fontFamily: string; headingFamily: string; milestoneKey: string | null; milestoneVariant?: string; themeVersion?: number; editorialProfile?: string; signature?: string | null }
export interface ExportThemeTokens { overlay: string; primary: string; text: string; muted: string; heading: string; code: string; border: string; amber: string }
export interface TypographyTheme { id: string; name: string; color: string; tag: string; css: string }

// 由 ACKS token 派生结构化导出变量（对应原 exportService 的 TYPOGRAPHY_THEME_VARS 形状）
export function acksThemeToLzTokens(t: AcksTheme): ExportThemeTokens {
  const mix = (c1: string, c2: string, k: number) => { /* 线性混色，hex→hex */ }
  return {
    primary: t.accent, text: t.text, heading: t.heading, code: t.codeText,
    border: mix(t.bg, t.text, 0.19), muted: t.quoteText,
    overlay: mix(t.bg, t.accent, 0.12), amber: t.accent,
  }
}

// 由 ACKS token 生成 LZ 宿主通用 CSS（作用域 = hostSelector，仅颜色/字号/字体）
export function acksThemeToLzCss(t: AcksTheme, hostSelector: string): string {
  return [
    `${hostSelector}{color:${t.text};font-family:${t.fontFamily};line-height:${t.lineHeight};letter-spacing:${t.letterSpacing}px}`,
    `${hostSelector} h1{color:${t.heading};font-size:${t.h1}px;font-family:${t.headingFamily}}`,
    `${hostSelector} h2{color:${t.sectionHeading};font-size:${t.h2}px;font-family:${t.headingFamily}}`,
    `${hostSelector} h3{color:${t.heading};font-size:${t.h3}px}`,
    `${hostSelector} h4{color:${t.heading};font-size:${t.h4}px}`,
    `${hostSelector} blockquote{border-color:${t.quoteBorder};color:${t.quoteText};background:${t.quoteBg}}`,
    `${hostSelector} code{background:${t.codeBg};color:${t.codeText}}`,
    `${hostSelector} pre{background:${t.codeBlockBg};color:${t.codeBlockText}}`,
    `${hostSelector} th{background:${t.thBg};color:${t.thText}}`,
    `${hostSelector} table tbody tr:nth-child(even){background:${t.zebra}}`,
  ].join('\n')
}

export function buildTypographyTheme(t: AcksTheme): TypographyTheme {
  return { id: t.id, name: t.name, color: t.accent, tag: '', css: LZ_HOST_SELECTORS.map(s => acksThemeToLzCss(t, s)).join('\n') }
}

export function acksThemeCardMeta(t: AcksTheme): { name: string; color: string; bg: string; text: string } {
  return { name: t.name, color: t.accent, bg: t.bg, text: t.text }
}
```

- [ ] **Step 2: 写 `tests/acks-mapping.test.mjs`**

```js
import assert from 'node:assert/strict'
import { acksThemeToLzCss, acksThemeToLzTokens, buildTypographyTheme, acksThemeCardMeta, DEFAULT_TYPOGRAPHY_THEME, LZ_HOST_SELECTORS } from '../src/styles/acks-mapping.ts'
const t = { id:'milestone-clean-light', name:'清隽阅读 · 浅色', bg:'#FBFAF8', text:'#2a2722', heading:'#23211d', accent:'#C2613A', accent2:'#C2613A', emphasis:'#C2613A', sectionHeading:'#23211d', titleText:'#23211d', titleBg:'#FBFAF8', thBg:'#f3efe5', thText:'#23211d', quoteBg:'#FBFAF8', quoteText:'#9b9483', quoteBorder:'#C2613A', codeBg:'#f0ebe0', codeText:'#9a4d27', codeBlockBg:'#f5f1e8', codeBlockText:'#3a372f', zebra:'#f6f2ea', bodySize:18, lineHeight:1.78, letterSpacing:0.1, h1:36.9, h2:27, h3:20, h4:17, fontFamily:"'Lora',Georgia,serif", headingFamily:"'Source Serif 4','Lora',serif", milestoneKey:'clean', milestoneVariant:'light', themeVersion:2, editorialProfile:'milestone-clean', signature:'ms-clean' }
assert.equal(DEFAULT_TYPOGRAPHY_THEME, 'graphite')
assert.ok(LZ_HOST_SELECTORS.includes('.preview-doc'))
assert.ok(!LZ_HOST_SELECTORS.includes('.style-read-article'), 'token CSS 不能命中排版界面宿主')
const css = acksThemeToLzCss(t, '.preview-doc')
assert.match(css, /\.preview-doc\{color:#2a2722;font-family:'Lora'/)
assert.match(css, /\.preview-doc blockquote\{border-color:#C2613A/)
assert.doesNotMatch(css, /\.style-read-article/, '作用域不含 .style-read-article')
const tok = acksThemeToLzTokens(t)
assert.equal(tok.primary, '#C2613A'); assert.equal(tok.text, '#2a2722'); assert.equal(tok.heading, '#23211d')
const meta = acksThemeCardMeta(t)
assert.equal(meta.name, '清隽阅读 · 浅色'); assert.equal(meta.color, '#C2613A'); assert.equal(meta.bg, '#FBFAF8'); assert.equal(meta.text, '#2a2722')
const tt = buildTypographyTheme(t)
assert.equal(tt.id, 'milestone-clean-light'); assert.equal(tt.color, '#C2613A'); assert.match(tt.css, /\.read-article-body/)
```

- [ ] **Step 3: 跑测试**

Run: `node --import tsx --test tests/acks-mapping.test.mjs`
Expected: 通过（默认 graphite、token CSS 作用域正确、导出 token 派生正确）。

- [ ] **Step 4: Commit**

```bash
git add src/styles/acks-mapping.ts tests/acks-mapping.test.mjs
git commit -m "feat(acks): ACKS token→LZ CSS/导出 token 纯映射 + 默认主题常量"
```

---

### Task 3: 字体全量自托管（含中文）

**Files:**
- Create: `src/assets/fonts/acks/*.woff2`
- Modify: `src/styles/fonts.css`
- Test: `tests/acks-fonts.test.mjs`

**Interfaces:**
- Produces: 11 款 `@font-face`（Lora、Playfair Display、EB Garamond、Cormorant Garamond、Space Grotesk、DM Sans、Archivo、Anton、Source Serif 4、Noto Serif SC、Ma Shan Zheng）。

- [ ] **Step 1: 下载 11 款字体到 `src/assets/fonts/acks/`**

用 Google Fonts CSS2 API 取 woff2（西文取 latin 子集，中文取全量），文件命名 `<family>[-<subset>].woff2`。参考现有 `fonts.css` 的 `@font-face` 写法（`font-display:swap`、CJK 用 `unicode-range` 或 variable 单文件）。

```bash
# 示例：Lora（多 weight 用 variable 或按 weight 分文件）；Noto Serif SC 用 variable 单文件 wght 100-900；Ma Shan Zheng 单 weight
# 具体 URL 由实现时从 fonts.googleapis.com/css2 接口解析，下载后 woff2 提交进仓库
```

- [ ] **Step 2: 在 `src/styles/fonts.css` 追加 11 款 `@font-face`**

```css
/* ACKS 主题展示字体（全量自托管，含中文） */
@font-face { font-family:'Lora'; font-style:normal; font-weight:400 700; font-display:swap; src:url('../assets/fonts/acks/lora.woff2') format('woff2'); }
/* …其余 10 款同理；Noto Serif SC 用 font-weight:100 900；Ma Shan Zheng 用 400 */
```

- [ ] **Step 3: 写 `tests/acks-fonts.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
const css = readFileSync(new URL('../src/styles/fonts.css', import.meta.url), 'utf8')
const fams = ['Lora','Playfair Display','EB Garamond','Cormorant Garamond','Space Grotesk','DM Sans','Archivo','Anton','Source Serif 4','Noto Serif SC','Ma Shan Zheng']
for (const f of fams) assert.match(css, new RegExp(`@font-face[^}]*font-family:'${f.replace(/ /g,'\\s')}'`), `${f} 必须有 @font-face`)
assert.match(css, /font-family:'Ma Shan Zheng'[^}]*font-weight:400/, 'Ma Shan Zheng 单 weight')
assert.match(css, /font-family:'Noto Serif SC'[^}]*font-weight:100 900/, 'Noto Serif SC variable')
```

- [ ] **Step 4: 跑测试**

Run: `node --import tsx --test tests/acks-fonts.test.mjs`
Expected: 通过（11 款 @font-face 齐全）。

- [ ] **Step 5: Commit**

```bash
git add src/assets/fonts/acks src/styles/fonts.css tests/acks-fonts.test.mjs
git commit -m "feat(fonts): 自托管 ACKS 主题展示字体（含 Noto Serif SC / Ma Shan Zheng）"
```

---

### Task 4: 门面 `src/styles/acks-themes.ts`

**Files:**
- Create: `src/styles/acks-themes.ts`
- Test: `tests/acks-theme-rewire.test.mjs`（本任务先加对应断言）

**Interfaces:**
- Consumes: Task 1 引擎（`globalThis.MD`/`globalThis.ACKS_RENDER`）、Task 3 字体（经 CSS）。
- Produces:
  - `getAcksTheme(id: string): AcksTheme | undefined`
  - `ACKS_THEME_IDS: string[]`
  - `renderAcksArticle(host: HTMLElement, mdHtml: string, themeId: string): void`
  - `resolveThemeAssets(root: HTMLElement): void`
  - `injectAcksCss(): void`（注入 `article.css`/`milestone-base.css`/`milestone-generated.css`/`theme-revision.css`/`theme-catalog.css` 到 `<style id="lz-acks-theme-css">`）

- [ ] **Step 1: 下载 ACKS 主题 CSS 到 `src/vendor/acks/engine/`**

```bash
cd src/vendor/acks/engine
BASE=https://raw.githubusercontent.com/shynloc/ACKS-Markdown-Editor/main/src
curl -sL $BASE/article.css -o article.css
curl -sL $BASE/milestone-base.css -o milestone-base.css
curl -sL $BASE/milestone-generated.css -o milestone-generated.css
curl -sL $BASE/theme-revision.css -o theme-revision.css
curl -sL $BASE/theme-catalog.css -o theme-catalog.css
```

- [ ] **Step 2: 下载 30 个签名 SVG + 3 张纹理 PNG 到 `src/vendor/acks/engine/`**

```bash
# 签名 SVG（theme-render.js 的 applyDecorations 读 MD.SIGNATURES[k].svg 原始 SVG 文本并 replaceAll 换色）
mkdir -p src/vendor/acks/engine/theme-signatures
cd src/vendor/acks/engine/theme-signatures
BASE=https://raw.githubusercontent.com/shynloc/ACKS-Markdown-Editor/main/src/theme-signatures
for f in blue clean-green dark dopamine dreamglow gold graphite guochao maximalism \
         ms-academic ms-aireport ms-blue-purple ms-business ms-clean ms-cnclassic ms-cnvertical \
         ms-darkcode ms-euro ms-magazine ms-poster ms-social ms-technical ms-wechat \
         neo-brutalism neu-soft olive-notes receipt red-white song-ink zen; do
  curl -sL "$BASE/$f.svg" -o "$f.svg"
done
cd ../assets
BASE=https://raw.githubusercontent.com/shynloc/ACKS-Markdown-Editor/main/src/theme-assets
curl -sL $BASE/glass-ribbon.png -o glass-ribbon.png
curl -sL $BASE/ink-gesture.png -o ink-gesture.png
curl -sL $BASE/paper-edge.png -o paper-edge.png
```

（注：`theme-signatures.json` 有 32 条：30 条 `type:"svg"` 对应上面 30 个 svg 文件；2 条 `type:"image"`（`y3k`→glass-ribbon、`collage`→paper-edge）走 `data-theme-asset` 由 `resolveThemeAssets` 解析。`applyDecorations` 里 `signature.svg` 是原始 SVG 文本，必须 hydrate，不能是 data URI。）

- [ ] **Step 3: 写 `src/styles/acks-themes.ts`（门面）**

```ts
// @ts-nocheck 不适用；本项目类型
// @ts-ignore —— vendor JS 无声明，side-effect import；若 tsc 报“缺声明”，补 src/vendor/acks/engine/index.d.ts（declare module '*/acks/engine/index.js'）
import '../vendor/acks/engine/index.js'
import glassRibbon from '../vendor/acks/engine/assets/glass-ribbon.png'
import inkGesture from '../vendor/acks/engine/assets/ink-gesture.png'
import paperEdge from '../vendor/acks/engine/assets/paper-edge.png'
import articleCss from '../vendor/acks/engine/article.css?raw'
import milestoneBaseCss from '../vendor/acks/engine/milestone-base.css?raw'
import milestoneGeneratedCss from '../vendor/acks/engine/milestone-generated.css?raw'
import themeRevisionCss from '../vendor/acks/engine/theme-revision.css?raw'
import themeCatalogCss from '../vendor/acks/engine/theme-catalog.css?raw'
import { type AcksTheme, DEFAULT_TYPOGRAPHY_THEME } from './acks-mapping'

const MD: any = (globalThis as any).MD
const RENDER: any = (globalThis as any).ACKS_RENDER
const THEME_ASSETS: Record<string,string> = { 'glass-ribbon': glassRibbon, 'ink-gesture': inkGesture, 'paper-edge': paperEdge }
// ACKS 的 applyDecorations 用裸全局 THEME_ASSETS，需在建 DOM 前挂到全局
;(globalThis as any).THEME_ASSETS = THEME_ASSETS

// hydrate signature.svg —— applyDecorations 读 MD.SIGNATURES[k].svg（原始 SVG 文本，replaceAll 换色）。
// 30 个 type:"svg" 签名用 import.meta.glob(?raw) 载入，按 file 名回填到 MD.SIGNATURES。
const signatureSvgs: Record<string,string> = import.meta.glob(
  '../vendor/acks/engine/theme-signatures/*.svg',
  { query: '?raw', import: 'default', eager: true }
) as Record<string,string>
for (const [p, svg] of Object.entries(signatureSvgs)) {
  const fname = p.split('/').pop()!
  for (const sig of Object.values(MD?.SIGNATURES ?? {})) {
    if (sig?.type === 'svg' && sig.file === fname && !sig.svg) sig.svg = svg
  }
}

export function getAcksTheme(id: string): AcksTheme | undefined { return MD?.THEMES?.[id] }
export const ACKS_THEME_IDS: string[] = MD ? Object.keys(MD.THEMES) : []

export function resolveThemeAssets(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>('img[data-theme-asset]').forEach(img => {
    const key = img.getAttribute('data-theme-asset')
    if (key && THEME_ASSETS[key]) img.src = THEME_ASSETS[key]
  })
}

export function injectAcksCss(): void {
  let el = document.getElementById('lz-acks-theme-css') as HTMLStyleElement | null
  if (!el) { el = document.createElement('style'); el.id = 'lz-acks-theme-css'; document.head.appendChild(el) }
  el.textContent = [articleCss, milestoneBaseCss, milestoneGeneratedCss, themeRevisionCss, themeCatalogCss].join('\n')
}

export function renderAcksArticle(host: HTMLElement, mdHtml: string, themeId: string): void {
  const t = getAcksTheme(themeId) ?? getAcksTheme(DEFAULT_TYPOGRAPHY_THEME)
  if (!t) return
  const doc = document.createElement('section')
  doc.className = t.milestoneKey ? 'ms-doc' : 'md-doc'
  if (t.milestoneKey) doc.dataset.milestone = `${t.milestoneKey}-${t.milestoneVariant || 'light'}`
  doc.dataset.revision = String(t.themeVersion || 1)
  doc.dataset.profile = t.editorialProfile || 'legacy'
  doc.innerHTML = mdHtml
  doc.querySelectorAll('p').forEach(n => n.classList.add('md-p'))
  doc.querySelectorAll('blockquote').forEach(n => n.classList.add('md-bq'))
  doc.querySelectorAll('table').forEach(n => n.classList.add('md-table'))
  doc.querySelectorAll('hr').forEach(n => n.classList.add('md-hr'))
  doc.querySelectorAll('img').forEach(n => n.classList.add('md-img'))
  doc.querySelectorAll('code').forEach(n => n.classList.add('md-ci'))
  doc.querySelectorAll('pre').forEach(n => n.classList.add('md-pre'))
  RENDER.applyDesignAttrs(doc, t)
  RENDER.applyDecorations(doc, t)
  RENDER.applyLayout(doc, t)
  resolveThemeAssets(doc)
  RENDER.paintTokens(doc, t)
  host.replaceChildren(doc)
  injectAcksCss()
}
```

- [ ] **Step 4: 在 `tests/acks-theme-rewire.test.mjs` 加 ACKS CSS/宿主边界断言**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const acksThemes = read('src/styles/acks-themes.ts')
assert.match(acksThemes, /renderAcksArticle/, '门面必须导出 renderAcksArticle')
assert.match(acksThemes, /\.ms-doc/, 'Milestone 用 .ms-doc')
assert.match(acksThemes, /md\.dataset\.milestone/, 'Milestone 必须挂 data-milestone')
assert.match(acksThemes, /data-theme-asset/, '必须解析 data-theme-asset 资源')
assert.match(acksThemes, /lz-acks-theme-css/, 'ACKS CSS 注入独立 style 节点')
assert.match(acksThemes, /import\.meta\.glob/, '签名 svg 用 import.meta.glob 载入')
assert.match(acksThemes, /sig\.svg = svg/, '必须回填 MD.SIGNATURES[k].svg（applyDecorations 依赖）')
assert.match(acksThemes, /THEME_ASSETS/, '必须定义 THEME_ASSETS（applyDecorations 依赖）')
```

- [ ] **Step 5: 跑测试**

Run: `node --import tsx --test tests/acks-theme-rewire.test.mjs`
Expected: 通过。

- [ ] **Step 6: Commit**

```bash
git add src/vendor/acks/engine tests/acks-theme-rewire.test.mjs src/styles/acks-themes.ts
git commit -m "feat(acks): 门面 getAcksTheme/renderAcksArticle + 注入 ACKS CSS 与纹理资源"
```

---

### Task 5: `typography-themes.ts` 改走 ACKS（删 13 款手写）

**Files:**
- Modify: `src/styles/typography-themes.ts`
- Test: `tests/acks-theme-rewire.test.mjs`

**Interfaces:**
- Consumes: Task 2 `buildTypographyTheme`/`DEFAULT_TYPOGRAPHY_THEME`、Task 4 `getAcksTheme`/`ACKS_THEME_IDS`。
- Produces: `getTypographyTheme(id): TypographyTheme | undefined`（未知 id 回退 graphite）、`applyTypographyTheme(id): void`、`TYPOGRAPHY_THEMES: TypographyTheme[]`、`TypographyTheme`（从 acks-mapping 再导出，保持既有消费方签名）。

- [ ] **Step 1: 删掉 13 款手写主题（`classic`…`minimalGray` 的定义与 `TYPOGRAPHY_THEMES` 旧数组）**

保留 `getTypographyTheme`、`applyTypographyTheme`；删除 `quoteMark` 辅助与 13 个 `const xxx: TypographyTheme` 对象及旧 `TYPOGRAPHY_THEMES` 数组。`TypographyTheme` 接口改从 `acks-mapping` 再导出（`export type { TypographyTheme } from './acks-mapping'`），避免与 acks-mapping 重复定义造成循环引用。

- [ ] **Step 2: 重写 `getTypographyTheme`/`applyTypographyTheme` + `TYPOGRAPHY_THEMES`**

```ts
import { getAcksTheme, ACKS_THEME_IDS } from './acks-themes'
import { buildTypographyTheme, DEFAULT_TYPOGRAPHY_THEME, type TypographyTheme } from './acks-mapping'
export type { TypographyTheme } from './acks-mapping'

export const TYPOGRAPHY_THEMES: TypographyTheme[] =
  ACKS_THEME_IDS.map(id => buildTypographyTheme(getAcksTheme(id)!))

export function getTypographyTheme(id: string): TypographyTheme | undefined {
  const t = getAcksTheme(id) ?? getAcksTheme(DEFAULT_TYPOGRAPHY_THEME)
  return t ? buildTypographyTheme(t) : undefined
}

export function applyTypographyTheme(themeId: string): void {
  const theme = getTypographyTheme(themeId)
  const root = document.documentElement
  root.setAttribute('data-typography-theme', themeId)
  let styleEl = document.getElementById('lz-typography-theme-css') as HTMLStyleElement | null
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'lz-typography-theme-css'; document.head.appendChild(styleEl) }
  styleEl.textContent = theme?.css ?? ''
}
```

- [ ] **Step 3: 加边界断言（`tests/acks-theme-rewire.test.mjs`）**

```js
const typo = read('src/styles/typography-themes.ts')
assert.doesNotMatch(typo, /const classic: TypographyTheme/, '13 款手写主题已删除')
assert.match(typo, /getAcksTheme\(id\) \?\? getAcksTheme\(DEFAULT_TYPOGRAPHY_THEME\)/, '未知 id 回退 graphite')
assert.match(typo, /buildTypographyTheme/, 'getTypographyTheme 走 buildTypographyTheme')
assert.match(typo, /ACKS_THEME_IDS\.map/, 'TYPOGRAPHY_THEMES 由 43 款 ACKS id 生成')
assert.doesNotMatch(typo, /wechatGreen|techBlue|lanying|orangeHeart|minimalGray/, '旧主题名不再出现')
```

- [ ] **Step 4: 跑测试**

Run: `node --import tsx --test tests/acks-theme-rewire.test.mjs`
Expected: 通过。

- [ ] **Step 5: Commit**

```bash
git add src/styles/typography-themes.ts tests/acks-theme-rewire.test.mjs
git commit -m "feat(acks): 排版主题替换为 43 款 ACKS 派生，未知 id 回退 graphite"
```

---

### Task 6: `exportService` 改走 `acksThemeToLzTokens`

**Files:**
- Modify: `src/services/exportService.ts`
- Test: `tests/acks-theme-rewire.test.mjs`

**Interfaces:**
- Consumes: Task 2 `acksThemeToLzTokens`、Task 4 `getAcksTheme`/`DEFAULT_ACKS_THEME`。
- Produces: `exportService` 的导出/PDF 颜色随所选 ACKS 主题变化。

- [ ] **Step 1: 删除 `TYPOGRAPHY_THEME_VARS` 与 `DEFAULT_THEME_VARS`（exportService 65-80）**

- [ ] **Step 2: `getCSSVars` / 两处 `TYPOGRAPHY_THEME_VARS[...] || DEFAULT_THEME_VARS` 改走 `acksThemeToLzTokens`**

```ts
import { acksThemeToLzTokens, DEFAULT_TYPOGRAPHY_THEME } from '../styles/acks-mapping'
import { getAcksTheme } from '../styles/acks-themes'
const themeFor = (id: string) => getAcksTheme(id) ?? getAcksTheme(DEFAULT_TYPOGRAPHY_THEME)!
function getCSSVars(typographyThemeId: string): string {
  const v = acksThemeToLzTokens(themeFor(typographyThemeId))
  const rgb = hexToRgb(v.primary)
  return [ /* 与原来相同的 --accent-* / --text-* 拼接，但值来自 v */ ].join('')
}
```

- [ ] **Step 3: `|| 'classic'` 改为 `DEFAULT_TYPOGRAPHY_THEME`（约 235、294 行）**

```ts
const typographyTheme = expOpts.typographyTheme || DEFAULT_TYPOGRAPHY_THEME
// 294 行同理
```

- [ ] **Step 4: 加边界断言（`tests/acks-theme-rewire.test.mjs`）**

```js
const exp = read('src/services/exportService.ts')
assert.doesNotMatch(exp, /TYPOGRAPHY_THEME_VARS|DEFAULT_THEME_VARS/, '旧 13 款主题变量已删除')
assert.match(exp, /acksThemeToLzTokens/, '导出走 ACKS 结构化 token')
assert.doesNotMatch(exp, /'classic'/, '导出不再回退 classic')
assert.match(exp, /DEFAULT_TYPOGRAPHY_THEME/, '导出默认走常量')
```

- [ ] **Step 5: 跑测试**

Run: `node --import tsx --test tests/acks-theme-rewire.test.mjs`
Expected: 通过。

- [ ] **Step 6: Commit**

```bash
git add src/services/exportService.ts tests/acks-theme-rewire.test.mjs
git commit -m "feat(acks): 导出/PDF 走 ACKS token（删旧 13 款主题变量）"
```

---

### Task 7: 默认主题与 `|| 'classic'` 全量替换

**Files:**
- Modify: `src/store/settingsStore.ts:69`、`src/main.tsx:28`、`src/hooks/useTheme.ts:180`、`src/components/sidebar/SidebarPreview.tsx:65`、`src/components/panels/ExportDialog.tsx:90,120`
- Test: `tests/acks-theme-rewire.test.mjs`

**Interfaces:**
- Consumes: `DEFAULT_TYPOGRAPHY_THEME`。
- Produces: 启动/各视图默认主题 = graphite，旧存档 id 不再引用 'classic'。

- [ ] **Step 1: `settingsStore.ts` 默认 `'graphite'`**

```ts
typographyTheme: 'graphite', // 原 'classic'
```

- [ ] **Step 2: `main.tsx` / `useTheme.ts` / `SidebarPreview.tsx` / `ExportDialog.tsx` 的 `|| 'classic'` → `|| DEFAULT_TYPOGRAPHY_THEME`**

```ts
// 各处 import { DEFAULT_TYPOGRAPHY_THEME } from '../styles/acks-mapping'
applyTypographyTheme(state.typographyTheme || DEFAULT_TYPOGRAPHY_THEME)
const typographyTheme = useSettingsStore(s => s.typographyTheme || DEFAULT_TYPOGRAPHY_THEME)
// SidebarPreview / ExportDialog 同理
```

- [ ] **Step 3: 加边界断言（`tests/acks-theme-rewire.test.mjs`）**

```js
assert.doesNotMatch(read('src/store/settingsStore.ts'), /typographyTheme:\s*'classic'/, '默认主题改 graphite')
assert.match(read('src/store/settingsStore.ts'), /typographyTheme:\s*'graphite'/, 'settingsStore 默认 graphite')
for (const f of ['src/main.tsx','src/hooks/useTheme.ts','src/components/sidebar/SidebarPreview.tsx','src/components/panels/ExportDialog.tsx']) {
  assert.doesNotMatch(read(f), /\|\|\s*'classic'/, `${f} 不应回退 classic`)
}
```

- [ ] **Step 4: 跑测试**

Run: `node --import tsx --test tests/acks-theme-rewire.test.mjs`
Expected: 通过。

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.ts src/main.tsx src/hooks/useTheme.ts src/components/sidebar/SidebarPreview.tsx src/components/panels/ExportDialog.tsx tests/acks-theme-rewire.test.mjs
git commit -m "feat(acks): 默认主题 graphite，全部 classic 回退改常量"
```

---

### Task 8: StyleMainPanel 改 ACKS 渲染 + 分页

**Files:**
- Modify: `src/components/panels/StyleMainPanel.tsx`、`src/styles/panels.css`
- Test: `tests/acks-theme-rewire.test.mjs`

**Interfaces:**
- Consumes: Task 4 `renderAcksArticle`/`getAcksTheme`、Task 2 `acksThemeCardMeta`/`DEFAULT_TYPOGRAPHY_THEME`、`ACKS_THEME_IDS`。
- Produces: 排版界面正文用 ACKS 渲染（`.style-read-article` 宿主）、43 卡片分页 10/页 + 左右箭头。
- **Ruling（lzmail 参考实现）:** 保持现有 `.style-card`/`.style-card-thumb`/`.style-card-preview`/`.style-card-name` + `.style-toolbar`/`.style-select-btn`/`.style-select-menu`/`.style-action-btn` 元素结构**不变**（LZEditor 当前已与参考 `sikenali/lzeditor` 一致）；只把 13 款主题源换成 43 款 ACKS，缩略图 mini-mock 颜色改由 ACKS token 驱动（`meta.color`=accent 用于标题/代码/选中态、`meta.bg` 缩略图底、`meta.text` 正文样例色），并加分页导航。选中态沿用 `.active` 类 + 缩略图 `borderColor`=accent + 名称色=accent。

- [ ] **Step 0: 确认现有卡片/工具栏元素结构不变（对照参考 `sikenali/lzeditor`）**

卡片：`.style-card`（按钮，`.active` 选中类）> `.style-card-thumb`（56×72，圆角 3px，`borderColor`=选中? accent : 灰）> `.style-card-preview`（mini-mock：名称行/accent、二级标题装饰下划线 `accent33`、正文样例·代码块 `accent18`/accent、引用样例）+ `.style-card-name`（选中时 accent 色）。工具栏：`.style-toolbar` > `.style-label-group`（"文档样式:" + `style-select-btn` 下拉） + `style-action-btn`（预览/导出/关闭）。全部保留原结构，仅数据源与颜色 token 换 ACKS。

- [ ] **Step 1: 正文宿主改 `.style-read-article`（原 `.read-article-body` 分支），去掉 `dangerouslySetInnerHTML`，改 ref + `renderAcksArticle`**

```tsx
const bodyRef = useRef<HTMLDivElement>(null)
const [activeStyle, setActiveStyle] = useState(typographyTheme || DEFAULT_TYPOGRAPHY_THEME)
const [page, setPage] = useState(0)
const PAGE_SIZE = 10
const totalPages = Math.ceil(ACKS_THEME_IDS.length / PAGE_SIZE)   // 5
const pageItems = ACKS_THEME_IDS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

// 渲染：依赖 effectiveMd/activeStyle。renderedHtml 与旧 `.read-article-body` 用同一份 mdToHtml 输出，
// 其 heading id（parseMdOutline 依赖）经 doc.innerHTML 包裹后保留，大纲/章节跳转不受影响（Review Focus #6）
useEffect(() => {
  const el = bodyRef.current; if (!el) return
  renderAcksArticle(el, renderedHtml, activeStyle)
}, [activeStyle, renderedHtml])

// 卡片点击
const pickStyle = (id: string) => { setActiveStyle(id); updateSetting('typographyTheme', id) }
```

- [ ] **Step 2: 卡片渲染改遍历 `pageItems`，颜色用 `acksThemeCardMeta(getAcksTheme(id)!)`；加左右箭头 + 页码**

```tsx
<div className="style-cards-pager">
  <button className="pager-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)} title="上一页">
    <span className="remix ri-arrow-left-s-line" />
  </button>
  <span className="pager-info">{page + 1}/{totalPages}</span>
  <button className="pager-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} title="下一页">
    <span className="remix ri-arrow-right-s-line" />
  </button>
</div>
// 卡片：pageItems.map(id => { const t = getAcksTheme(id)!; const meta = acksThemeCardMeta(t)
//   缩略图底 background: meta.bg；preview 文字色 meta.text；标题行 color: meta.color；
//   二级标题装饰 borderBottom: `${meta.color}33`；代码块 background: `${meta.color}18`, color: meta.color；
//   名称行(style-card-name) 选中时 color: meta.color；选中缩略图 borderColor: meta.color })
```

- [ ] **Step 3: `panels.css` 加 `.style-cards-pager` / `.pager-btn` / `.style-read-article` 样式**

```css
.style-cards-pager { display:flex; align-items:center; justify-content:center; gap:8px; padding:8px 0; }
.pager-btn { width:28px; height:28px; border:0.7px solid var(--color-border); background:var(--color-bg-secondary); border-radius:6px; color:var(--color-text-primary); cursor:pointer; }
.pager-btn:disabled { opacity:.4; cursor:not-allowed; }
.pager-btn:not(:disabled):hover { border-color:var(--color-primary); color:var(--color-primary); }
.pager-info { font-size:12px; color:var(--color-text-muted); }
.style-read-article { max-width:760px; margin:0 auto; }
```

- [ ] **Step 4: 加边界断言（`tests/acks-theme-rewire.test.mjs`）**

```js
const smp = read('src/components/panels/StyleMainPanel.tsx')
assert.match(smp, /renderAcksArticle/, '排版界面用 ACKS 渲染器')
assert.match(smp, /style-read-article/, '宿主用 .style-read-article')
assert.doesNotMatch(smp, /dangerouslySetInnerHTML/, '不再用 dangerouslySetInnerHTML 渲染正文')
assert.match(smp, /const PAGE_SIZE = 10/, '每页 10 个')
assert.match(smp, /totalPages/, '有分页')
assert.match(smp, /ri-arrow-left-s-line/, '有左箭头')
assert.match(smp, /ri-arrow-right-s-line/, '有右箭头')
assert.match(smp, /pager-btn/, '箭头按钮有 pager-btn')
assert.match(smp, /ACKS_THEME_IDS\.slice/, '按页切片')
assert.match(smp, /acksThemeCardMeta/, '卡片用 acksThemeCardMeta')
assert.match(smp, /meta\.color/, '卡片标题/选中态用 meta.color')
assert.match(smp, /meta\.bg/, '缩略图底用 meta.bg')
assert.match(smp, /meta\.text/, '正文样例色用 meta.text')
assert.match(smp, /style-card-thumb/, '保留参考实现卡片缩略图结构')
assert.match(smp, /style-select-btn/, '保留工具栏下拉选择器')
const panelsCss = read('src/styles/panels.css')
assert.match(panelsCss, /\.style-cards-pager/, '分页样式存在')
assert.match(panelsCss, /\.pager-btn:disabled/, '箭头禁用态')
```

- [ ] **Step 5: 跑测试**

Run: `node --import tsx --test tests/acks-theme-rewire.test.mjs`
Expected: 通过。

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/StyleMainPanel.tsx src/styles/panels.css tests/acks-theme-rewire.test.mjs
git commit -m "feat(acks): 排版界面 ACKS 渲染 + 43 卡片分页 10/页 + 左右箭头"
```

---

### Task 9: 全量验证

**Files:**
- （无新增）

- [ ] **Step 1: 全量类型检查 + 测试 + 构建**

Run: `npm run check && npm run build`
Expected: `tsc` 退出码 0，全部测试 PASS，`vite build` 成功。

- [ ] **Step 2: 清理临时文件**

Run: `git status --short`
Expected: 只剩本次任务预期文件；确认 `src/vendor/acks/engine/theme-catalog.raw.js`、`milestone-profiles.json`、`theme-signatures.json` 无残留（或保留为数据源但确认不进 bundle 冲突）。

- [ ] **Step 3: 提交收尾**

```bash
git add -A
git commit -m "chore(acks): 全量验证通过"
```

---

## 明确不做

- 不改 LZEditor 编辑器 / CodeMirror 分栏预览的 DOM 与滚动同步 / 大纲 / mermaid（沿用 LZEditor 管线）。
- 不做 43 份真实 ACKS mini 卡片渲染（卡片用用户提供的 mini-mock 结构，颜色取 ACKS token）。
- 不移植 ACKS 的编辑器 UI、导入、存储、导出、文章柜。
- 不逐 id 映射旧主题（旧 id 一律回退 graphite）。
- 不改 `readFontSize` 语义（排版界面字号由 ACKS `bodySize`/`lineHeight` token 决定）。
