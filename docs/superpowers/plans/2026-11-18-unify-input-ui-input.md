# 统一输入框为 ui-input（去掉 ui-input-control） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 去掉 `ui-input-control` 内层类，改用 `.ui-input input` 后代选择器（放进 `.ui-input` 的 `<input>` 自动无边框、透明底）；查找/替换改用 `ui-input` 容器并删除重复的 `.search-input-group`/`.search-input` 样式。

**Architecture:** `ui-input` 容器保留（带边框 42px 盒，视觉等同文档库 `library-url-input`），内层 `<input>` 不再需要 `ui-input-control` 类——由 `.ui-input input` 后代选择器统一定型。查找/替换的「查找」「替换」标签作为 `.ui-input` 内的前缀 `<span>` 保留，内层 `<input>` 无 class。

**Tech Stack:** React 19 + TypeScript, 原生 CSS（无 Tailwind），测试用 `node:test`（`npm run test`）。

**Spec:** `docs/superpowers/specs/2026-11-18-unify-input-ui-input-design.md`

## Global Constraints

- §8.2 基线不变：`.ui-input` 容器 `height:42px`、`border:0.7px solid var(--color-border)`、`background:var(--color-bg-secondary)`、`border-radius:var(--radius-md)`、focus `background:var(--color-bg-white)` + `border-color:var(--color-primary)`；`.ui-input input` 无边框、透明底、`font-size:var(--text-md)`、`color:var(--color-text-primary)`、`::placeholder`/`:disabled` 用 `var(--color-text-muted)`。
- 不改 `--text-md`（14px）font-size 体系；不改 `library-folder-rename-input` 的 34px 紧凑例外。
- 不引入「单个带边框 input」替代 `ui-input` 容器结构（会破坏 prefix/clear/suffix 与 find/replace 的标签前缀）。

## Review Focus

1. **查找/替换回退**：若有人把 SearchPanel 改回 `.search-input-group`/`.search-input`，`input-css-boundary` 里新增的「查找/替换统一走 ui-input」断言必须失败——Task 2 的测试。
2. **`.ui-input` 内非主输入元素**：`.ui-input input` 后代选择器会命中容器内所有 `<input>`；目前只有主输入一个，但若未来加第二个 input 会同样无边框——可接受，Task 1 注释说明。
3. **占位符/禁用色**：`.ui-input input::placeholder`/`:disabled` 必须仍是 `--color-text-muted`，否则 §8.2 漂移——Task 1 测试。
4. **深色主题 find/replace 文字色**：原 `.search-input{color:var(--t-fg-16)}` 随 `.search-input` 删除后，find/replace 输入走 `.ui-input input` 的 `--color-text-primary`——视觉一致，Task 2 验证。

---

### Task 1: 去掉 ui-input-control，改用 `.ui-input input` 后代选择器

**Files:**
- Modify: `src/styles/ui.css:138-149`（`.ui-input-control` 三条规则）
- Modify: `src/components/ui/UiInput.tsx:53`（去掉内层 `<input>` 的 className）
- Modify: `tests/input-css-boundary.test.mjs:40`（CHECKS[0].placeholder 选择器）

**Interfaces:**
- Consumes: 无（`ui-input` 容器规则已存在）
- Produces: `.ui-input input` 后代选择器，供 Task 2 的 find/replace 直接复用。

- [ ] **Step 1: 更新测试——CHECKS[0] 的 placeholder 选择器改指 `.ui-input input`**

`tests/input-css-boundary.test.mjs` 第 40 行：
```js
{ name: '.ui-input（UiInput 组件，md 基线）', css: uiCss, sel: '.ui-input  {', focus: '.ui-input:focus-within  {', height: 42, placeholder: '.ui-input input::placeholder  {' },
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --import tsx --test tests/input-css-boundary.test.mjs`
Expected: FAIL——`ui.css` 仍是 `.ui-input-control::placeholder`，`.ui-input input::placeholder` 声明块为空，placeholder 断言不匹配。

- [ ] **Step 3: `ui.css` 把 `.ui-input-control` 改为 `.ui-input input` 后代选择器**

`src/styles/ui.css:138-149`，三处选择器替换（属性不变）：
- `.ui-input-control  {` → `.ui-input input  {`
- `.ui-input-control::placeholder  { color: var(--color-text-muted); }` → `.ui-input input::placeholder  { color: var(--color-text-muted); }`
- `.ui-input-control:disabled  { color: var(--color-text-muted); }` → `.ui-input input:disabled  { color: var(--color-text-muted); }`

- [ ] **Step 4: `UiInput.tsx` 去掉内层 `<input>` 的 `className="ui-input-control"`**

`src/components/ui/UiInput.tsx:53`，删除 `className="ui-input-control"`，保留其余 `<input>` 属性。

- [ ] **Step 5: 运行测试，确认通过**

Run: `node --import tsx --test tests/input-css-boundary.test.mjs`
Expected: PASS（`.ui-input input::placeholder` 匹配 `--color-text-muted`）

- [ ] **Step 6: 提交**

```bash
git add src/styles/ui.css src/components/ui/UiInput.tsx tests/input-css-boundary.test.mjs
git commit -m "refactor(ui): 去 ui-input-control，改用 .ui-input input 后代选择器定型内层输入"
```

---

### Task 2: 查找/替换统一走 `ui-input` 容器，删除 `.search-input-group`/`.search-input`

**Files:**
- Modify: `src/components/panels/SearchPanel.tsx:149,167`（`.search-input-group` → `ui-input`；内层 `<input>` 去 `search-input` 类）
- Modify: `src/styles/panels.css:930-951`（删 `.search-input-group`、`.search-input-group:focus-within`、`.search-input`、`.search-input::placeholder`）与 `:1204-1206`（删 `.search-input { color: var(--t-fg-16); }`）
- Modify: `tests/input-css-boundary.test.mjs:41,71-79,103-107`（移除 `.search-input-group` 检查项、「只定义一次」测试；新增「查找/替换统一走 ui-input」断言）

**Interfaces:**
- Consumes: Task 1 的 `.ui-input input` 后代选择器（find/replace 内层 `<input>` 无需 class 即无边框）。
- Produces: 无新接口；`.search-input-group`/`.search-input` 类从此不存在。

- [ ] **Step 1: 更新测试——删 `.search-input-group` 检查项、删「只定义一次」测试、新增统一断言**

`tests/input-css-boundary.test.mjs`：
1. 第 41 行：删除 `{ name: '.search-input-group（查找/替换）', ... }` 整行（find/replace 现由 CHECKS[0] 的 `.ui-input` 覆盖）。
2. 第 103-107 行：删除「`.search-input-group` 只允许定义一次」整个 `test(...)`。
3. 新增断言（放在「三处手写输入框不再用遗留 token」测试之后）：
```js
const searchPanelSrc = read('src/components/panels/SearchPanel.tsx')
test('查找/替换统一走 ui-input，不再用 search-input-group/search-input', () => {
  assert.match(searchPanelSrc, /className="ui-input"/, '查找/替换输入组应使用 ui-input 容器')
  assert.ok(!searchPanelSrc.includes('search-input-group'), '不应再用 search-input-group')
  assert.ok(!searchPanelSrc.includes('className="search-input"'), '不应再用独立的 search-input 类')
})
```
（`search-input-label` 保留；`className="search-input"` 因闭合引号不会误匹配 `search-input-label`。）

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --import tsx --test tests/input-css-boundary.test.mjs`
Expected: FAIL——SearchPanel 仍用 `search-input-group`/`search-input`，新增断言不匹配。

- [ ] **Step 3: `SearchPanel.tsx` 改两处输入组为 `ui-input` 容器，内层 `<input>` 去 class**

`src/components/panels/SearchPanel.tsx:148-159` 与 `:166-176`：
```jsx
<div className="ui-input">
  <span className="search-input-label">查找</span>
  <input ... />  {/* 去掉 className="search-input" */}
</div>
```
（替换：`className="search-input-group"` → `className="ui-input"`；两处 `<input className="search-input"` → `<input`。）

- [ ] **Step 4: `panels.css` 删除重复的 `.search-input-group` / `.search-input` 规则**

`src/styles/panels.css`：
- 第 930-940 行：删 `.search-input-group`、`.search-input-group:focus-within` 两条规则（保留注释块与 `.search-input-label`）。
- 第 945-951 行：删 `.search-input`、`.search-input::placeholder`。
- 第 1204-1206 行：删 `.search-input { color: var(--t-fg-16); }`。

- [ ] **Step 5: 运行测试，确认通过**

Run: `node --import tsx --test tests/input-css-boundary.test.mjs`
Expected: PASS（find/replace 断言通过；其余 §8.2 断言仍通过）

- [ ] **Step 6: 提交**

```bash
git add src/components/panels/SearchPanel.tsx src/styles/panels.css tests/input-css-boundary.test.mjs
git commit -m "refactor(search): 查找/替换统一走 ui-input 容器，删 search-input-group/search-input 重复样式"
```
