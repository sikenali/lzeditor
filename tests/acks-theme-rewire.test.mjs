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
assert.match(typo, /setAttribute\('data-typography-theme', theme\?\.id \?\? DEFAULT_TYPOGRAPHY_THEME\)/, '根属性写解析后的主题 id（旧 id 回退 DEFAULT，避免 night 错配 graphite）')

// --- Task 6: exportService 改走 ACKS token ---
const exp = read('src/services/exportService.ts')
assert.doesNotMatch(exp, /TYPOGRAPHY_THEME_VARS|DEFAULT_THEME_VARS/, '旧 13 款主题变量已删除')
assert.match(exp, /acksThemeToLzTokens/, '导出走 ACKS 结构化 token')
assert.doesNotMatch(exp, /'classic'/, '导出不再回退 classic')
assert.match(exp, /DEFAULT_TYPOGRAPHY_THEME/, '导出默认走常量')

// --- Task 7: 默认主题 graphite，全部 classic 回退改常量 ---
const mapping = read('src/styles/acks-mapping.ts')
assert.match(mapping, /DEFAULT_TYPOGRAPHY_THEME\s*=\s*'graphite'/, 'DEFAULT_TYPOGRAPHY_THEME = graphite')
const settingsStore = read('src/store/settingsStore.ts')
assert.doesNotMatch(settingsStore, /typographyTheme:\s*'classic'/, '默认主题改 graphite（不再写死 classic）')
assert.match(settingsStore, /typographyTheme:\s*DEFAULT_TYPOGRAPHY_THEME/, 'settingsStore 默认走常量 DEFAULT_TYPOGRAPHY_THEME（=graphite）')
for (const f of ['src/main.tsx', 'src/hooks/useTheme.ts', 'src/components/sidebar/SidebarPreview.tsx', 'src/components/panels/ExportDialog.tsx']) {
  const src = read(f)
  assert.doesNotMatch(src, /\|\|\s*'classic'/, `${f} 不应回退 classic`)
  assert.match(src, /DEFAULT_TYPOGRAPHY_THEME/, `${f} 应 import 并使用 DEFAULT_TYPOGRAPHY_THEME`)
}

// --- Task 8: StyleMainPanel 改 ACKS 渲染 + 43 卡片分页 10/页 + 左右箭头 ---
const smp = read('src/components/panels/StyleMainPanel.tsx')
assert.match(smp, /renderAcksArticle/, '排版界面用 ACKS 渲染器')
assert.match(smp, /style-read-article/, '宿主容器用 .style-read-article')
assert.match(smp, /style-read-acks/, 'ACKS 内容宿主用 .style-read-acks（非 token CSS 宿主）')
assert.match(smp, /articleBodyRef/, 'ACKS 内容宿主有独立 ref')
assert.doesNotMatch(smp, /dangerouslySetInnerHTML/, '不再用 dangerouslySetInnerHTML 渲染正文')
assert.doesNotMatch(smp, /lz-styleread-typography-css/, '删除旧排版注入 useEffect')
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

// --- 最终审查修复：data-typography-theme 用解析后 id、死代码清理、CSS 注入节流 ---
const exportDialog = read('src/components/panels/ExportDialog.tsx')
const sidebarPreview = read('src/components/sidebar/SidebarPreview.tsx')
assert.doesNotMatch(exportDialog, /\[data-typography-theme="[^"]+"\]\s*\./, 'ExportDialog 不再对 theme.css 做属性选择器 .replace 重映射（死代码）')
assert.doesNotMatch(sidebarPreview, /\[data-typography-theme="[^"]+"\]\s*\./, 'SidebarPreview 不再对 theme.css 做属性选择器 .replace 重映射（死代码）')
assert.match(exportDialog, /styleEl\.textContent = theme\.css/, 'ExportDialog 直接使用 theme.css')
assert.match(sidebarPreview, /el\.textContent = theme\.css/, 'SidebarPreview 直接使用 theme.css')
assert.match(acksThemes, /lastInjectedCss/, 'injectAcksCss 节流：已写入 CSS 才写 textContent')
assert.match(smp, /暂无内容，请先编辑文档/, 'StyleMainPanel 空态占位保留')
