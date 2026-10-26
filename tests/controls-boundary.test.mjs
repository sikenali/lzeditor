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

// ── P2：声明了却没人接上的控件 ─────────────────────────────────────────

// 「插入 → 数学公式」此前 action 写成 'math'，而 App 只渲染 insertPanel === 'formula'，点了等于没点
assert.doesNotMatch(actions, /label: '数学公式', action: 'math'/, "数学公式的 action 不能写成 'math'，App 里只认 'formula'")
assert.match(actions, /label: '数学公式', action: 'formula'/, '数学公式必须落到 formula 面板')
assert.match(actions, /'formula'/, 'PANEL_ACTIONS 必须包含 formula')
assert.doesNotMatch(actions, /PANEL_ACTIONS = new Set\([^)]*'math'/, "PANEL_ACTIONS 里的 'math' 是死值")

// Ctrl+Alt+1..6 此前只有快捷键页的文案，CM6 里没有绑定
assert.match(editorTs, /headingKeymap/, '必须有标题快捷键 keymap')
assert.match(editorTs, /Mod-Alt-1/, 'H1 快捷键必须真的绑上')
assert.match(editorTs, /Mod-Alt-6/, 'H6 快捷键必须真的绑上')
assert.match(editorTs, /heading-6/, '标题快捷键必须调 runFormatCommand 的 heading-N')
assert.match(editorTs, /^\s*headingKeymap,/m, 'headingKeymap 必须注册进扩展，定义了不挂载等于没写')

const shortcutTab = read('src/components/panels/settings/ShortcutSettingsTab.tsx')
assert.doesNotMatch(shortcutTab, /\$\{alt\}\+Tab/, 'Alt+Tab 是系统窗口切换键，永远抢不到，不能列进快捷键表')

// 「Markdown 标记常显」开关此前失效：h1/h4/h5/h6 的 content 没有 data-md-markers 门控
const globalsCss = read('src/styles/globals.css')
assert.doesNotMatch(globalsCss, /--md-markers-visible/, '--md-markers-visible 从未被定义，相关规则是空操作')
assert.doesNotMatch(globalsCss, /\.lz-editor-content h1::before/, '标题标记必须受 data-md-markers 门控，不能无条件显示')
assert.match(globalsCss, /data-md-markers="inline"\] h2::before/, 'h2 也必须显示 ## 标记')
assert.match(globalsCss, /data-md-markers="inline"\] h3::before/, 'h3 也必须显示 ### 标记')
assert.match(globalsCss, /not\(\.lz-editor-content--read\)\[data-md-markers/, '阅读模式不能显示 markdown 标记')

// 「首行缩进」「两端对齐」此前只写 CSS 变量，没有任何规则消费
const readModeCss = read('src/styles/read-mode.css')
assert.match(readModeCss, /text-indent: var\(--read-text-indent/, '首行缩进必须被真正消费')
assert.match(readModeCss, /text-align: var\(--read-text-align/, '两端对齐必须被真正消费')

// 完全没有 UI 能写的设置项，留着只是误导
assert.doesNotMatch(settingsStore, /^\s*headingStyles:/m, 'headingStyles 没有任何界面能写入，必须清掉')
assert.doesNotMatch(settingsStore, /^\s*linkColor:/m, 'linkColor 没有任何界面能写入，必须清掉')
assert.doesNotMatch(settingsStore, /^\s*blockquoteBackground:/m, 'blockquoteBackground 没有任何界面能写入，必须清掉')
assert.doesNotMatch(settingsStore, /addApiKey/, 'addApiKey 从未被调用，模型设置页走 updateSetting')

const editorStore = read('src/store/editorStore.ts')
assert.match(editorStore, /previewModeEnabled/, '记住的预览开关必须参与首次启动的布局初始化')
assert.match(editorStore, /showPreview: initialLayout\.showPreview/, '上次关闭前的预览状态必须恢复')

const types = read('src/shared/types.ts')
assert.doesNotMatch(types, /statusbarCollapsed\?/, 'SettingsState 里的 statusbarCollapsed 是幽灵副本，真身在 editorStore')
assert.match(types, /openPanel: 'none' \| 'library' \| 'file' \| 'history' \| 'settings' \| 'export'/, 'openPanel 类型必须收窄到真实可达的值')
assert.doesNotMatch(app, /PreviewPanel/, 'PreviewPanel 已无任何入口，必须移除')

// 主进程只需要四个开关，不能把含明文密钥的全量设置发过去
assert.match(app, /APP_SETTING_KEYS/, '推给主进程的设置必须白名单化')
assert.match(app, /quitWhenAllWindowsClosed/, '白名单必须覆盖主进程实际读的键')
assert.doesNotMatch(app, /sendSettings\?\.\(useSettingsStore\.getState\(\)\)/, '不能把全量 settings 发给主进程')
