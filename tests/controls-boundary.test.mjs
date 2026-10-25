import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const app = read('src/App.tsx')
const actions = read('src/components/layout/editorActions.tsx')
const tableEdit = read('src/components/editor/codemirror/table-edit.ts')
const focusMode = read('src/components/editor/codemirror/focus-mode.ts')
const editorTs = read('src/components/editor/codemirror/editor.ts')
const cm6 = read('src/components/editor/CM6Editor.tsx')
const lzeditor = read('src/components/editor/LZEditor.tsx')
const exportDialog = read('src/components/panels/ExportDialog.tsx')
const codeDialog = read('src/components/panels/CodeDialog.tsx')
const modelTab = read('src/components/panels/settings/ModelSettingsTab.tsx')
const tableDropdown = read('src/components/panels/TableDropdown.tsx')
const docx = read('src/services/docxGenerator.ts')
const toolbar = read('src/components/layout/Toolbar.tsx')
const preload = read('electron/preload.ts')
const mainTs = read('electron/main.ts')
const healthServer = read('server/src/index.ts')
const settingsStore = read('src/store/settingsStore.ts')
const pkg = read('package.json')

// ── 批次 A：参数不再被静默丢弃 ──────────────────────────────────────────

assert.match(app, /buildImageMd/, '图片对齐必须走 buildImageMd，不能无视 align')
assert.match(app, /insertImage = \(url: string, alt: string, align\?/, 'insertImage 必须接住 align 参数')
assert.match(app, /float:\$\{align\}/, '左/右对齐必须落 float')
assert.match(app, /newTab/, 'insertLink 必须接住新标签页参数')
assert.match(app, /target="_blank"/, '新标签页链接必须落 target=_blank')
assert.match(app, /rel="noopener"/, '外部链接必须带 rel=noopener')
assert.match(app, /buildTableMd\(rows, cols, data, withHeaderRow\)/, '表格标题行开关必须传给 buildTableMd')
assert.match(app, /CHART_TYPE_LABEL/, '图表类型必须进 alt 文本，不能丢')
assert.doesNotMatch(app, /_align|_newTab|_type|_withHeaderRow/, '不能再留被下划线丢弃的参数')

// ── 表格单元格操作 ──────────────────────────────────────────────────────

assert.match(actions, /runTableOp/, 'tableAction 必须真正执行单元格操作')
assert.match(actions, /runTableOp\(cm\.view, action as TableOp\)/, '单元格操作必须接到 table-edit.ts')
assert.doesNotMatch(actions, /合并单元格|拆分单元格/, 'markdown 无法表达单元格合并，菜单里不能留空转项')
assert.match(tableEdit, /export type TableOp = 'row' \| 'delRow' \| 'col' \| 'colBefore' \| 'delCol' \| 'headerRow' \| 'delete'/)
assert.match(tableEdit, /isSepRow/, '分隔行必须能识别')
assert.match(tableEdit, /SEP_CELL\.test\(t\) \? t : '---'/, '分隔行缺格必须补 ---，否则整块表格渲染不出来')
assert.match(tableEdit, /view\.dispatch\(/, '必须真正派发事务，不能只算不落')
assert.match(tableDropdown, /setActiveCell\(prev => \(prev && prev\.c === c/, '删列后 activeCell 索引必须同步，否则连点会删错列')
assert.match(tableDropdown, /setActiveCell\(prev => \(prev && prev\.r === r/, '删行后 activeCell 索引必须同步')

// ── 批次 B：编辑器设置真正生效 ─────────────────────────────────────────

assert.match(editorTs, /export function countWords/, '词数统计必须导出以便单测')
assert.match(editorTs, /\\u3400-\\u4dbf\\u4e00-\\u9fff/, '词数统计必须把 CJK 字符单独计数')
assert.doesNotMatch(editorTs, /text\.split\(\/\\s\+\/\)\.filter\(Boolean\)\.length/, '不能再按空白切词，中文整段会算成 1 个词')
assert.match(editorTs, /setSpellcheck\(on: boolean, lang\?: string\)/, '拼写检查必须能带语言')
assert.match(editorTs, /setAttribute\('lang', lang\)/, '拼写检查语言必须写到 DOM')
assert.match(editorTs, /setFocusMode/, '专注模式必须有开关入口')
assert.match(editorTs, /focusModeExtension,/, '专注模式扩展必须装进编辑器')
assert.match(editorTs, /currentFocusMode/, '专注模式必须有当前值缓存，避免重复派发')
assert.match(focusMode, /RangeSetBuilder<Decoration>\(\)/, '专注模式必须用 RangeSetBuilder 建装饰')
assert.match(focusMode, /EditorView\.decorations\.of\(view => view\.state\.field\(focusField\)\)/, '装饰必须挂在 view 上才能显示')
assert.match(focusMode, /export const focusField/, 'field 必须导出以便单测验证装饰数量')
assert.match(cm6, /autoPairOn = \(autoPairEnabled \?\? true\) && \(autoCompleteMdPairs \?\? true\)/, '两个自动配对开关必须都生效')
assert.match(cm6, /setFocusMode\(focusMode \?\? false\)/, 'CM6Editor 必须把专注模式传进去')
assert.match(cm6, /setSpellcheck\(enableSpellCheck \?\? true, spellCheckLang\)/, 'CM6Editor 必须把拼写检查语言传进去')
assert.match(lzeditor, /editorFont === 'serif'\) page\.style\.fontFamily = 'var\(--font-serif\)'/, '衬线字体必须指向 --font-serif，不能退回 sans')

// ── 批次 B：导出与图片 ─────────────────────────────────────────────────

assert.match(exportDialog, /useSettingsStore\(s => s\.exportFormat\)/, '导出格式必须回读设置，不能每次回到 pdf')
assert.match(exportDialog, /useState<any>\(exportFormat \|\| 'pdf'\)/, '导出格式初始值必须来自 store')
assert.match(exportDialog, /useState\(exportPaperSize \|\| 'a4'\)/, '纸张初始值必须来自 store')
assert.match(exportDialog, /useState\(exportOrientation \|\| 'portrait'\)/, '方向初始值必须来自 store')
assert.doesNotMatch(codeDialog, /setThemeId\(t\.id\)\}/, '主题选择不能只改预览状态')
assert.match(codeDialog, /updateSetting\('codeTheme', t\.id\)/, '代码块主题必须写回 store，不能只改预览')
assert.match(docx, /imageFallbackText/, '拉图失败必须给文字占位')
assert.match(docx, /图片无法加载/, '拉图失败必须留可见提示，不能静默丢图')

// ── 批次 C：AI 前端直连，后端不再中转 ─────────────────────────────────

assert.match(modelTab, /key\.format === 'anthropic'[\s\S]{0,300}\/v1\/messages/, 'Anthropic 探活必须请求 /v1/messages，不能打 /v1/models')
assert.match(modelTab, /key\.format === 'anthropic'[\s\S]{0,500}x-api-key/, 'Anthropic 探活必须带 x-api-key')
assert.match(modelTab, /key\.format === 'anthropic'[\s\S]{0,500}max_tokens: 1/, 'Anthropic 探活要用极小请求')
assert.doesNotMatch(modelTab, /gpt-5\.6-sol|claude-fable-5|qwen3\.7-max/, '模型列表不能留不存在的型号')
assert.match(modelTab, /compatible-mode\/v1/, '阿里云端点必须带 /v1')
assert.match(modelTab, /qianfan\.baidubce\.com\/v2/, '百度端点必须是千帆 OpenAI 兼容口')
assert.match(modelTab, /v1beta\/openai/, 'Google 端点必须是 OpenAI 兼容前缀')
assert.match(modelTab, /const setProvider = \(v: string\) => \{ setSelectedProvider\(v\); u\('selectedProvider', v\) \}/, '服务商选择必须落 store')
assert.match(modelTab, /u\('customEndpoint', v\)/, '自定义端点必须落 store')
assert.match(modelTab, /u\('customModelId', v\)/, '自定义模型必须落 store')
assert.match(modelTab, /u\('temperature', Number\(v\)\)/, '温度必须有 UI 控件')
assert.match(modelTab, /u\('maxTokens', Number\(v\)\)/, '最大 token 必须有 UI 控件')
assert.doesNotMatch(pkg, /@anthropic-ai\/sdk/, '前端直连后不再需要 Anthropic SDK')
assert.doesNotMatch(pkg, /"openai"/, '前端直连后不再需要 openai SDK')
assert.doesNotMatch(pkg, /"express"/, '后端只剩健康检查，不再需要 express')
assert.match(healthServer, /from 'http'|require\('http'\)/, '健康检查必须用零依赖 http')
assert.doesNotMatch(healthServer, /from 'express'|require\('express'\)/, '健康检查不能依赖 express')
assert.match(healthServer, /health/, '必须暴露健康检查端点')

// ── 批次 D：Electron 窗口 ─────────────────────────────────────────────

assert.match(toolbar, /ElectronWindowControls/, '无边框窗口必须自绘窗口按钮')
assert.match(toolbar, /api\.minimize\?\.\(\)/, '最小化按钮必须接通')
assert.match(toolbar, /api\.maximize\?\.\(\)/, '最大化按钮必须接通')
assert.match(toolbar, /api\.close\?\.\(\)/, '关闭按钮必须接通')
assert.match(toolbar, /const api = \(window as any\)\.electronAPI/, '必须从 window 上取 electronAPI')
assert.match(toolbar, /if \(!api\) return null/, '浏览器里必须不渲染窗口按钮')
assert.match(mainTs, /frame: false/, '确认是无边框窗口，所以必须自绘按钮')
assert.match(app, /api\?\.offMenuNew\?\.\(onNew\)/, 'onMenuNew 必须成对解绑')
assert.match(app, /api\?\.offMenuOpen\?\.\(onOpen\)/, 'onMenuOpen 必须成对解绑')
assert.match(app, /api\?\.offMenuExport\?\.\(onExport\)/, 'onMenuExport 必须成对解绑')
assert.match(app, /const offLocalFile = api\.onMenuOpenFile\?\.\(onLocalFile\)/, 'onMenuOpenFile 必须拿回解绑函数')
assert.match(preload, /return \(\) => ipcRenderer\.removeListener\('menu-open-file', wrapper\)/, 'openFile 必须返回解绑函数，外面拿不到 wrapper 就卸不掉')

// ── 批次 E：死键清理 ──────────────────────────────────────────────────

assert.doesNotMatch(settingsStore, /^\s*shortcut:/m, 'shortcut 设置从未被消费，必须清掉')
assert.doesNotMatch(settingsStore, /^\s*fontSize:/m, 'fontSize 与 defaultFontSize 重复且无人消费，必须清掉')
assert.doesNotMatch(settingsStore, /shortcut: 'Ctrl\+\/'/, '快捷键写死在 App.tsx 的 keydown 里，store 里的值没人读')
assert.match(settingsStore, /compatible-mode\/v1/, '默认密钥端点必须是 OpenAI 兼容口')

// ── CSS：拖拽区与专注模式 ─────────────────────────────────────────────

const layoutCss = read('src/styles/layout.css')
assert.match(layoutCss, /-webkit-app-region: drag/, '无边框窗口必须有拖拽区')
assert.match(layoutCss, /-webkit-app-region: no-drag/, '拖拽区里的按钮必须排除，否则点按钮会变成拖窗口')
assert.match(layoutCss, /\.win-controls/, '窗口按钮需要样式')

const tokensCss = read('src/styles/color-tokens.css')
assert.match(tokensCss, /--font-serif/, '必须有 --font-serif 变量，否则衬线字体回退失效')
