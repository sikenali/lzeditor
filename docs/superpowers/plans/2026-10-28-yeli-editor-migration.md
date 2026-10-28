# Yeli 编辑器迁移实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 从 LZEditor 移除 CodeMirror 6，将编辑体验整体替换为 yeli 的 source-mapped WYSIWYG 区块编辑器（vendor 方式），并把现有周边功能（输入辅助、区块内特效渲染、AI 接入点）重接到新编辑器上，文档数据格式保持 lzeditor 现状（.md + 本地存储/文件系统）。

**架构：** yeli 的纯逻辑层（`src/editor` + `src/document` + `src/render`）与编辑体验（`src/ui/edit-canvas.tsx`）按 MIT 协议 vendor 进 `src/vendor/yeli/`，对外暴露唯一 `YeliEditorFacade`（markdown 字符串进出 + typed range-aware 操作 + command 透传）。lzeditor 周边只面对 markdown 字符串，经 facade 进出；一切外部写入（AI 流式、插代码块/公式、导入）走 yeli 事务管线，不直接 setText 覆盖。React 升级到 19 以原样 vendor `edit-canvas.tsx`。

**技术栈：** React 19、TypeScript 5、Vite 5、vitest、playwright（现有）、yeli 自研区块投影（零新运行时依赖）、markdown-it + DOMPurify、highlight.js/KaTeX/mermaid/echarts。

**上游钉住 commit：** `ade95cba294a72b8db033599367c3ddc250e2b0b`（whitesmell/yeli main）

---

## 文件结构（本次涉及的新增/删除/修改）

新增：
- `src/vendor/yeli/`（editor/、document/、render/、ui/edit-canvas.tsx 等，拷贝自上游钉住 commit）
- `src/vendor/yeli/README.md`（记录上游 commit + MIT 署名 + 同步说明）
- `src/components/editor/YeliEditor.tsx`（新编辑器入口，替代 LZEditor/CM6Editor）
- `src/components/editor/facade/YeliEditorFacade.ts`（唯一对外 API）
- `src/components/editor/assist/`（自动配对 / 智能粘贴 / 打字机 / 专注模式）
- `src/components/editor/render-ext/`（mermaid/katex/echarts/代码高亮 markdown-it 扩展 + 惰性容器）
- `src/vendor/yeli/__tests__/` 或 `tests/vendor/`（facade 保真测试、保真回归套件）
- `docs/third-party-notices-yeli.md`（MIT 署名声明）

删除：
- `src/components/editor/codemirror/`（整目录 14 文件）
- `src/components/editor/CM6Editor.tsx`
- `src/components/editor/LZEditor.tsx`
- 所有 `@codemirror/*`、`@lezer/*` import 与 `getCM6Editor()` 引用点

修改：
- `package.json`（react→19、@types/react→19、移除 CM6/lezer 依赖）
- `src/App.tsx`、`src/components/layout/editorActions.tsx`、`src/components/layout/Toolbar.tsx`、`src/components/panels/SearchPanel.tsx`、`src/components/panels/HistoryPanel.tsx`、`src/components/sidebar/SidebarOutline.tsx`、`src/hooks/scrollSync.ts`、`src/hooks/useAI.ts`、`src/utils/docImport.ts`（getCM6Editor → facade）
- `src/store/editorStore.ts`（editorContentRef 指向 facade 而非 CM6 view）

---

## 任务 0：React 19 升级（独立前置，先于一切编辑器改动）

**文件：**
- 修改：`package.json`
- 修改：`package-lock.json`（npm install 生成）

- [ ] **步骤 1：bump React 到 19**

```bash
npm install react@^19 react-dom@^19
npm install -D @types/react@^19 @types/react-dom@^19
```

- [ ] **步骤 2：验证相关库兼容性**

运行：`npm run typecheck` 与 `npm run dev` 手测。
预期：若 `echarts-for-react`、`emoji-picker-react`、`react-katex` 报 peer/运行时错误，记录并按需升级到支持 React 19 的版本（`echarts-for-react` 若无 19 支持，替换为手写 echarts wrapper 于 `src/components/editor/render-ext/`）。

- [ ] **步骤 3：跑全量回归**

运行：`npm run check` 和 `npm run test:e2e`
预期：全部绿（typecheck 通过、现有测试通过、e2e 通过）。

- [ ] **步骤 4：Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade react to 19 (前置，为 vendor yeli edit-canvas)"
```

---

## 任务 1：Vendor yeli 纯逻辑层 + 渲染边界

**文件：**
- 创建：`src/vendor/yeli/README.md`
- 创建：`src/vendor/yeli/editor/`、`src/vendor/yeli/document/`、`src/vendor/yeli/render/`（拷贝上游）
- 创建：`docs/third-party-notices-yeli.md`

- [ ] **步骤 1：下载上游钉住 commit 到临时目录**

```bash
rm -rf /tmp/opencode/yeli && git clone https://github.com/whitesmell/yeli.git /tmp/opencode/yeli
cd /tmp/opencode/yeli && git checkout ade95cba294a72b8db033599367c3ddc250e2b0b
```

- [ ] **步骤 2：拷贝纯逻辑层与渲染边界**

```bash
mkdir -p src/vendor/yeli
cp -r /tmp/opencode/yeli/src/editor src/vendor/yeli/editor
cp -r /tmp/opencode/yeli/src/document src/vendor/yeli/document
cp -r /tmp/opencode/yeli/src/render src/vendor/yeli/render
cp -r /tmp/opencode/yeli/src/types src/vendor/yeli/types
```

- [ ] **步骤 3：审计 vendor 内部依赖并补齐**

```bash
grep -rn "^import" src/vendor/yeli/editor src/vendor/yeli/document src/vendor/yeli/render | grep -vE "from '\.\./|from '\./|from '@"
```

预期：除 `./`、`../` 相对引用外，不得出现 `@codemirror/*`、`react`、`@heroicons/*` 等 yeli 应用级依赖。若出现 `src/i18n`、`src/brand` 等 yeli 内部模块引用，按需将对应最小模块一并 vendor（如 `src/vendor/yeli/i18n/`），或在 vendor README 记录"已剥离的引用与替代"。此步以"纯逻辑层零应用依赖、零 React 引用"为验收标准。

- [ ] **步骤 4：写 vendor README 与署名**

`src/vendor/yeli/README.md` 内容（记录来源与同步方式）：

```markdown
# Yeli 编辑器 vendor 拷贝

来源：https://github.com/whitesmell/yeli （MIT License）
钉住 commit：ade95cba294a72b8db033599367c3ddc250e2b0b
拷贝范围：src/editor、src/document、src/render、src/types（+ 后续任务补齐 src/ui/edit-canvas.tsx）

同步方式：上游 main 更新后，以同一 commit 基准重新拷贝，本地只允许在
src/vendor/yeli/ 之外的适配层做改动；vendor 内改动需在 README 记录 diff 原因。

License：MIT，见 docs/third-party-notices-yeli.md。
```

`docs/third-party-notices-yeli.md`：写明 yeli 项目名、版权、MIT 协议全文、来源 URL、钉住 commit。

- [ ] **步骤 5：typecheck vendor 通过**

运行：`npx tsc --noEmit -p tsconfig.app.json`
预期：vendor 目录类型检查通过（若上游类型依赖缺失，用最小 d.ts 补齐并在 README 记录）。

- [ ] **步骤 6：Commit**

```bash
git add src/vendor/yeli docs/third-party-notices-yeli.md
git commit -m "feat(vendor): 引入 yeli 编辑器纯逻辑层与渲染边界 (MIT, pinned ade95cb)"
```

---

## 任务 2：YeliEditorFacade（唯一对外 API）+ 保真单元测试（TDD）

**文件：**
- 创建：`src/components/editor/facade/YeliEditorFacade.ts`
- 创建：`tests/vendor/facade-fidelity.test.mjs`

- [ ] **步骤 1：编写失败的 facade 保真测试**

`tests/vendor/facade-fidelity.test.mjs`（vitest 用，node --import tsx）：

```js
import { describe, it, expect } from 'vitest'
import { createYeliFacade } from '../../src/components/editor/facade/YeliEditorFacade'

describe('YeliEditorFacade fidelity', () => {
  const MD = '# 标题\n\n正文段落，含 **粗体**。\n\n- 列表项一\n- 列表项二\n'
  it('no-edit zero diff: setText then getText returns identical md', () => {
    const f = createYeliFacade()
    f.setText(MD)
    expect(f.getText()).toBe(MD)
  })
  it('replaceRange keeps surrounding markdown intact', () => {
    const f = createYeliFacade()
    f.setText(MD)
    f.replaceRange(3, 6, '新标题')
    expect(f.getText()).toContain('# 新标题')
    expect(f.getText()).toContain('- 列表项二\n')
  })
  it('insertText at end appends', () => {
    const f = createYeliFacade()
    f.setText('abc')
    f.insertText('def')
    expect(f.getText()).toBe('abcdef')
  })
  it('rejects out-of-range replace', () => {
    const f = createYeliFacade()
    f.setText('abc')
    expect(() => f.replaceRange(0, 999, 'x')).toThrow()
    expect(f.getText()).toBe('abc')
  })
  it('onChange emits fidelity md after edits', () => {
    const f = createYeliFacade()
    let out = ''
    f.onChange((md) => { out = md })
    f.setText(MD)
    f.insertText('tail')
    expect(out.endsWith('tail')).toBe(true)
  })
})
```

- [ ] **步骤 2：运行确认失败**

运行：`npx vitest run tests/vendor/facade-fidelity.test.mjs`
预期：FAIL，报 `Cannot find module '.../YeliEditorFacade'`。

- [ ] **步骤 3：实现 facade**

`src/components/editor/facade/YeliEditorFacade.ts` 要点：封装 yeli `document/store`、`transactions`、`editor/command-registry`；`setText` 建 store 并整串载入（仅首载）；`getText` 从 store 合成保真 md；`insertText/replaceRange/insertBlock/insertCodeBlock/insertFormula` 走 typed range-aware 事务（越界/非法 revision 抛错）；`onChange` 订阅 store 变更回吐 md；`getSelection/setSelection/focus/scrollToBlock/undo/redo`；`execCommand(name,args)` 透传 command-registry。导出 `createYeliFacade()` 与 `YeliEditorFacade` 类型。类型不泄漏 yeli 内部 model（用 `@internal` 封住，仅暴露 facade 公共方法）。

- [ ] **步骤 4：运行确认通过**

运行：`npx vitest run tests/vendor/facade-fidelity.test.mjs`
预期：PASS（5 个用例）。

- [ ] **步骤 5：Commit**

```bash
git add src/components/editor/facade tests/vendor
git commit -m "feat(editor): YeliEditorFacade 唯一入口 + 保真单元测试"
```

---

## 任务 3：Vendor edit-canvas.tsx + 新编辑器入口

**文件：**
- 创建：`src/vendor/yeli/ui/`（edit-canvas.tsx 及所需 ui 依赖）
- 创建：`src/components/editor/YeliEditor.tsx`
- 修改：`src/App.tsx`（编辑器入口替换）

- [ ] **步骤 1：拷贝 edit-canvas 及其 ui 依赖**

```bash
cp /tmp/opencode/yeli/src/ui/edit-canvas.tsx src/vendor/yeli/ui/edit-canvas.tsx
# 按 audit 结果，补拷 edit-canvas 直接 import 的 ui 模块（如 table-size-picker.tsx、image-block.ts、read-handoff.ts 等）
```

- [ ] **步骤 2：audit edit-canvas 的 import 并处理应用耦合**

```bash
grep -n "^import" src/vendor/yeli/ui/edit-canvas.tsx
```

预期：处理 `src/i18n`、`src/brand`、`src/styles.css`、`@heroicons/react` 等 yeli 应用依赖——i18n/brand 用 lzeditor 本地文案/图标替代，styles.css 的区块画布样式抽取进 `src/styles/`（只取 edit-canvas 相关段）。此步验收：edit-canvas 可被 lzeditor 编译。

- [ ] **步骤 3：实现 YeliEditor.tsx 入口**

`src/components/editor/YeliEditor.tsx`：挂载 `edit-canvas` + `createYeliFacade()`；props 用 `{ md, onChange }` 风格对齐 lzeditor 现有 `LZEditor` 调用面（`md` 输入、`onChange(md)` 输出）；内部经 facade 进出；提供 `focus/insertText/replaceRange/execCommand` 的 ref 暴露，替代原 `getCM6Editor()`。

- [ ] **步骤 4：App.tsx 切换入口**

将 `App.tsx` 中 `LZEditor` 引用换为 `YeliEditor`，保留 `editorContentRef` 但指向 facade（见任务 5）。此步可临时保留 CM6 代码未删，仅切渲染路径。

- [ ] **步骤 5：typecheck + dev 冒烟**

运行：`npm run typecheck` && `npm run dev`（手动打开编辑器编辑一段，确认区块 WYSIWYG 可用、保存后 md 保真）。
预期：typecheck 通过，编辑可用。

- [ ] **步骤 6：Commit**

```bash
git add src/vendor/yeli/ui src/components/editor/YeliEditor.tsx src/App.tsx
git commit -m "feat(editor): 接入 yeli edit-canvas，新编辑器入口替换 CM6 路径"
```

---

## 任务 4：输入辅助 + 区块内特效渲染

**文件：**
- 创建：`src/components/editor/assist/autopair.ts`、`smart-paste.ts`、`typewriter.ts`、`focus-mode.ts`
- 创建：`src/components/editor/render-ext/mermaid.ts`、`katex.ts`、`echarts.ts`、`code-highlight.ts`、`lazy-container.ts`
- 修改：`src/vendor/yeli/render/`（渲染边界扩展：markdown-it 规则注册 + DOMPurify 净化）
- 修改：`src/components/editor/YeliEditor.tsx`（挂载 assist + render-ext）

- [ ] **步骤 1：实现自动配对（autopair.ts）**

keyboard 事件层挂 facade：`(`/`[`/`"`/`**` 等输入走 `insertText` 事务并插闭合符；`Backspace` 空配对删除；在 `tests/vendor/` 补用例（`npx vitest run` 新增 autopair 用例）。

- [ ] **步骤 2：实现智能粘贴（smart-paste.ts）**

paste 事件：clipboard 含图片 → 转 yeli 图片块事务；含 URL → 链接事务；含 TSV → 表格事务（复用 yeli `table-commands`）；否则默认文本粘贴。补用例。

- [ ] **步骤 3：实现打字机跟随 + 专注模式（typewriter.ts / focus-mode.ts）**

监听 facade selection 变化做滚动定位；focus-mode 挂 CSS class 切换。纯视角，不触数据层。补用例（class 切换断言）。

- [ ] **步骤 4：实现渲染边界扩展（render-ext/）**

markdown-it 规则：` ```mermaid `、` ```echarts `、` ```lang `（highlight.js）、`$$...$$`（KaTeX）→ 惰性容器（lazy-container.ts），容器在进入视口/聚焦时才跑 mermaid/echarts 实例化；渲染结果过 DOMPurify；渲染异常降级为 raw 代码块 + 错误提示。注册进 vendor 渲染边界。补用例（`tests/vendor/render-ext.test.mjs`：每种扩展产出惰性容器、异常降级）。

- [ ] **步骤 5：挂载进 YeliEditor + 补测试**

在 `YeliEditor.tsx` 挂载以上模块；运行 `npm run check`。
预期：全绿。

- [ ] **步骤 6：Commit**

```bash
git add src/components/editor/assist src/components/editor/render-ext src/vendor/yeli/render
git commit -m "feat(editor): 输入辅助与区块内特效渲染接入新编辑器"
```

---

## 任务 5：AI 接入点重接

**文件：**
- 修改：`src/App.tsx`、`src/components/layout/editorActions.tsx`、`src/components/layout/Toolbar.tsx`、`src/hooks/useAI.ts`、`src/utils/docImport.ts`、`src/store/editorStore.ts`

- [ ] **步骤 1：把 getCM6Editor() 引用替换为 facade**

```bash
grep -rn "getCM6Editor\|getEditor()\s*(" src --include=*.ts --include=*.tsx
```

逐处替换：`getCM6Editor()?.view.contentDOM` → `getYeliFacade().focus()`；`getCM6Editor()?.setText(...)` → `getYeliFacade().setText(...)`；`getCM6Editor()?.insertText(...)` → `getYeliFacade().insertText(...)`；`getCM6Editor()?.getSelection/...` → facade 对应。`editorStore.editorContentRef` 指向 facade。

- [ ] **步骤 2：AI 流式插入改逐 chunk 事务**

`src/hooks/useAI.ts` 流式：每 chunk 调 `facade.insertText(chunk, anchor)`（anchor 用 `getSelection()` 定位，revision 递增）；快速编辑期间 revision 不匹配则丢弃该 chunk（不覆盖最新）。补用例：流式插入与编辑交错不丢内容（`tests/vendor/facade-fidelity.test.mjs` 增补）。

- [ ] **步骤 3：插代码块 / 公式改 facade**

`editorActions.tsx` / `Toolbar.tsx`：`insertText(\`\n\`\`\`${lang}\n${code}\n\`\`\`\n\n\`)` → `facade.insertCodeBlock(lang, code)`；公式 → `facade.insertFormula(formula)`。

- [ ] **步骤 4：typecheck + AI 手测**

运行：`npm run typecheck`；`npm run dev` 手测 AI 摘要/续写/润色/翻译 + 插代码块/公式。
预期：AI 流式插入正常、编辑不丢字、插入代码块/公式落位正确。

- [ ] **步骤 5：Commit**

```bash
git add src
git commit -m "refactor(ai): AI 接入点重接到 YeliEditorFacade，流式插入走事务管线"
```

---

## 任务 6：删除 CM6 代码与依赖（硬切换收尾）

**文件：**
- 删除：`src/components/editor/codemirror/`、`src/components/editor/CM6Editor.tsx`、`src/components/editor/LZEditor.tsx`
- 修改：`package.json`、`package-lock.json`
- 修改：`src/components/editor/codemirror/registry.ts` 相关残留引用（若有）

- [ ] **步骤 1：删除 CM6 源码文件**

```bash
git rm -r src/components/editor/codemirror src/components/editor/CM6Editor.tsx src/components/editor/LZEditor.tsx
```

- [ ] **步骤 2：移除 CM6/lezer 依赖**

```bash
npm uninstall @codemirror/autocomplete @codemirror/commands @codemirror/lang-markdown \
  @codemirror/language @codemirror/language-data @codemirror/search @codemirror/state \
  @codemirror/view @lezer/common @lezer/highlight @lezer/markdown
```

- [ ] **步骤 3：清理残留引用并全量回归**

```bash
grep -rn "@codemirror\|@lezer\|getCM6Editor" src tests --include=*.ts --include=*.tsx --include=*.mjs || echo CLEAN
npm run check && npm run test:e2e
```

预期：`CLEAN`，check 与 e2e 全绿。

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "feat(editor): 移除 CodeMirror 6 代码与依赖，yeli 区块编辑器上线"
```

---

## 任务 7：保真回归 + 浏览器回归 + 冒烟

**文件：**
- 创建：`tests/vendor/fidelity-regression.test.mjs`
- 修改：`tests/e2e/`（新增输入辅助/特效渲染/AI 交互用例）

- [ ] **步骤 1：写保真回归套件**

`tests/vendor/fidelity-regression.test.mjs`：覆盖 yeli 上游 `smart-write`/`block-projection` 语义——no-edit zero diff、supported-block narrow diff、ambiguous syntax 安全回退、revision-bound stale 拒绝。运行 `npx vitest run tests/vendor/fidelity-regression.test.mjs` 预期 PASS。

- [ ] **步骤 2：写 e2e 交互用例**

`tests/e2e/editor-interactions.spec.ts`：输入辅助（自动配对/智能粘贴/打字机）、区块内特效渲染（mermaid/katex/echarts 惰性渲染与降级）、AI 插入/改写。运行 `npm run test:e2e` 预期 PASS。

- [ ] **步骤 3：全量验证 + Electron 冒烟**

运行：`npm run check` && `npm run test:e2e` && `npm run electron:build:linux`（或当前平台）
预期：全部通过，无 CM6/lezer 依赖残留，bundle 内无 `@codemirror` 模块。

- [ ] **步骤 4：Commit**

```bash
git add tests
git commit -m "test(editor): 保真回归 + 浏览器交互回归 + 冒烟"
```

---

## 自检结论

- **规格覆盖度**：设计 5 节 → 任务 0-7 全部对应（React19=任务0，vendor 逻辑=任务1，facade=任务2，edit-canvas+入口=任务3，输入辅助/特效渲染=任务4，AI 重接=任务5，删 CM6=任务6，测试=任务7）。
- **占位符扫描**：无 TBD/TODO；vendoring 步骤用具体命令 + 钉住 commit，非占位符。
- **类型一致性**：`createYeliFacade`/`getYeliFacade`/`insertText/replaceRange/setText/getText/onChange/insertCodeBlock/insertFormula/getSelection/setSelection/focus/scrollToBlock/undo/redo/execCommand` 在任务 2 定义、任务 4/5/7 复用，命名一致。
