import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const app = read('src/App.tsx')
const actions = read('src/components/layout/editorActions.tsx')
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
const typesTs = read('src/shared/types.ts')
const electronApi = read('electron/api.ts')
const electronApiD = read('src/electron-api.d.ts')
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

assert.match(actions, /TABLE_OP_TO_YELI/, 'tableAction 必须映射到 yeli 表格命令')
assert.match(actions, /facade\.execCommand\(yeliId\)/, '单元格操作必须经 facade 表格命令路由')
assert.doesNotMatch(actions, /合并单元格|拆分单元格/, 'markdown 无法表达单元格合并，菜单里不能留空转项')
assert.match(actions, /getTableContext\(\)/, '表格结构命令必须经 facade 反推当前表格上下文')
assert.match(tableDropdown, /setActiveCell\(prev => \(prev && prev\.c === c/, '删列后 activeCell 索引必须同步，否则连点会删错列')
assert.match(tableDropdown, /setActiveCell\(prev => \(prev && prev\.r === r/, '删行后 activeCell 索引必须同步')

// ── 批次 B：编辑器设置真正生效（编辑器侧）──────────────────────────────

assert.match(actions, /getEditorFacade\(\)/, '编辑动作必须统一走编辑器 facade')

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
assert.match(toolbar, /const api = window\.electronAPI/, '必须从 window 上取 electronAPI（走 Window 全局声明，不留 as any）')
assert.match(app, /const api = window\.electronAPI/, 'App.tsx 也必须走类型化的 window.electronAPI')
assert.match(electronApi, /export interface ElectronAPI/, 'preload 暴露的接口必须有一份共享类型')
assert.match(electronApiD, /electronAPI\?: ElectronAPI/, 'Window 必须声明 electronAPI 可选字段，浏览器里是 undefined')
assert.match(preload, /const api: ElectronAPI = \{/, 'preload 必须按共享类型标注，保证暴露的方法名没打错')
assert.match(preload, /import type \{ ElectronAPI \} from '\.\/api'/, 'preload 必须从 electron/ 内引用类型，不能跨目录 import 撑开编译根目录')
assert.doesNotMatch(app, /\(window as any\)\.electronAPI/, '不能再靠 as any 绕过类型检查')
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

// Ctrl+Alt+1..6 标题快捷键补绑在 CM6 assist keymap（B2）：不再依赖 yeli assist 层
const cm6Assist = read('src/components/editor/facade/cm6/cm6-assist.ts')
assert.match(cm6Assist, /headingShortcutKeymap/, '必须导出 CM6 标题快捷键 keymap')
assert.match(cm6Assist, /Mod-Alt-/, '快捷键必须认 Ctrl 与 ⌘ 并配 Alt')
assert.match(cm6Assist, /block\.convert\.heading1/, 'H1 必须映射到 block.convert.heading1')
assert.match(cm6Assist, /block\.convert\.heading6/, 'H6 必须映射到 block.convert.heading6')

const shortcutTab = read('src/components/panels/settings/ShortcutSettingsTab.tsx')
assert.doesNotMatch(shortcutTab, /\$\{alt\}\+Tab/, 'Alt+Tab 是系统窗口切换键，永远抢不到，不能列进快捷键表')

const globalsCss = read('src/styles/globals.css')
assert.doesNotMatch(globalsCss, /data-md-markers/, '标记常显不能再靠 CSS 类名，编辑态 DOM 没有标题元素')
const codeEditor = read('src/components/editor/CodeEditor.tsx')
assert.doesNotMatch(codeEditor, /data-md-markers\s*[:=]/, 'CodeEditor 不再往编辑器容器写 data-md-markers')

// 「首行缩进」「两端对齐」此前只写 CSS 变量，没有任何规则消费
const readModeCss = read('src/styles/read-mode.css')
assert.match(readModeCss, /text-indent: var\(--read-text-indent/, '首行缩进必须被真正消费')
assert.match(readModeCss, /text-align: var\(--read-text-align/, '两端对齐必须被真正消费')

// 浮导航隐藏态必须彻底隐藏：nav-float-btn 带 backdrop-filter，Chromium 里 opacity:0
// 压不住 backdrop-filter 的白雾泄漏（隐藏态仍现白雾区）。必须加 visibility:hidden 彻底不渲染。
assert.match(
  readModeCss,
  /\.main-nav-float\.nav-hidden\s*\{[^}]*visibility:\s*hidden/,
  'nav-hidden 必须加 visibility:hidden，彻底隐藏浮导航（防 backdrop-filter 白雾泄漏）',
)

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
assert.match(types, /openPanel: 'none' \| 'library' \| 'history' \| 'settings' \| 'export'/, 'openPanel 类型必须收窄到真实可达的值')
assert.doesNotMatch(app, /PreviewPanel/, 'PreviewPanel 已无任何入口，必须移除')

// 主进程只需要四个开关，不能把含明文密钥的全量设置发过去
assert.match(app, /APP_SETTING_KEYS/, '推给主进程的设置必须白名单化')
assert.match(app, /quitWhenAllWindowsClosed/, '白名单必须覆盖主进程实际读的键')
assert.doesNotMatch(app, /sendSettings\?\.\(useSettingsStore\.getState\(\)\)/, '不能把全量 settings 发给主进程')

// ── 批次 H：设置项必须真的落盘、真的被消费 ────────────────────────────────

// 落盘不能绑在 SettingsDialog 的生命周期上——ExportDialog / CodeDialog / StyleMainPanel / Footer
// 都在改设置，它们不经过设置中心，挂订阅之前这些改动全部丢了。
assert.match(settingsStore, /useSettingsStore\.subscribe\(\(state, prev\)/, '必须订阅全 store 而不是等设置中心打开')
assert.match(settingsStore, /PERSIST_SKIP = new Set\(\['activeGroup', 'subTab'\]\)/, '导航态字段不能当设置落盘')
assert.match(settingsStore, /window\.addEventListener\('beforeunload'/, '退出前必须同步 flush，定时器赶不上关机')
assert.match(settingsStore, /raw\.map\(migrateApiKey\)/, '老存档的 apiKeys 必须按条目补新字段，整包替换会让用户补的字段全丢')
assert.match(typesTs, /modelConfigTab\?: 'provider' \| 'custom'/, '模型设置页的 tab 选择必须能落盘')

// 两个引号开关共用同一条替换管线，都开会静默覆盖
const editorTab = read('src/components/panels/settings/SymbolSpellSettingsTab.tsx')
assert.match(editorTab, /u\('smartQuotes', v\); if \(v\) u\('cornerQuotes', false\)/, '开智能引号必须关掉直角引号')
assert.match(editorTab, /u\('cornerQuotes', v\); if \(v\) u\('smartQuotes', false\)/, '开直角引号必须关掉智能引号')
assert.match(editorTab, /逗号与分号/, '半角转全角只替换逗号与分号，文案必须说准')

// 字号 / 行高 / 字体此前只写 CSS 变量、没有规则消费
assert.match(readModeCss, /font-size: var\(--read-font-size/, '默认字号必须被消费')
assert.match(readModeCss, /line-height: var\(--read-line-height/, '默认行高必须被消费')
assert.match(readModeCss, /font-family: var\(--read-font-family/, '默认字体必须被消费')

// Ctrl+R 归渲染进程切阅读模式，主进程再配一次同名加速器会把它吃掉
assert.doesNotMatch(mainTs, /accelerator: 'CmdOrCtrl\+R'/, '不能给窗口重新加载配 Ctrl+R 加速器')
assert.match(mainTs, /role: 'selectall'/, '全选必须走标准角色，让浏览器默认行为生效')

// Ctrl+Shift+O 有实现，快捷键表不能漏
assert.match(shortcutTab, /row\('打开文件夹批量导入', `\$\{mod\}\+\$\{shift\}\+O`\)/, 'Ctrl+Shift+O 必须在快捷键表里')
assert.match(shortcutTab, /row\('退出应用', `\$\{mod\}\+Q`, '仅桌面端'\)/, 'Ctrl+Q 只在 Electron 生效，必须标注')
assert.doesNotMatch(shortcutTab, /重新加载窗口/, '窗口重新加载的加速器已移除，不能再列成快捷键')

