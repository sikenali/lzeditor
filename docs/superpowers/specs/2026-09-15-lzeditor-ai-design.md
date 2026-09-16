# lzeditor AI 集成设计文档

**日期**: 2026-09-15
**状态**: 待实现
**设计来源**: Calicat 原型（暗夜霓虹风格，6 个页面）

---

## 1. 项目概述

lzeditor 是一款集成 AI 写作助手功能的 Markdown 编辑器。在原有暗夜霓虹风格的编辑器原型基础上，新增内联 AI 交互能力，通过浮动工具栏 + 内联面板的方式，让用户在编辑过程中随时获得 AI 辅助。

### 核心决策

| 决策项 | 选择 |
|--------|------|
| AI 功能定位 | AI 写作助手（改写/润色/续写/摘要/翻译/提问） |
| AI 交互方式 | 内联 AI 输入（选中文字触发浮动工具栏） |
| AI 能力范围 | 选中改写/润色、智能写作建议、内容分析/转换、光标位置续写 |
| 技术栈 | Web 优先（React + TipTap），后续打包为 Electron |
| AI 后端 | 外部 API（支持 Claude/GPT-4/通义千问/自定义） |
| UI 风格 | 延续暗夜霓虹风格，霓虹绿 #39FF9E 作为强调色 |
| 图标库 | RemixIcon |

---

## 2. 整体架构

### 应用窗口结构

```
┌─────────────────────────────────────────────────────────────────┐
│  窗口标题栏（跨平台自适应）                                       │
│  macOS: [红][黄][绿] 控制按钮    文档标题         同步状态        │
│  Windows: 文档标题（居中）                           [最小化][关闭]│
│  Linux:  控制按钮    文档标题                     [最小化][关闭] │
├─────────────────────────────────────────────────────────────────┤
│  图标工具栏                                                     │
│  [文库][文件][大纲][预览]   [图片][链接][代码][表格]   [AI][阅读][历史][导出][设置] │
├─────────────────────────────────────────────────────────────────┤
│  文档元信息条                                                   │
│  文件路径 | 格式徽章 | 状态徽章                                  │
├─────────────────────────────────────────────────────────────────┤
│  文档编辑区（TipTap 渲染）                                       │
│                                                                 │
│    ## 项目规划                                                   │
│    本文档描述了...                                                │
│    选中这段文字 → 浮动工具栏出现                                  │
│    [✏️改写][💎润色][➕续写][📋摘要][🌐翻译][💬提问]               │
│                                                                 │
│    ┌────────────────────────────────────────────────────────┐   │
│    │  [改写] [润色] [续写] [摘要] [翻译]  🔵 改写为更正式的风格...│   │
│    │  ─────────────────────────────────────────────────────  │   │
│    │  经过专业改写，原文表达更加清晰且富有层次感...             │   │
│    │  ─────────────────────────────────────────────────────  │   │
│    │  [✓ 应用到文档] [↩ 撤销] [📋 复制]                       │   │
│    └────────────────────────────────────────────────────────┘   │
│                                                                 │
│    ...                                                          │
├─────────────────────────────────────────────────────────────────┤
│  底部状态栏                                                     │
│  字数: 1,234  阅读: 5min        光标: L12 C34        AI 就绪 ⚡  │
└─────────────────────────────────────────────────────────────────┘
```

**窗口标题栏跨平台适配**：

| 平台 | 样式 | 说明 |
|------|------|------|
| macOS | 原生 Traffic Light 按钮（红黄绿）+ 居中标题 | 使用 `titleBarStyle: 'hiddenInset'` 或自定义 |
| Windows | 自定义标题栏，控制按钮靠右 | `frame: false` + 自定义 TitleBar 组件 |
| Linux | 左侧控制按钮 + 居中标题 + 右侧最小化/关闭 | 遵循 GTK/HIG 规范 |

### AI 交互流程

```
用户选中文字
    ↓
FloatingToolbar 出现在选区下方（fade-in 150ms）
    ↓
用户点击工具栏按钮
    ↓
AIPanel 在光标位置下方展开（嵌入文档流）
    ↓
面板显示：快捷 chip 栏 + 输入框（预填提示词）
    ↓
用户点击发送 或 按 Enter
    ↓
useAI hook 发起 SSE 流式请求
    ↓
AIStreamRenderer 逐段渲染输出到面板
    ↓
用户选择：✓ 应用到文档 / ↩ 撤销 / 📋 复制
    ↓
面板折叠为确认状态
```

---

## 3. 浮动工具栏设计

### 触发条件

- 用户在编辑器中选中了非空文本
- 光标不在 AI 面板激活状态
- 工具栏跟随选区位置，最多距离顶部 200px

### 按钮规格

| 按钮 | RemixIcon | 默认提示词 | 行为 |
|------|-----------|-----------|------|
| ✏️ 改写 | `ri-pen-line` | "改写这段文字" | 打开内联面板，默认指令为改写 |
| 💎 润色 | `ri-sparkling-line` | "润色这段文字" | 同上，优化表达和语病 |
| ➕ 续写 | `ri-add-line` | "续写以下内容" | 光标移到选区末尾，打开面板 |
| 📋 摘要 | `ri-file-text-line` | — | 直接调用 AI，结果以内联卡片插入 |
| 🌐 翻译 | `ri-translate-line` | "翻译为中文" | 弹出语言选择后执行 |
| 💬 提问 | `ri-question-line` | — | 打开完整对话面板 |

### 视觉规格

- **容器**: `border-radius: 8px`, `background: rgba(18,24,31,1)`, `border: 1px solid rgba(57,255,158,0.2)`, `box-shadow: 0 4px 20px rgba(0,0,0,0.4)`
- **按钮尺寸**: 高 32px, 宽 56px, 图标 16px
- **激活态**: 背景 `rgba(57,255,158,0.15)`, 边框 `rgba(57,255,158,0.4)`, 图标 `rgba(57,255,158,1)`
- **未激活态**: 图标 `rgba(127,191,162,1)`, 悬停图标 `rgba(220,230,240,1)`
- **动画**: 出现 `opacity 0→1, transform translateY(4px)→0, 150ms ease-out`；消失反向
- **位置**: 绝对定位，基于选区 bounding box 计算，防止溢出视口

---

## 4. 内联 AI 面板设计

### 面板状态机

```
[等待输入] → [AI思考中] → [结果就绪] → [已应用]
     ↑           ↓            ↓
     └──── [发送失败] ←───────┘
```

### 各状态详情

**等待输入**
- 显示快捷 chip 栏（上一操作对应的 chip 高亮）
- 输入框占位符：预填操作指令（如"改写为更正式的商务风格..."）
- 输入框右端：发送按钮（霓虹绿背景， Disabled 状态灰色）
- 最大高度 320px，内容溢出时内部滚动

**AI思考中**
- 输入框禁用，显示脉冲加载动画（三个圆点循环）
- 加载文案："AI 思考中..."
- 背景轻微发光：`box-shadow: 0 0 16px rgba(57,255,158,0.15)`

**结果就绪**
- AI 输出以 markdown 格式渲染（支持代码块、列表等）
- 输出区左侧有霓虹绿竖线装饰 `border-left: 2px solid rgba(57,255,158,1)`
- 底部操作按钮行：`✓ 应用到文档`（主按钮，霓虹绿）/ `↩ 撤销` / `📋 复制`

**已应用**
- 面板折叠为紧凑确认条
- 显示"✓ 已应用到文档"，右侧显示时间戳
- 可点击展开查看差异

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送指令 |
| `Shift+Enter` | 输入框内换行 |
| `Escape` | 关闭当前 AI 面板 |
| `Ctrl+/` | 全局唤起 AI 面板（光标处） |
| `Ctrl+Z` | 撤销 AI 应用 |

---

## 5. AI 引擎架构

### Provider 接口

```typescript
interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  
  // 流式调用
  streamChat(
    messages: ChatMessage[],
    options: StreamOptions
  ): AsyncIterable<string>;
  
  // 非流式调用（用于摘要等简单操作）
  chat(
    messages: ChatMessage[],
    options: CallOptions
  ): Promise<string>;
}

interface AIModel {
  id: string;
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
}
```

### 支持的提供商

| 提供商 | ID | 默认模型 | 备注 |
|--------|-----|---------|------|
| Anthropic | `anthropic` | `claude-3-5-sonnet-20241022` | 推荐，长上下文优秀 |
| OpenAI | `openai` | `gpt-4o` | 通用兼容 |
| 通义千问 | `qwen` | `qwen-max` | 国产，中文能力强 |
| 自定义 | `custom` | — | OpenAI 兼容格式 |

### Prompt 模板

所有模板位于 `services/promptTemplate.ts`，支持变量注入：

**改写模板** (`prompt-rewrite`):
```
你是一个专业的文字编辑。请对以下 Markdown 文本进行改写，
保持原意不变，提升表达质量，使其更符合{style}风格。

上下文（前后各2段）：
{context_before}
━━━
{selected_text}
━━━
{context_after}

直接输出改写后的文本，不要包含解释说明。
```

**润色模板** (`prompt-polish`):
```
请对以下 Markdown 文本进行专业润色：
1. 修正语法和拼写错误
2. 优化句子结构和表达
3. 保持原有语气和风格

原文：
{selected_text}

上下文：
{context}

直接输出润色后的文本，使用 Markdown 格式。
```

**续写模板** (`prompt-continue`):
```
你正在协助撰写一篇 Markdown 文档。请根据以下内容，
续写后续段落，保持风格一致、逻辑连贯、语言流畅。

前文：
{context_before}{selected_text}

续写方向：{user_instruction}
续写字数：约{word_count}字

直接输出续写内容，不要包含"以下是续写"等引导语。
```

**摘要模板** (`prompt-summarize`):
```
请为以下 Markdown 段落生成一个简洁的摘要：
- 提炼核心观点
- 控制在 1-3 句话
- 保留关键数据或结论

原文：
{selected_text}
```

---

## 6. 设置扩展

在现有设置弹窗的**左侧导航**新增 **"AI"** 分组，包含以下设置项：

### AI 设置项

| 设置项 | 控件类型 | 默认值 | 说明 |
|--------|---------|--------|------|
| AI 提供商 | 下拉选择 | Claude 3.5 Sonnet | 切换默认使用的模型提供商 |
| API Key | 密码输入框 | （空） | 本地加密存储，不上传服务器 |
| 自定义 API 地址 | 文本输入 | 空（使用官方地址） | 支持 OpenAI 兼容格式 |
| 温度（创造性） | 滑块 0~1 | 0.7 | 值越高越有创造性 |
| 最大 token | 数字输入 | 1024 | 单次响应最大 token 数 |
| 快捷键 | 键值输入 | `Ctrl+/` | 全局唤起 AI 面板 |

### API Key 安全策略

- API Key 存储在 Electron 的 `safeStorage`（Windows/macOS）或 `keytar`（Linux）
- Web 模式下存储在 `localStorage`，明文不推荐用于生产
- 设置面板中 Key 以 `••••••••` 显示，可点击显示/隐藏

---

## 7. 项目目录结构

```
lzeditor/
├── src/
│   ├── main/                     # Electron 主进程
│   │   ├── index.ts              # 入口，创建主窗口
│   │   ├── ipc.ts                # IPC 处理器（AI API 代理调用）
│   │   └── menu.ts               # 菜单栏
│   │
│   ├── renderer/                 # React 渲染进程
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   ├── LZEditor.tsx
│   │   │   │   ├── AIExtension.ts
│   │   │   │   ├── FloatingToolbar.tsx
│   │   │   │   ├── AIPanel.tsx
│   │   │   │   └── AIStreamRenderer.tsx
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── TitleBar.tsx
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   └── DocumentMetaBar.tsx
│   │   │   │
│   │   │   ├── panels/
│   │   │   │   ├── StylesPanel.tsx
│   │   │   │   ├── HistoryPanel.tsx
│   │   │   │   └── SettingsDialog.tsx
│   │   │   │
│   │   │   └── ai/
│   │   │       ├── AIChip.tsx
│   │   │       ├── AIInputBox.tsx
│   │   │       └── ActionButton.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAI.ts
│   │   │   ├── useFloatingToolbar.ts
│   │   │   ├── useDocumentSelection.ts
│   │   │   └── useTheme.ts
│   │   │
│   │   ├── store/
│   │   │   ├── aiStore.ts
│   │   │   ├── editorStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   └── themeStore.ts
│   │   │
│   │   ├── services/
│   │   │   ├── aiProvider.ts
│   │   │   ├── openaiProvider.ts
│   │   │   ├── anthropicProvider.ts
│   │   │   ├── qwenProvider.ts
│   │   │   └── promptTemplate.ts
│   │   │
│   │   └── styles/
│   │       ├── globals.css
│   │       ├── neon-theme.css
│   │       └── ai-components.css
│   │
│   └── shared/
│       ├── types.ts
│       └── constants.ts
│
├── electron/
│   └── ...
├── package.json
├── vite.config.ts
├── tsconfig.json
└── docs/superpowers/specs/
    └── 2026-09-15-lzeditor-ai-design.md
```

---

## 8. CSS 变量规范

```css
:root {
  /* 背景色 */
  --bg-primary: rgba(10, 14, 19, 1);
  --bg-secondary: rgba(18, 24, 31, 1);
  --bg-tertiary: rgba(13, 19, 25, 1);
  --bg-code: rgba(15, 22, 32, 1);
  --bg-elevated: rgba(22, 29, 38, 1);

  /* 文字 */
  --text-primary: rgba(220, 230, 240, 1);
  --text-secondary: rgba(125, 139, 153, 1);
  --text-muted: rgba(95, 110, 125, 1);
  --text-accent: rgba(57, 255, 158, 1);

  /* AI 霓虹绿（强调色） */
  --accent-primary: rgba(57, 255, 158, 1);
  --accent-soft: rgba(57, 255, 158, 0.15);
  --accent-border: rgba(57, 255, 158, 0.2);
  --accent-glow: 0 0 12px rgba(57, 255, 158, 0.2);

  /* AI 组件专用 */
  --ai-panel-bg: rgba(13, 19, 25, 0.97);
  --ai-panel-border: rgba(57, 255, 158, 0.3);
  --ai-panel-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(57, 255, 158, 0.1);
  --ai-loading-dot: rgba(57, 255, 158, 0.6);

  /* 边框 */
  --border-default: rgba(51, 64, 76, 1);
  --border-subtle: rgba(29, 39, 49, 1);

  /* 工具栏 */
  --toolbar-bg: rgba(13, 19, 25, 1);
  --toolbar-hover: rgba(57, 255, 158, 0.08);
  --toolbar-active: rgba(57, 255, 158, 0.15);

  /* 状态栏 */
  --statusbar-bg: rgba(18, 24, 31, 1);
}
```

---

## 9. 待实现功能（超出当前原型）

基于设计需要新增但原型中未涵盖的功能：

1. **AI 工具按钮**：在图标工具栏右侧工具组新增 AI 图标按钮（REMIXICON: `ri-robot-line`）
2. **语言选择器**：翻译功能的弹出式语言选择面板
3. **AI 设置页面**：设置弹窗中新增 AI 导航分组
4. **流式渲染优化**：AIStreamRenderer 支持代码块高亮、列表自动编号等
5. **API Key 加密存储**：Electron 主进程代理 AI 请求，Key 不暴露给渲染进程
6. **Web 模式降级**：Web 模式下 API Key 暂存 localStorage，提示安全警告

---

## 10. 验收标准

- [ ] 选中文字后浮动工具栏正确显示在选区下方，位置不溢出视口
- [ ] 点击工具栏按钮后内联 AI 面板在光标位置展开
- [ ] AI 流式输出实时渲染，支持代码块和 markdown 格式
- [ ] "应用到文档"正确将 AI 输出替换/插入原文
- [ ] 撤销功能可以恢复到 AI 应用前的状态
- [ ] 设置中可配置 API Key、提供商、温度等参数
- [ ] 快捷键 Ctrl+/ 全局唤起 AI 面板
- [ ] 暗夜霓虹主题在 AI 组件上正确渲染
- [ ] Web 模式下 AI 功能可用（需配置 API Key）
- [ ] 全部 6 个现有页面功能不受影响
