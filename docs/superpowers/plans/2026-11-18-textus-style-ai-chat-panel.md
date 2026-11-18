# Textus 风格聊天式 AI 面板 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 lzeditor 的浮动改写面板重做为 Textus 风格右侧停靠聊天式 AI 面板（消息列表 + 输入框 + Markdown 回复卡片 + 模式切换骨架），复用现有 useAI 流式与模型管理。

**Architecture:** 重塑 `aiStore`（引入 `messages: ChatEntry[]` + `mode`），`useAI.send` 改为追加消息并流式增量写入 assistant 卡片，`AIPanel` 重写为停靠右侧聊天抽屉（模式标签 + 消息列表 + 输入框 + 快速动作 + 每条回复的应用/撤销/复制）。视觉用本项目暗夜霓虹 token，不引任何新依赖。

**Tech Stack:** React + zustand + TypeScript + Vite；测试 node:test + tsx + happy-dom。

**Spec:** `docs/superpowers/specs/2026-11-18-textus-style-ai-chat-panel-design.md`

## Global Constraints

- 不引入任何新 npm 依赖（无 ACP / 无 Textus 组件 / 无 markdown 库 — 复用现有 `mdToHtml`）。
- 不修改 `ModelSettingsTab` / `settingsStore` 的 apiKeys/selectedModelId/temperature/maxTokens。
- 不破坏 `cm6-core-boundary`（AI 组件留在 `src/components/editor`，不引 Milkdown）。
- 保留 `settings-structure`（模型管理 + about）断言不变。
- 所有新样式用本项目 token（`--color-*`），禁止硬编码色值。
- 现有快捷键 Ctrl+/ 与工具栏/侧栏 AI 按钮继续可开/关面板。

## Review Focus

- 面板在无 API Key 时：发送 → 出现一条 assistant error 卡片「请先在设置中配置 API Key」，不崩溃（Task 2 覆盖）。
- 流式期间点「停止」：assistant 消息停在已收到的内容、状态 done（有内容）或回到 idle（无内容）（Task 2 覆盖）。
- 对「question」这类问答，回复只显示在面板，点「应用到文档」才写入文档（Task 2/3 覆盖）。
- 已 applied 的回复再点「应用到文档」应无操作（不二次插入）（Task 2 覆盖）。
- 空输入不发送；切换模式后 placeholder 与消息 mode 标签随之变化（Task 3 覆盖）。

---

### Task 1: 增量 reshape —— 新增 AIMode/ChatEntry/messages/aiModes（保留旧字段）

**Files:**
- Modify: `src/shared/types.ts` — 新增 `AIMode`、`ChatEntry`；给 `AIStoreState` **新增**字段/方法（**不删旧**）
- Create: `src/shared/aiModes.ts`
- Modify: `src/store/aiStore.ts` — **新增**实现（保留旧字段/方法）
- Test: `tests/ai-chat-store.test.mjs`

**Interfaces:**
- Produces:
  - `export type AIMode = 'write' | 'review' | 'create' | 'research'`
  - `export interface ChatEntry { id: string; role: 'user'|'assistant'; content: string; mode: AIMode; action?: AIAction; status?: 'streaming'|'done'|'error'|'applied'; error?: string; applied?: boolean; applyRecord?: ApplyRecord }`
  - `export const AI_MODES: Record<AIMode, { label: string; icon: string; hint: string; defaultAction: AIAction }>`
  - `AIStoreState` **新增** `mode: AIMode`, `messages: ChatEntry[]`, `setMode`, `setSelectedText`, `addMessage`, `updateMessage`, `appendStreamToMessage`（旧字段保留）
  - `showPanel(mode: AIMode, selectedText: string, position: { x:number;y:number }): void`（旧 `showPanel(action,...)` 保留，二者并存）

- [ ] **Step 1: 写失败测试 `tests/ai-chat-store.test.mjs`**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
const { useAIStore } = await import('../src/store/aiStore.ts')
const { AI_MODES } = await import('../src/shared/aiModes.ts')

test('showPanel 设置 mode/selectedText，保留历史 messages', () => {
  const s = useAIStore.getState()
  s.addMessage({ id: 'u1', role: 'user', content: 'hi', mode: 'write' })
  s.showPanel('review', 'selected', { x: 0, y: 0 })
  const st = useAIStore.getState()
  assert.equal(st.panelVisible, true)
  assert.equal(st.mode, 'review')
  assert.equal(st.panelSelectedText, 'selected')
  assert.equal(st.messages.length, 1, '打开面板不清空历史')
})

test('addMessage/updateMessage/appendStreamToMessage 变更 messages', () => {
  const s = useAIStore.getState()
  s.addMessage({ id: 'a1', role: 'assistant', content: '', mode: 'write', status: 'streaming' })
  s.appendStreamToMessage('a1', 'Hello')
  s.appendStreamToMessage('a1', ' world')
  s.updateMessage('a1', { status: 'done' })
  const m = useAIStore.getState().messages.find(x => x.id === 'a1')
  assert.equal(m.content, 'Hello world')
  assert.equal(m.status, 'done')
})

test('setMode / setSelectedText', () => {
  const s = useAIStore.getState()
  s.setMode('create'); s.setSelectedText('sel')
  const st = useAIStore.getState()
  assert.equal(st.mode, 'create'); assert.equal(st.panelSelectedText, 'sel')
})

test('AI_MODES 含 4 模式与默认动作', () => {
  assert.deepEqual(Object.keys(AI_MODES).sort(), ['create','research','review','write'])
  assert.equal(AI_MODES.write.defaultAction, 'rewrite')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/ai-chat-store.test.mjs`
Expected: FAIL（`useAIStore.getState().addMessage` 不是函数 / `AI_MODES` undefined）

- [ ] **Step 3: 在 `src/shared/types.ts` 增加 `AIMode`、`ChatEntry`；给 `AIStoreState` 新增字段/方法**

- 新增 `AIMode`、`ChatEntry`（见 Interfaces）。
- `AIStoreState` 新增：`mode: AIMode`（初始 `'write'`）、`messages: ChatEntry[]`（初始 `[]`）、`setMode(m: AIMode): void`、`setSelectedText(t: string): void`、`addMessage(m: ChatEntry): void`、`updateMessage(id: string, patch: Partial<ChatEntry>): void`、`appendStreamToMessage(id: string, delta: string): void`。
- 新增 `showPanel(mode: AIMode, selectedText: string, position): void`（**与旧 `showPanel(action,...)` 并存**，见 Step 5 说明）。
- **不删除**任何现有字段/方法（`panelAction`/`panelOutput`/`conversationMessages` 等保留）。

- [ ] **Step 4: 创建 `src/shared/aiModes.ts`**

```ts
import type { AIMode, AIAction } from './types'
export const AI_MODES: Record<AIMode, { label: string; icon: string; hint: string; defaultAction: AIAction }> = {
  write:    { label: '写作', icon: 'ri-pen-nib-line',  hint: '改写、润色或续写…', defaultAction: 'rewrite' },
  review:   { label: '审校', icon: 'ri-eye-2-line',    hint: '审校、摘要或提问…', defaultAction: 'summarize' },
  create:   { label: '创作', icon: 'ri-sparkling-line', hint: '续写、起草…',       defaultAction: 'continue' },
  research: { label: '研究', icon: 'ri-search-line',    hint: '提问、检索…',       defaultAction: 'question' },
}
export const AI_MODE_ORDER: AIMode[] = ['write', 'review', 'create', 'research']
```

- [ ] **Step 5: 在 `src/store/aiStore.ts` 新增实现（保留旧逻辑）**

- 新增 state：`mode: 'write'`, `messages: []`。
- 新增方法：`setMode(m)`, `setSelectedText(t)`, `addMessage(m)`, `updateMessage(id,patch)`, `appendStreamToMessage(id,delta)`（实现见下）。
- `showPanel`：**新增重载** `(mode: AIMode, selectedText: string, position)` → `set({ panelVisible:true, mode, panelSelectedText:selectedText, panelPosition:position, panelStatus:'idle', panelInput:'' })`（**不清空 messages**）。保留旧 `showPanel(action,...)` 不变（旧 AIPanel 仍走它）。
- `addMessage(m)` → `set(s => ({ messages: [...s.messages, m] }))`
- `updateMessage(id, patch)` → `set(s => ({ messages: s.messages.map(x => x.id===id ? { ...x, ...patch } : x) }))`
- `appendStreamToMessage(id, delta)` → `set(s => ({ messages: s.messages.map(x => x.id===id ? { ...x, content: x.content + delta } : x) }))`

- [ ] **Step 6: 运行测试确认通过**

Run: `node --import tsx --test tests/ai-chat-store.test.mjs`
Expected: PASS

- [ ] **Step 7: typecheck + 提交**

Run: `npm run typecheck`
Expected: PASS（新增是纯增量，旧代码不受影响）

```bash
git add src/shared/types.ts src/shared/aiModes.ts src/store/aiStore.ts tests/ai-chat-store.test.mjs
git commit -m "feat(ai): 聊天式 store 增量 — AIMode/ChatEntry/messages + aiModes 元数据"
```

---

### Task 2: useAI 聊天式发送（追加消息 + 流式增量）

**Files:**
- Modify: `src/hooks/useAI.ts`
- Test: `tests/ai-chat-useai.test.mjs`

**Interfaces:**
- Consumes: `AI_MODES`, `ChatEntry`, `useAIStore`（`mode`, `messages`, `addMessage`, `updateMessage`, `appendStreamToMessage`, `setPanelStatus`, `getUndoRecord`, `undoLastApply`）, `getEditorFacade`, `planApply`, `buildPrompt`, `parseMdOutline`, `outlineToMarkdownTree`
- Produces: `send(input: string, action?: AIAction): Promise<void>`（action 缺省用 `AI_MODES[store.mode].defaultAction`）；`applyToDoc()`/`undo()`/`copyOutput()` 作用于最后一条未 applied 的 done assistant 消息（**仍同步写旧 `panelOutput`/`panelStatus`，保旧 AIPanel 可用**）

- [ ] **Step 1: 写失败测试 `tests/ai-chat-useai.test.mjs`**

用 happy-dom + 全局 `fetch` mock（参考 `tests/ui-interactions.test.mjs` 的 Window 设置）。断言：
1. 无 API Key：`send('hello')` → 新增一条 `{role:'assistant', status:'error', error:'请先在设置中配置 API Key'}`，无 user 消息。
2. 有 Key（mock fetch 返回 SSE 流）：`send('hello','rewrite')` → 依次新增 user 消息 + assistant streaming 消息；流式 chunk 追加到 assistant.content；结束后 assistant.status==='done'。
3. `applyToDoc`：对 done assistant 消息调用，`getUndoRecord()` 返回记录，assistant 标记 `applied:true`、`status:'applied'`。
4. 已 applied 再 `applyToDoc`：无操作（记录数不变）。
5. 流式中断（fetch abort 后无内容）：assistant.status 回 'idle'。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/ai-chat-useai.test.mjs`
Expected: FAIL（`send` 不追加消息）

- [ ] **Step 3: 修改 `src/hooks/useAI.ts` 的 `send`**

- 新增签名重载/兼容：`const send = useCallback(async (input: string, action?: AIAction) => {...}, [])`（现有调用 `send(state.panelAction||'question', input, sel)` 由 AIPanel 在 Task 3 改；本任务新增 `send(input, action)` 形态，旧形态暂保留或内部适配）。
- 开头：`const store = useAIStore.getState(); const mode = store.mode; const effAction = action ?? AI_MODES[mode].defaultAction`
- 无 Key 分支：`store.addMessage({ id, role:'assistant', content:'', mode, status:'error', error:'请先在设置中配置 API Key' }); store.setPanelStatus('error'); return`（并保持旧 `setPanelError` 写入，Task 3 移除）。
- 有 Key：`store.addMessage({ id: uid(), role:'user', content:input, mode })`；`const aid = uid(); store.addMessage({ id: aid, role:'assistant', content:'', mode, action: effAction, status:'streaming' })`
- 构建 prompt（用 `effAction` 与 `vars`，逻辑同现状）；流式 chunk → `store.appendStreamToMessage(aid, delta)`；**保留** `streamIntoDoc`（现有 live-insert 管线不动，`planApply` 靠 `streamRef` 去重）。
- 完成：`store.updateMessage(aid, { status: accumulated ? 'done' : 'idle' })`；异常：`store.updateMessage(aid, { status:'error', error })`。
- 保留 `streamRef` / SSE 解析 / `scrubSecrets` / abort 处理；仍写旧 `panelOutput`/`panelStatus`（Task 3 移除）。

- [ ] **Step 4: 修改 `applyToDoc` / `undo` / `copyOutput`（作用于最后一条 assistant 消息）**

- `applyToDoc`：取 `messages` 中**最后一条** `role==='assistant' && status==='done' && !applied`；若无则 return；`planApply(facade, streamRef.current, msg.content, msg.action ?? 'question')`；`recordApply(plan.record)`；`updateMessage(msg.id, { applied:true, status:'applied', applyRecord: plan.record })`；无 facade 分支保持仅标记 applied。
- `undo`：`getUndoRecord()`；回滚文档（现有 replaceRange 逻辑）；找到 `messages` 里 `applyRecord?.id === record.id` 的消息 → `updateMessage(id, { applied:false, status:'done', applyRecord: undefined })`；`undoLastApply()`；`setPanelStatus('result')`。
- `copyOutput`：复制最后一条 done/applied assistant 消息的 content。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --import tsx --test tests/ai-chat-useai.test.mjs`
Expected: PASS

- [ ] **Step 6: typecheck + 提交**

Run: `npm run typecheck`
Expected: PASS（旧 AIPanel 仍可用，因为它读 `panelOutput`/`panelStatus`，useAI 仍写这些）

```bash
git add src/hooks/useAI.ts tests/ai-chat-useai.test.mjs
git commit -m "feat(ai): useAI 聊天式发送 — 追加消息/流式增量/done-error 状态，apply-undo 作用于最后回复"
```

---

### Task 3: AIPanel 聊天 UI + 样式 + 调用点 + 移除旧 store 字段

**Files:**
- Rewrite: `src/components/editor/AIPanel.tsx`
- Create: `src/styles/ai-chat.css`
- Modify: `src/main.tsx` — 新增 `import './styles/ai-chat.css'`
- Modify: `src/hooks/useAI.ts` — 移除旧 `panelOutput`/`panelError`/`panelStatus` 冗余写入
- Modify: `src/shared/types.ts` + `src/store/aiStore.ts` — 移除旧字段/方法（`panelAction`, `panelOutput`, `panelError`, `conversationMessages`, `setPanelOutput`, `setPanelError`, `appendConversation`, 旧 `showPanel(action,...)`）
- Modify: `src/App.tsx:175`, `src/components/layout/Toolbar.tsx:81`, `src/components/layout/LeftNav.tsx:39` — `showPanel('write',...)`
- Test: `tests/ai-chat-panel.test.mjs`

**Interfaces:**
- Consumes: `useAIStore`（`messages`, `mode`, `panelInput`, `panelStatus`, `panelSelectedText`, `setMode`, `setPanelInput`, `setPanelStatus`, `addMessage` 等）, `useAI().send/stop/applyToDoc/undo/copyOutput`, `AI_MODES`, `AI_MODE_ORDER`, `mdToHtml`, `getEditorFacade`

- [ ] **Step 1: 写失败测试 `tests/ai-chat-panel.test.mjs`**

happy-dom 渲染（参考 `ui-interactions.test.mjs` 的 Window/createRoot/act 设置），动态 `await import('../src/components/editor/AIPanel.tsx')`。mock `useAIStore`（预置 `panelVisible:true`, `mode:'write'`, `messages:[user, assistant done]`）。断言：
1. 渲染 4 个模式标签（写作/审校/创作/研究），当前 mode 高亮。
2. 消息列表含 user 气泡与 assistant 卡片；assistant 卡片含「应用到文档 / 撤销 / 复制」按钮。
3. 点击模式「审校」→ placeholder 变化（`AI_MODES.review.hint`）。
4. assistant 回复用 `mdToHtml` 渲染（断言卡片内出现渲染后的 HTML 片段，如 `<p>`/`<strong>`）。
5. 快速动作行含 6 个动作（改写/润色/续写/摘要/翻译/提问）。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/ai-chat-panel.test.mjs`
Expected: FAIL（组件不渲染 / 无模式标签）

- [ ] **Step 3: 重写 `src/components/editor/AIPanel.tsx`**

结构（右侧停靠抽屉，`position: fixed; right:0; top:0; bottom:0; width:min(420px,92vw)`）：
```
AIPanel
├── AIChatHeader: 标题「AI 助手」+ 模式标签行（AI_MODE_ORDER 映射 AI_MODES，active=当前 mode）+ 关闭
├── ChatMessageList（scroll）:
│   ├── UserBubble: 右对齐气泡，显示 content + mode 标签
│   └── AssistantCard: 左卡片（霓虹绿左边框）; streaming→内容+光标; error→error 文案;
│        done/applied→Markdown 渲染（mdToHtml+`dangerouslySetInnerHTML`）+ 操作行
│        （应用到文档→applyToDoc / 撤销→undo / 复制→copyOutput）
└── AIChatComposer:
    ├── 快速动作行（rewrite/polish/continue/summarize/translate/question → 设 sendAction，高亮选中）
    ├── textarea（placeholder=AI_MODES[mode].hint）+ 发送/停止按钮（panelStatus==='thinking' 显示停止）
    └── 选区上下文提示（panelSelectedText 摘要，非空时）
```
- `sendAction` 用本地 `useState<AIAction|null>(null)`；点动作 chip 切换；发送后重置。
- 发送：`send(input, sendAction ?? undefined)`；空输入禁用；streaming 时发送禁用、显示停止。
- `useEffect`：panelVisible 时读 `getEditorFacade()` 选区填入 `setSelectedText`。

- [ ] **Step 4: 创建 `src/styles/ai-chat.css`**

- `.ai-chat-panel`: `position:fixed; right:0; top:0; bottom:0; width:min(420px,92vw); background:var(--color-bg-elevated); border-left:1px solid var(--color-border-soft); display:flex; flex-direction:column; z-index:100;`
- `.ai-chat-header` / `.ai-chat-mode`（tab，active=`--color-primary` 淡底）/ `.ai-chat-close`
- `.ai-chat-messages`（flex:1; overflow-y:auto; padding）; `.ai-chat-user-bubble`（右对齐，`--color-primary` 淡底圆角）; `.ai-chat-assistant-card`（左，`border-left:2px solid var(--color-primary)`，背景 `--color-bg-secondary`，圆角）
- `.ai-chat-reply`（Markdown 排版，复用 prose 字号/行高）; `.ai-chat-actions`（应用到文档/撤销/复制，`--color-primary` 主按钮 + 次按钮）
- `.ai-chat-composer`（textarea + send/stop）; `.ai-chat-quick`（动作 chip，active 高亮）; `.ai-chat-context`（选区提示，`--color-text-muted`）
- 禁止硬编码色值，全部用 `var(--color-*)`。

- [ ] **Step 5: 移除旧 store 字段 + useAI 冗余写入 + 更新调用点**

- `src/shared/types.ts` `AIStoreState`：删除 `panelAction`, `panelOutput`, `panelError`, `conversationMessages`, `setPanelOutput`, `setPanelError`, `appendConversation`, 旧 `showPanel(action,...)`；保留 `showPanel(mode, selectedText, position)`。
- `src/store/aiStore.ts`：删除对应实现；`showPanel` 只剩新签名（不设 `panelAction`）。
- `src/hooks/useAI.ts`：删除对 `panelOutput`/`panelError`/`setPanelOutput`/`setPanelError` 的写入（错误文案改经 `updateMessage`）。
- `src/App.tsx:175`：`s.showPanel('question', '', {...})` → `s.showPanel('write', '', {...})`
- `src/components/layout/Toolbar.tsx:81`：`s.showPanel('question', sel, {...})` → `s.showPanel('write', sel, {...})`
- `src/components/layout/LeftNav.tsx:39`：`s.showPanel('question', '', {...})` → `s.showPanel('write', '', {...})`
- `src/main.tsx`：新增 `import './styles/ai-chat.css'`

- [ ] **Step 6: 运行测试确认通过**

Run: `node --import tsx --test tests/ai-chat-panel.test.mjs`
Expected: PASS

- [ ] **Step 7: typecheck + 全量测试 + 提交**

Run: `npm run typecheck && npm run test`
Expected: typecheck 0 错误；全量 `# fail 0`（含既有 `settings-structure`、`cm6-core-boundary`）。

```bash
git add src/components/editor/AIPanel.tsx src/styles/ai-chat.css src/main.tsx src/hooks/useAI.ts src/shared/types.ts src/store/aiStore.ts src/App.tsx src/components/layout/Toolbar.tsx src/components/layout/LeftNav.tsx tests/ai-chat-panel.test.mjs
git commit -m "feat(ai): Textus 风格聊天式 AI 面板（模式标签/消息列表/Markdown 回复/快速动作）"
```

---

## Self-Review Notes

- **Spec 覆盖**：§5.1 store（Task 1）、§5.2 模式映射（Task 1 `aiModes` + Task 3 标签）、§5.3 组件（Task 3）、§5.4 Markdown（Task 3）、§5.5 useAI（Task 2/3）、§5.6 调用点（Task 3）、§5.7 样式（Task 3）、§6 测试（各 Task）、§7 验收（各 Task）— 全覆盖。
- **类型一致性**：`AIMode`/`ChatEntry`/`AI_MODES`/`AI_MODE_ORDER` 在 Task 1 定义，Task 2/3 引用同一名称；`showPanel(mode, selectedText, position)` 三处调用点一致；`send(input, action?)` 在 Task 2 定义、Task 3 调用一致。
- **任务独立性**：Task 1 纯增量（编译+无回归）；Task 2 useAI 仍写旧 `panelOutput` 故旧 AIPanel 不回归（编译+无回归）；Task 3 替换 AIPanel 并清理旧字段（编译+无回归）。每任务可独立提交。
- **Review Focus 五项**：无 Key（Task 2 测试 1）、停止流式（Task 2 测试 5）、question 不自动写文档（Task 2 streamIntoDoc 保留 + apply 才写）、已 applied 再应用无操作（Task 2 测试 4）、空输入不发送 + 模式 placeholder（Task 3 测试 3）。
