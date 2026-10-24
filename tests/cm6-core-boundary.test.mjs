import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const cm6 = read('src/components/editor/CM6Editor.tsx')
const store = read('src/store/editorStore.ts')
const editorTs = read('src/components/editor/codemirror/editor.ts')
const commands = read('src/components/editor/codemirror/commands.ts')
const actions = read('src/components/layout/editorActions.tsx')
const search = read('src/components/panels/SearchPanel.tsx')
const history = read('src/components/panels/HistoryPanel.tsx')
const toolbar = read('src/components/layout/Toolbar.tsx')
const lzeditor = read('src/components/editor/LZEditor.tsx')
const app = read('src/App.tsx')
const useAI = read('src/hooks/useAI.ts')

// ── 单一事实源：CM6 的编辑必须落 docsMd + md + html ──
assert.match(cm6, /mdToHtml/, 'CM6Editor 必须把 markdown 同步成 html')
assert.match(cm6, /docsMd:\s*\{\s*\[docId\]:\s*text\s*\}/, 'CM6Editor 必须把编辑结果写进 docsMd')

// ── docsMd 只能按文档合并，整块替换会丢其它文档内容 ──
assert.match(store, /\.\.\.\(s\.docsMd \|\| \{\}\), \.\.\.params\.docsMd/, 'updateDoc 必须合并 docsMd 而不是整块替换')

// ── 历史去重按正文，html 为空时不能吞掉后续快照 ──
assert.match(store, /last\.md === version\.md/, 'addVersion 去重必须基于 md 正文')
assert.doesNotMatch(store, /htmlToMarkdown/, 'store 不能再依赖 TipTap 的 HTML→markdown 往返')

// ── 图片粘贴/拖拽必须有真实 handler，null 会静默吞掉截图 ──
assert.doesNotMatch(editorTs, /setImageHandler\(view,\s*null\)/, '图片 handler 不能是 null')
assert.match(editorTs, /setImageHandler\(view,\s*\(images\)/, '必须注册真实图片 handler')

// ── 查找替换走 @codemirror/search 的 SearchQuery ──
assert.match(editorTs, /SearchQuery/, 'editor.ts 必须使用 SearchQuery')
assert.match(editorTs, /openSearchPanel/, '必须能打开搜索面板')
assert.match(search, /cm\.search\(\{ query/, '查找面板必须把词传给 CM6')
assert.doesNotMatch(search, /const cm6 = getCM6Editor\(\)/, '实例不能在 render 期抓一次')

// ── FormatCommand 覆盖面 ──
for (const cmd of ['underline', 'highlight', 'sup', 'sub', 'clear', 'math', 'footnote', 'toc', 'strikethrough']) {
  assert.match(commands, new RegExp(`\\b${cmd}([,:])`), `commands.ts 必须注册 ${cmd}`)
}

// ── 命令名映射不能让动作静默失败 ──
assert.match(actions, /strikeThrough: 'strikethrough'/, '大小写变体必须映射')
assert.match(actions, /underline: 'underline'/, 'underline 必须映射')
assert.match(actions, /PANEL_ACTIONS/, '无映射的插入动作必须打开面板')

// ── 写入路径全部接入 CM6 ──
assert.match(editorTs, /insertText|replaceRange|getSelectionRange/, 'CM6 必须暴露文本写入接口')
assert.match(history, /cm\.setText\(selected\.md\)|getCM6Editor\(\)\?\.setText\(selected\.md\)/, '历史回滚必须写 CM6')
assert.match(useAI, /replaceRange\(range\.from, range\.to, output\)/, 'AI 应用必须写 CM6')
assert.match(toolbar, /getCM6Editor\(\)\?\.getSelectionText\(\)/, 'AI 面板必须带选区上下文')
assert.match(app, /getCM6Editor\(\)/, '插入对话框必须接入 CM6')
assert.match(app, /buildTableMd/, '表格对话框必须能产出 markdown 表格')

// ── CM6 实例必须常驻 ──
assert.match(lzeditor, /cm6Visible \? 'block' : 'none'/, '切换模式时必须用 display 隐藏而不是卸载 CM6')
assert.doesNotMatch(lzeditor, /useCM6 &&/, '内核切换分支必须删掉')

// ── 设置项必须真的落 CM6，不能只记变量 ──
const complete = read('src/components/editor/codemirror/complete.ts')
const settingsTab = read('src/components/panels/settings/EditorSettingsTab.tsx')
assert.match(editorTs, /new Compartment\(\)/, '可开关扩展必须走 Compartment')
assert.match(editorTs, /tabSizeC\.reconfigure\(EditorState\.tabSize\.of\(n\)\)/, 'setTabSize 必须真正改缩进大小')
assert.match(editorTs, /lineNumbersC\.reconfigure\(on \? lineNumbers\(\)/, '行号必须能真正增删')
assert.match(editorTs, /wrapC\.reconfigure\(on \? EditorView\.lineWrapping/, '软换行必须走 Compartment')
assert.match(editorTs, /currentLineC\.reconfigure/, '当前行高亮必须走 Compartment')
assert.match(editorTs, /continuationC\.reconfigure/, '续写列表必须走 Compartment')
assert.match(editorTs, /typewriterC\.reconfigure/, '打字机模式必须走 Compartment')
assert.match(editorTs, /livePreviewC\.reconfigure\(on \? livePreviewExtension/, '实时预览必须真正装入/移除扩展')
assert.doesNotMatch(editorTs, /setTabSize\(_size: number\): void \{\}/, 'setTabSize 不能是空实现')
assert.match(editorTs, /setSnippetDataEffect\(\{ snippets: snippetList \}\)/, 'setSnippets 不能丢弃参数')
assert.match(complete, /type: 'snippet'/, 'snippet 补全 type 必须与 Tab keymap 判断一致')
for (const key of ['softWrap', 'currentLine', 'continueLists', 'autoPair', 'livePreview', 'tabSize']) {
  assert.match(settingsTab, new RegExp(`u\\('${key}',`), `设置面板必须暴露 ${key}`)
}
assert.doesNotMatch(settingsTab, /useCM6Editor/, '内核切换开关不应再出现在设置面板')

// ── CM6 是唯一内核：输入变换 / 斜杠面板 / 大纲都要落到 CM6 ──
const inputFormat = read('src/components/editor/codemirror/input-format.ts')
const slash = read('src/components/editor/codemirror/slash.ts')
const slashUi = read('src/components/editor/SlashCommand.tsx')
const outline = read('src/components/sidebar/SidebarOutline.tsx')
assert.match(editorTs, /slashPaletteExtension/, 'editor.ts 必须装入斜杠触发监听')
assert.match(editorTs, /inputFormatListener/, 'editor.ts 必须装入输入变换监听')
assert.match(editorTs, /goto\(from: number, to\?: number\): void/, 'CM6 必须暴露 goto 供大纲跳转')
assert.match(editorTs, /setInputFormat\(next: Partial<InputFormatSettings>\): void/, '输入变换设置不能丢弃参数')
assert.match(inputFormat, /allowMarkdownSymbols/, 'Markdown 符号键必须可开关')
assert.match(inputFormat, /smartQuotes/, '引号智能替换必须可开关')
assert.match(slash, /slashPaletteExtension/, 'slash.ts 必须导出触发扩展')
assert.match(slashUi, /runFormatCommand/, '斜杠面板必须落到 CM6 的格式命令')
assert.match(outline, /parseMdOutline/, '大纲必须从 markdown 源文本解析')
assert.match(outline, /getCM6Editor\(\)\?\.goto/, '大纲跳转必须写 CM6')

// ── S2 清理：TipTap 的 store 槽位、开关与样式类不能残留 ──
const settingsStore = read('src/store/settingsStore.ts')
const storeTypes = read('src/shared/types.ts')
assert.doesNotMatch(store, /setEditor\s*:/, 'store 不应再持有 TipTap 的 editor 槽位')
assert.doesNotMatch(storeTypes, /editor: any/, 'EditorStoreState 不应再声明 editor')
assert.doesNotMatch(settingsStore, /useCM6Editor/, 'useCM6Editor 开关必须随 TipTap 一起删')
const styleFiles = ['src/styles/globals.css', 'src/styles/app.css', 'src/styles/layout.css', 'src/styles/panels.css', 'src/styles/ui.css']
assert.deepStrictEqual(
  styleFiles.filter(f => /lz-insert|ProseMirror/.test(read(f))),
  [],
  '样式表不应再有 TipTap 遗留类'
)

// ── TipTap / ProseMirror 必须彻底下线，src 里不允许再有引用 ──
const walk = (dir) => {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}
const banned = walk('src').filter(f => {
  const src = readFileSync(f, 'utf8')
  return /@tiptap|@memfoldai|@milkdown|prosemirror|useEditor\(/.test(src)
    || /\bEditorContent\b/.test(src)
})
assert.deepStrictEqual(
  banned.map(f => relative(process.cwd(), f)),
  [],
  'src 不应再依赖 TipTap / ProseMirror'
)
console.log('cm6 core boundary ok')
