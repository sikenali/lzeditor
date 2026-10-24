# Phase 0 快修项 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完成规格 Phase 0 全部快修点：toolbar 间距收紧、welcome-icon 去线框、ui 控件对齐 DESIGN.md、meta-tabs 条件显示、新建菜单项改名。

**架构：** 纯 CSS / 小范围 TSX 改动，不动数据流与 TipTap 内核（Phase 1 处理）。

**技术栈：** CSS、React（既有代码库）；tsx loader 仅用于新结构测试命令

**规格来源：** `docs/superpowers/specs/2026-10-24-lzeditor-cm6-integration-design.md`（D7 节 + 点 1）

---

### 任务 1：toolbar 三组图标间距收紧

**文件：**
- 修改：`src/styles/layout.css:32-48`

- [ ] **步骤 1：修改 gap 值（仅动间距，不动按钮宽度与结构）**

```css
.navtop .toolbar-group {
  gap: 4px;
}
/* 20 个工具栏按钮均为固定宽度，窄屏下会整排溢出、把「导出/设置」推出可视区。
   按断点收窄按钮宽度，保证任意常见屏宽下都能完整排下。 */
@media (max-width: 1720px) {
  .navtop .toolbar-btn { width: 66px; }
  .navtop .toolbar-group { gap: 3px; }
}
@media (max-width: 1480px) {
  .navtop .toolbar-btn { width: 56px; }
  .navtop .toolbar-group { gap: 3px; }
}
@media (max-width: 1300px) {
  .navtop .toolbar-btn { width: 48px; }
  .navtop .toolbar-group { gap: 2px; }
  .navtop .toolbar-label { font-size: 11px; }
}
```

- [ ] **步骤 2：运行结构测试确认无回归**

运行：`npm test`
预期：全部 PASS

- [ ] **步骤 3：Commit**

```bash
git add src/styles/layout.css
git commit -m "style(toolbar): 收紧三组按钮间距并保持断点协调"
```

---

### 任务 2：welcome-icon 去线框，logo 直接显示

**文件：**
- 修改：`src/styles/welcome-screen.css:23-49`
- 修改：`src/components/layout/WelcomeScreen.tsx:36-40`
- 测试：`tests/welcome-icon.test.mjs`（新建）

- [ ] **步骤 1：编写失败的结构测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/welcome-screen.css', import.meta.url), 'utf8')
const tsx = readFileSync(new URL('../src/components/layout/WelcomeScreen.tsx', import.meta.url), 'utf8')

assert.doesNotMatch(css, /\.welcome-icon\s*\{[^}]*box-shadow/, 'welcome-icon 不应再有外框投影')
assert.doesNotMatch(css, /\.welcome-icon-inner/, 'welcome-icon-inner 不应保留')
assert.doesNotMatch(tsx, /welcome-icon-inner/, 'WelcomeScreen 标记中不应有内嵌方块')
assert.match(tsx, /className="welcome-icon-logo"/, 'logo 直接展示')
console.log('welcome icon structure ok')
```

- [ ] **步骤 2：运行确认失败**

运行：`node --import tsx --test tests/welcome-icon.test.mjs`
预期：FAIL（box-shadow / inner 仍存在）

- [ ] **步骤 3：修改 CSS**

替换 `welcome-screen.css` 中 `.welcome-icon`、`.welcome-icon-inner`、`.welcome-icon-logo` 三段为：

```css
/* 应用图标：无外框，logo 直接展示 */
.welcome-icon-logo {
  width: 64px;
  height: 64px;
  display: block;
}
```

- [ ] **步骤 4：修改 WelcomeScreen.tsx 标记**

原（36-40 行）：

```tsx
<div className="welcome-icon">
  <div className="welcome-icon-inner">
    <img className="welcome-icon-logo" src="/logo.svg" alt="LZEditor" />
  </div>
</div>
```

改为：

```tsx
<img className="welcome-icon-logo" src="/logo.svg" alt="LZEditor" />
```

- [ ] **步骤 5：运行测试确认通过**

运行：`node --import tsx --test tests/welcome-icon.test.mjs`
预期：`welcome icon structure ok`

- [ ] **步骤 6：Commit**

```bash
git add src/styles/welcome-screen.css src/components/layout/WelcomeScreen.tsx tests/welcome-icon.test.mjs
git commit -m "style(welcome): logo 去线框直接展示"
```

---

### 任务 3：ui 控件对齐 DESIGN.md（focus 主色边框 + 外发光）

**文件：**
- 修改：`src/styles/ui.css:442`（🗎 焦点规则统一）
- 测试：`tests/ui-controls-designmd.test.mjs`（新建）

对照规源：`/home/jingle/opc/DESIGN.md` §8.2（42px 高、0.7px solid var(--color-border)、bg-secondary、10px 圆角——现有 ui-input/ui-select 基础值已达标，无需改）与 §10.2「输入框 focus 时有主色边框 + 外发光」——**当前缺失**。

- [ ] **步骤 1：编写失败的结构测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/ui.css', import.meta.url), 'utf8')

assert.match(css, /\.ui-input:focus-within[\s\S]{0,200}?box-shadow/, 'ui-input focus-within 必须有外发光（DESIGN.md §10.2）')
assert.match(css, /\.ui-select-trigger:focus[\s\S]{0,400}?box-shadow/, 'ui-select-trigger focus 必须有外发光')
console.log('ui controls conform to DESIGN.md')
```

- [ ] **步骤 2：运行确认失败**

运行：`node --import tsx --test tests/ui-controls-designmd.test.mjs`
预期：FAIL（现有 focus 规则无 box-shadow）

- [ ] **步骤 3：追加统一 focus 规则**

阅读 `ui.css:435-448` 现有 focus-visible 规则，在其后追加：

```css
/* DESIGN.md §10.2：focus 主色边框 + 外发光 */
.ui-input:focus-within,
.ui-select-trigger:focus,
.ui-select-trigger:focus-visible {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
```

- [ ] **步骤 4：暗色模式抽检**

运行 `npm run dev`，切暗色主题（theme 选择器在设置弹窗），目视核对设置弹窗中输入框/开关/下拉的边框与 focus 可读性。若 `--color-primary` 暗色亮度 < `#E05050`，在 color-tokens.css 暗色分支中提高亮度。

- [ ] **步骤 5：运行测试确认通过**

运行：`node --import tsx --test tests/ui-controls-designmd.test.mjs && npm test`
预期：全部 PASS

- [ ] **步骤 6：Commit**

```bash
git add src/styles/ui.css tests/ui-controls-designmd.test.mjs
git commit -m "style(ui): 输入类控件补齐 focus 主色外发光对齐 DESIGN.md §10.2"
```

---

### 任务 4：meta-tabs 仅在打开文档时显示

**文件：**
- 修改：`src/components/layout/DocumentMetaBar.tsx`
- 测试：`tests/meta-tabs-visibility.test.mjs`（新建）

- [ ] **步骤 1：编写失败的结构测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/components/layout/DocumentMetaBar.tsx', import.meta.url), 'utf8')
assert.match(src, /showWelcome/, 'DocumentMetaBar 必须感知 showWelcome')
assert.match(src, /activeDocId/, 'DocumentMetaBar 必须感知 activeDocId')
console.log('meta-tabs visibility guarded')
```

- [ ] **步骤 2：运行确认失败**

运行：`node --import tsx --test tests/meta-tabs-visibility.test.mjs`
预期：FAIL

- [ ] **步骤 3：修改组件**

在 `DocumentMetaBar.tsx` 的组件体 store 取值区加入（store import 名以文件实际为准）：

```tsx
const showWelcome = useEditorStore((s: any) => s.showWelcome)
const activeDocId = useEditorStore((s: any) => s.activeDocId)
const docs = useEditorStore((s: any) => s.docs)
const hasDoc = !!activeDocId && docs.length > 0
if (showWelcome || !hasDoc) return null
```

- [ ] **步骤 4：默认 WelcomeScreen 验证**

`editorStore.ts:88` 已有 `showWelcome: !welcomeSeen`（首次启动为 true），`App.tsx:374` 在 showWelcome 时渲染 WelcomeScreen。手动验证（`npm run dev` + 清 session）：首次打开 → WelcomeScreen 且无 meta-tabs；点「新建文档」→ meta-tabs 出现。

- [ ] **步骤 5：运行测试确认通过**

运行：`node --import tsx --test tests/meta-tabs-visibility.test.mjs && npm test`
预期：全部 PASS

- [ ] **步骤 6：Commit**

```bash
git add src/components/layout/DocumentMetaBar.tsx tests/meta-tabs-visibility.test.mjs
git commit -m "feat(meta): 未打开文档时隐藏 meta-tabs，欢迎页默认呈现"
```

---

### 任务 5：新建菜单第 2 项改名「新建文件-模板」

**文件：**
- 修改：`src/components/layout/editorActions.tsx:15`

- [ ] **步骤 1：修改 label**

```ts
export const NEW_ITEMS: MenuItem[] = [
  { icon: 'ri-file-add-line', label: '新建文档', action: 'new' },
  { icon: 'ri-folder-open-line', label: '新建文件-模板', action: 'open' },
  { icon: 'ri-folder-line', label: '打开文件夹…', action: 'openFolder' },
]
```

（`action: 'open'` 现有行为 = 打开 FilePanel（含模板搜索），语义即「新建文件-模板」，不改逻辑。）

- [ ] **步骤 2：类型检查 + 测试**

运行：`npm run typecheck && npm test`
预期：全部 PASS

- [ ] **步骤 3：Commit**

```bash
git add src/components/layout/editorActions.tsx
git commit -m "feat(new-menu): 第 2 项改为「新建文件-模板」"
```
