export const DEFAULT_CONTENT = `# LZEditor — 懒猫编辑器

> 轻文档 · Markdown · AI 辅助写作 · 多端同步

---

## 快速开始

欢迎使用 **懒猫编辑器（LZEditor）**！这是一款面向个人与团队的轻文档 Markdown 编辑器，支持 AI 辅助写作、多文档管理、本地持久化存储与跨平台桌面客户端。

### 核心功能一览

| 功能 | 说明 |
|------|------|
| 📝 **Markdown 编辑** | TipTap 富文本引擎，支持 Markdown 语法、实时预览、分屏模式 |
| 🤖 **AI 辅助写作** | 改写 · 润色 · 续写 · 摘要 · 翻译，一键完成 |
| 🔌 **多 Provider** | Anthropic Claude / OpenAI / Azure / 自定义基座，模型自由切换 |
| 📂 **多文档管理** | 文档列表、新建/重命名/删除、快捷搜索、最近打开记录 |
| 💾 **本地持久化** | IndexedDB 自动保存，零配置，数据本地优先 |
| 🎨 **样式主题** | 暗夜霓虹 / 经典白 / 自定义 CSS，支持字体与行距调节 |
| 📤 **多格式导出** | PDF · HTML · DOCX · Markdown，按需导出 |
| 🖥 **桌面应用** | Electron 打包，支持 Windows / macOS / Linux |

---

## 基础排版

### 标题层级

#### 四级标题

##### 五级标题

###### 六级标题

### 文本格式

**粗体文字** 用于强调重点内容，*斜体文字* 用于标注术语或外语，~~删除线~~ 表示已废弃的内容，\`行内代码\` 用于标注技术关键词，**粗斜体** 可复合使用。

> 选中任意文字可唤起 AI 浮动工具栏，提供改写、润色、续写、摘要、翻译、提问六大能力。

---

## 列表与任务

### 无序列表

- 支持嵌套子项
  - 二级缩进
    - 三级继续深入
- 支持 emoji 图标 \`🎯\` \`📌\` \`✨\`
- 支持 **混合格式** 文本

### 有序列表

1. 第一步：创建文档
2. 第二步：编写内容
   - 插入代码块
   - 添加表格
3. 第三步：AI 润色
4. 第四步：导出分享

### 任务列表

- [x] 完成编辑器核心架构
- [x] 接入 TipTap 富文本引擎
- [x] 实现 AI 浮动工具栏
- [x] 支持多 Provider LLM
- [x] 本地持久化存储
- [ ] 打包 Electron 桌面应用
- [ ] 接入云同步服务
- [ ] 支持插件系统

---

## 代码块

### JavaScript

\`\`\`javascript
import { createEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { AIAssistant } from './extensions/AIAssistant'

const editor = createEditor({
  element: document.getElementById('editor'),
  extensions: [StarterKit, AIAssistant],
  content: '<p>欢迎使用 LZEditor</p>',
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    saveSnapshot(html)
  },
  onCreate: ({ editor }) => {
    console.log('编辑器已就绪')
  }
})
\`\`\`

### Python

\`\`\`python
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

@dataclass
class Document:
    id: str
    title: str
    content: str
    created_at: int
    updated_at: int

    def save(self, db: "Database") -> None:
        db.execute(
            "INSERT OR REPLACE INTO docs VALUES (?, ?, ?, ?, ?)",
            (self.id, self.title, self.content, self.created_at, self.updated_at)
        )
\`\`\`

### Bash

\`\`\`bash
# 开发环境启动
npm run dev

# 构建桌面应用
npm run electron:build

# 打包 LPK 云应用
cd lzc && bash package.sh

# 检查依赖
npm ls @tiptap/core react typescript
\`\`\`

### TypeScript

\`\`\`typescript
interface AIAction {
  type: 'rewrite' | 'polish' | 'continue' | 'summarize' | 'translate' | 'question'
  text: string
  context?: string
}

type EditorStore = {
  panelVisible: boolean
  panelAction: AIAction['type'] | null
  showPanel: (action: AIAction['type'], text: string, pos: Position) => void
  hidePanel: () => void
}
\`\`\`

---

## 引用与注释

> "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..."
> — *Lorem Ipsum*

> 📘 **提示**：使用 \`/\` 斜杠命令可快速插入标题、列表、代码块、表格等元素。

> 📌 **快捷键**：
> - \`Ctrl/Cmd + B\` — 粗体
> - \`Ctrl/Cmd + I\` — 斜体
> - \`Ctrl/Cmd + K\` — 插入链接
> - \`Ctrl/Cmd + Shift + S\` — 搜索替换
> - \`Ctrl/Cmd + /\` — 唤起 AI 对话框

---

## 链接与图片

### 超链接

[LZEditor GitHub](https://github.com/sikenali/lzeditor) · [TipTap 文档](https://tiptap.dev/) · [Anthropic API](https://docs.anthropic.com/)

### 图片占位

![LZEditor Logo](https://via.placeholder.com/80x80/6366F1/FFFFFF?text=LZ)

---

## 表格

### 功能对比表

| 功能 | 免费版 | 专业版 |
|------|:------:|:------:|
| Markdown 编辑 | ✅ | ✅ |
| AI 写作助手 | ❌ | ✅ |
| 多文档管理 | ✅ | ✅ |
| 云同步 | ❌ | ✅ |
| 导出 PDF/DOCX | ❌ | ✅ |
| 自定义主题 | ❌ | ✅ |
| 优先技术支持 | ❌ | ✅ |

### 项目路线图

| 阶段 | 功能 | 状态 | 预计时间 |
|------|------|:----:|------|
| V1.0 | 核心编辑器 + AI 基础 | ✅ 已完成 | 2024 Q3 |
| V1.1 | 多 Provider + 样式定制 | 🔄 开发中 | 2024 Q4 |
| V1.2 | 云同步 + 协作编辑 | ⏳ 规划中 | 2025 Q1 |
| V2.0 | 插件系统 + 扩展市场 | 📋 预留 | 2025 Q2 |

---

## 数学公式

行内公式：$E = mc^2$ 质能方程

独立公式：

$$
\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}
$$

---

## 水平分隔

---

## 标签与徽章

\`markdown\` · \`writing\` · \`workflow\` · \`ai\` · \`editor\` · \`electron\` · \`react\` · \`typescript\`

---

## AI 写作能力

LZEditor 内置 AI 写作助手，支持六大能力：

| 能力 | 说明 |
|------|------|
| ✍️ **改写** | 优化表达风格，适配商务/正式/口语场景 |
| 🎨 **润色** | 修正语法错误，提升文字流畅度 |
| ➡️ **续写** | 根据上下文延续内容，保持风格一致 |
| 📋 **摘要** | 提炼核心观点，生成结构化摘要 |
| 🌐 **翻译** | 支持多语言互译，保留原文格式 |
| 💬 **提问** | 针对内容提问，AI 给出智能回答 |

### 使用方式

1. **选中文字** → 浮动工具栏自动出现
2. **斜杠命令** → 输入 \`/\` 唤起 AI 指令面板
3. **全局快捷键** → \`Ctrl/Cmd + /\` 直接打开 AI 对话框

---

## 样式与主题

支持多种主题模式，可在**设置面板**中切换：

- 🌙 **暗夜霓虹** — 深色背景，紫色/青色点缀
- ☀️ **经典白** — 纯白背景，简洁舒适
- 📄 **纸张模式** — 暖黄底色，模拟纸质阅读体验

可自定义：
- 编辑器字体（衬线 / 无衬线 / 等宽）
- 字号大小（14px ~ 22px）
- 行间距（1.4 ~ 2.0）
- 内容宽度（全宽 / 适中 / 窄版）

---

## 多文档管理

左侧文档库支持：
- 📁 按文件夹分组管理
- 🔍 全文搜索
- 🕐 最近打开记录
- 📝 新建 / 重命名 / 删除文档
- 💾 自动保存到 IndexedDB

---

## 导出与分享

支持多种导出格式：

| 格式 | 说明 |
|------|------|
| 📄 **PDF** | 高质量打印输出，支持页眉页脚 |
| 🌐 **HTML** | 单文件离线浏览 |
| 📑 **DOCX** | Microsoft Word 格式 |
| 📝 **Markdown** | 原始源码备份 |

---

## 技术架构

\`\`\`
┌─────────────────────────────────────────┐
│              Electron App               │
├──────────┬──────────────┬───────────────┤
│  React   │   TipTap     │   Zustand     │
│  UI 层   │   编辑器引擎  │   状态管理     │
├──────────┴──────────────┴───────────────┤
│         Express + SQLite (后端)          │
│    文档持久化 / 用户数据 / 同步服务       │
├─────────────────────────────────────────┤
│    Anthropic Claude / OpenAI / 自部署   │
│              AI Provider 层             │
└─────────────────────────────────────────┘
\`\`\`

---

## 快捷键速查

| 快捷键 | 功能 |
|--------|------|
| \`Ctrl/Cmd + B\` | 粗体 |
| \`Ctrl/Cmd + I\` | 斜体 |
| \`Ctrl/Cmd + U\` | 下划线 |
| \`Ctrl/Cmd + K\` | 插入链接 |
| \`Ctrl/Cmd + Shift + S\` | 查找与替换 |
| \`Ctrl/Cmd + /\` | AI 对话框 |
| \`Esc\` | 关闭弹窗 |
| \`Enter\` | 发送 AI 消息 |

---

## 常见问题

**Q: 数据存在哪里？**
A: 所有文档存储在浏览器 IndexedDB 本地，无需联网即可使用。

**Q: 如何开启 AI 功能？**
A: 进入 **设置 → AI**，填写 API Key 和选择 Provider 即可启用。

**Q: 支持哪些 AI 模型？**
A: 支持 Anthropic Claude 3、OpenAI GPT-4/GPT-3.5、Azure OpenAI，也可接入任意 OpenAI 兼容接口。

---

## 开始创作

现在就开始你的写作之旅吧！

- 点击右上角 **新建** 创建第一个文档
- 输入 \`/\` 体验斜杠命令的便捷
- 选中文字召唤 AI 浮动工具栏
- 尝试 **样式面板** 自定义阅读体验

---

*END OF DOCUMENT · LZEditor v1.0 · Built with ❤️*
\`


export const NEW_DOC_TEMPLATE = \`# 新建文档

开始写作吧…
\`

export const DEFAULT_DOC_TITLE = 'Welcome to LZEditor'
---

## 插入链接与图片

### 插入链接

两种方式：

1. **工具栏按钮** — 点击工具栏「链接」图标，在弹窗中输入文字和 URL
2. **Markdown 语法** — 在编辑器中输入 [显示文字](https://example.com)

快捷键：Ctrl/Cmd + K 选中文字后快速插入链接。

### 插入图片

支持多种图片来源：

1. **URL 图片** — 点击工具栏「图片」图标，粘贴图片地址即可插入
2. **本地上传** — 上传图片文件，自动转 Base64 存储到文档中
3. **拖拽粘贴** — 直接从剪贴板粘贴图片（Ctrl/Cmd + V），或拖拽图片文件到编辑器

> 本地上传的图片以 Base64 形式存储在文档内，导出 PDF/HTML 时保留完整。

### Emoji 表情

点击工具栏「表情」按钮，或输入 /emoji 斜杠命令，唤起 Apple 风格 Emoji 面板。
也支持直接粘贴系统 Emoji，或输入冒号短代码如 :smile: :heart: :rocket: 自动渲染为高清 PNG 图片。

> Emoji 在预览和导出（PDF/HTML）时以图片形式展示，保留清晰度。
`

export const NEW_DOC_TEMPLATE = `# 新建文档

开始写作吧…
`

export const DEFAULT_DOC_TITLE = 'Welcome to LZEditor'
