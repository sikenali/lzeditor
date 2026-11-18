# Textus 风格聊天式 AI 面板 — 设计文档

**日期**: 2026-11-18
**状态**: 待实现（设计已确认，下一步写计划）
**范围**: 阶段 1 — 聊天式面板（不含代理/批注/技能）

---

## 1. 意图

把 lzeditor 当前的「浮动改写面板」升级为 **Textus 风格的聊天式面板**：消息列表 + 输入框 + 回复卡片 + 模式切换（write/review/create/research 骨架）。视觉沿用**本项目暗夜霓虹设计语言**，底层**复用现有 useAI 流式请求 + 模型管理**（apiKeys/selectedModelId/temperature/maxTokens）。

用户需求：`ai 的界面需要与 Textus 一样，功能页一样`。经确认：**第一阶段做聊天式 AI 面板**（推荐第一步），**视觉用本项目的暗夜霓虹风格**。

## 2. 目标 / 非目标 / 反目标

### 目标
- 停靠式右侧聊天面板（复用本项目布局/设计 token）
- 模式标签：write / review / create / research（骨架，可切换）
- 消息列表：用户气泡 + AI 回复卡片（**Markdown 渲染**，修复现有纯文本缺口）
- 输入框 + 发送/停止
- 每条回复操作：应用到文档 / 撤销 / 复制
- 复用现有 useAI 流式 + settingsStore 模型管理（不改）
- 会话历史保存在 aiStore（跨开关保留）

### 非目标（后续阶段，本次不做）
- 代理协议（ACP / Claude Code / Codex）
- 边栏批注 / 修订轨迹 / review 注释
- 斜杠技能（`/`）
- paper 模式

### 反目标（绝不破坏）
- 不改模型管理设置（ModelSettingsTab / apiKeys / selectedModelId）
- 不破坏现有快捷键（Ctrl+/）与工具栏/侧栏 AI 按钮
- 不引入 Textus 的设计语言（用本项目暗夜霓虹）

## 3. 约束

- **复用** `useAI.ts` 的 SSE 流式 + `planApply` + `undo` 逻辑（尽量少改）
- **复用** `promptTemplate.ts` 的模板（write 等映射到现有 6 动作）
- **复用** `settingsStore` 的 apiKeys/selectedModelId/temperature/maxTokens
- 新样式用本项目 token（`--color-*`）
- 不引入任何新的依赖（无 ACP / 无 Textus 组件）

## 4. 方案（已选 A）

| 方案 | 描述 | 取舍 | 结论 |
|---|---|---|---|
| **A（选中）** | 停靠式右侧聊天面板 + 复用现有 AI 基建 | 最 Textus 化结构、复用一切可用的、修 markdown 缺口；需重塑 aiStore + 新 CSS | ✅ |
| B | 保留浮动面板仅改内容为聊天式 | 最快但仍是浮层、不像 Textus 停靠、消息列表局促 | ❌ |
| C | vendor Textus `src/ai/chat/` 组件 | 最像 Textus 但带其设计语言 + 代理依赖，违背「本项目设计」 | ❌ |

## 5. 设计细节

### 5.1 AI Store 重塑（`src/store/aiStore.ts`）

```ts
export type AIMode = 'write' | 'review' | 'create' | 'research'

export interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode: AIMode
  // assistant 专属
  status?: 'streaming' | 'done' | 'error' | 'applied'
  error?: string
  applied?: boolean
  applyRecord?: ApplyRecord
}

export interface AIStoreState {
  panelVisible: boolean
  panelPosition: { x: number; y: number } | null
  panelSelectedText: string
  mode: AIMode
  messages: ChatEntry[]
  panelInput: string
  panelStatus: 'idle' | 'thinking' | 'result' | 'error' | 'applied'  // 当前一次发送的状态
  applyHistory: ApplyRecord[]
  lastSelection: ...  // 保留（现有字段）
  showPanel(mode: AIMode, selectedText: string, position): void
  hidePanel(): void
  setMode(m: AIMode): void
  setPanelInput(v: string): void
  setPanelStatus(s): void
  setSelectedText(t: string): void
  addMessage(m: ChatEntry): void
  updateMessage(id, patch): void
  appendStreamToMessage(id, delta): void   // 流式追加，避免整串重写
  recordApply(record): void
  undoLastApply(): void
  getUndoRecord(): ApplyRecord | null
}
```

保留 `applyHistory` / `recordApply` / `undoLastApply`（undo 逻辑不变）。移除旧的 `panelAction`/`panelOutput`/`conversationMessages`（被 `messages` 取代）。

### 5.2 模式映射（骨架）

每个 mode：label / icon / hint（composer placeholder）/ 默认 prompt 模板。

| mode | label | icon | hint | 默认映射（buildPrompt） |
|---|---|---|---|---|
| write | 写作 | ri-pen-nib-line | 改写、润色或续写… | rewrite |
| review | 审校 | ri-eye-2-line | 审校、摘要或提问… | summarize |
| create | 创作 | ri-sparkling-line | 续写、起草… | continue |
| research | 研究 | ri-search-line | 提问、检索… | question |

- 切换 mode：更新 composer placeholder + 新消息打上 mode 标签。
- **快速动作行**保留现有 6 动作（rewrite/polish/continue/summarize/translate/question）作为「下一条发送意图」覆盖默认映射；点击设 `sendAction`，再点取消。这样现有功能不丢、仍可用。

### 5.3 组件（`src/components/editor/AIPanel.tsx` 重写）

```
AIPanel  —— 右侧停靠抽屉（position: fixed; right:0; top/bottom:0; 宽 ~400px; 高 z-index）
├── AIChatHeader   —— 标题 + 模式标签行（write/review/create/research）+ 关闭
├── ChatMessageList —— 可滚动
│   ├── UserBubble   —— 右对齐用户气泡（content + mode 标签）
│   └── AssistantCard —— 左卡片、霓虹绿左边框、Markdown 渲染
│       ├── streaming: 光标闪烁 + 实时渲染
│       ├── error: 错误文案
│       └── done: 回复操作行（应用到文档 / 撤销 / 复制）
└── AIChatComposer
    ├── 快速动作行（6 现有动作，选中高亮）
    ├── textarea + 发送/停止按钮
    └── 选区上下文提示（panelSelectedText 摘要）
```

### 5.4 Markdown 渲染

- 用现有 `mdToHtml()` 渲染 assistant 回复为 Markdown（`dangerouslySetInnerHTML`）。
- 流式期间每个 chunk 追加后重渲染（走 store 的 `appendStreamToMessage`，React 增量更新）。
- 复用现有 prose / read-mode 样式做排版。

### 5.5 useAI 调整（`src/hooks/useAI.ts`）

- `send(action, input, selectedText)` → `send(input, { action, mode })`：
  - 先 `addMessage({ role:'user', ... })` + `addMessage({ role:'assistant', status:'streaming', ... })`
  - 流式 chunk → `appendStreamToMessage(assistantId, delta)`
  - 完成 → `updateMessage(assistantId, { status:'done' })`
  - 出错 → `updateMessage(assistantId, { status:'error', error })`
- `applyToDoc` / `undo` / `copyOutput` 作用于最后一条 assistant 消息（`getUndoRecord` / 最近 applied 消息）。
- 保留 `streamRef` / `planApply` / SSE 解析逻辑不变。

### 5.6 面板打开 / 关闭

- 位置：`position: fixed; right:0; top:0; bottom:0; width:min(420px, 92vw)`，从右侧滑入。
- 开：Toolbar AI 按钮 / LeftNav AI 按钮 / Ctrl+/（现有入口复用，改为 `showPanel(mode, selectedText)`）。
- 关：close 按钮 / Ctrl+/ 再按 / Escape。
- 面板打开时读取当前编辑器选区作为 `panelSelectedText`（现有逻辑）。
- **改签名波及的调用点**（旧的 `showPanel('question', sel, pos)` → `showPanel(mode, sel, pos)`）：
  - `src/App.tsx:175`（toggleAI）
  - `src/components/layout/Toolbar.tsx:81`（openAI，带上当前选区）
  - `src/components/layout/LeftNav.tsx:39`（openAI）
  - `src/components/editor/AIPanel.tsx:147`（快速动作 chip 点击，改为设 sendAction 而非直接 showPanel）
  - 面板内 chip 点击改为「设下一条发送意图」，不再重新 showPanel。

### 5.7 样式（`src/styles/ai-chat.css` 新增，或并入 floating.css）

- 用本项目 token：`--color-bg-elevated` / `--color-border-*` / `--color-primary`（霓虹绿）等。
- 用户气泡右侧（`--color-primary` 淡底），assistant 卡片左侧霓虹绿边框。
- 复用既有 `ai-*` 样式（chip/input/action-btn），新增 chat 布局类。

## 6. 测试

- **aiStore 单元测试**：addMessage / updateMessage / appendStreamToMessage / setMode / 切换。
- **useAI send 测试**：mock fetch，断言 user+assistant 消息追加、流式追加、done/error 状态。
- **AIPanel 渲染测试**：模式标签、消息列表、markdown 回复、快速动作行。
- 保留 `settings-structure`（模型管理 + about）断言不变。
- 不破坏 `cm6-core-boundary`（AI 组件在 `src/components/editor`，不引 Milkdown）。

## 7. 验收清单

- [ ] 右侧停靠聊天面板，暗夜霓虹风格
- [ ] 4 个模式标签可切换，placeholder/消息标签随模式变化
- [ ] 发送 → user 气泡 + assistant 流式卡片（**Markdown 渲染**）
- [ ] 应用到文档 / 撤销 / 复制 可用
- [ ] 停止按钮中断流式
- [ ] 会话历史跨开关保留（messages 持久在 store）
- [ ] 模型管理联动不变（apiKeys/selectedModelId/temperature/maxTokens）
- [ ] 无 API Key 时提示「请先在设置中配置 API Key」
- [ ] typecheck + 全量测试通过
