# UI 全面修复实施计划（2026-11-11）

审计发现的问题，按用户决策修复：远程导入=删除死代码；编辑设置=接简单项+隐藏复杂项。

## 任务清单（TDD：每个改动先写失败测试）

### A. 删除远程导入死代码
- [x] A1: 边界测试断言 RemoteImportDialog.tsx / remoteImport.ts 已删且无引用（tests/remote-import-deadcode.test.mjs）
- [x] A2: 删除两个文件

### B. CM6 编辑设置接线（简单项）
- [x] B1: buildCM6Extensions(settings) 接受设置并按开关条件装配（softWrap/currentLine/autoPair/tabSize/showLineNumbers/spellCheck）
- [x] B2: CodeEditor 从 store 读设置传给 buildCM6Extensions（Compartment 运行时 reconfigure）
- [x] B3: 隐藏 livePreview/showMarkdownMarkers/continueLists（移除 UI 控件 + store 字段 + 类型）

### C. CM6 输入变换（medium 项）
- [x] C1: cm6-input-transform-logic.ts 纯函数（smartQuotes/cornerQuotes/autoSpaceCJK/fullwidthSymbols/autoCompleteMarkdownPairs/allowMarkdownSymbols）
- [x] C2: 行为测试通过纯函数（tests/cm6-input-transform-logic.test.mjs）
- [x] C3: cm6-input-transform.ts 接线（EditorView.inputHandler），buildCM6Extensions 挂载
- [x] C4: 边界测试断言挂载（tests/cm6-input-transform-wiring.test.mjs）

### D. 导出修复
- [x] D1: ExportDialog 导出未编辑文档不再输出 <h1>Empty</h1>（用真实内容 previewHtml 兜底 + md 导出用真实 mdSource）
- [x] D2: exportHTML 调用 buildTOC
- [x] D3: addLineNumbers 正则匹配 class="hljs language-…"
- [x] D4: 导出 <style> 注入 codeTheme 的 .hljs CSS 与 macCodeBlock 窗口样式
- [x] D5: PDF 弹窗被拦截时抛错（导出失败提示而非假成功）

### E. 无标题表格
- [x] E1: buildTableMd(withHeader=false) 补 GFM 分隔行（src/utils/tableMd.ts，App.tsx 改用之）

### F. 样式面板目录侧栏
- [x] F1: 接通 setTocItems 真实数据（StyleMainPanel chapters 提取 effect 内调用 setTocItems(items)）
- [x] F2: 工具栏补目录切换按钮（setReadTocOpen(!readTocOpen)），关闭后可重开侧栏

### G. 预览点击跳源码
- [x] G1: 实现 lineBridgeOf 返回真实 CM6 行桥（EditorView.findFromDOM + goToLine/scrollToLine/topVisibleLine）

### H. 左侧导航重复历史面板
- [x] H1: App 渲染逻辑修复（右面板 history 条件排除 navMode==='left'，中心区渲染唯一一份）

## 验证
- [x] npm run check（typecheck + test）：236 测试全绿，tsc --noEmit 通过
- [x] npm run build：构建成功（34.18s）
