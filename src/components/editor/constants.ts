export const DEFAULT_CONTENT = `# Welcome to LZEditor

> 轻文档协作编辑器，AI 辅助写作 · 暗夜霓虹主题

---

## 快速开始

### 核心功能

- **Markdown 编辑** — 实时预览，所见即所得
- **AI 写作助手** — 改写、润色、续写、摘要、翻译
- **版本历史** — 自动保存快照，随时回滚
- **多端同步** — Git / Dropbox / WebDAV

### 技术栈

\`\`\`bash
# 开发环境
npm run dev

# 构建桌面应用
npm run electron:build

# 打包 LPK 云应用
cd lzc && bash package.sh
\`\`\`

---

## 编辑器特性

### 文本格式

支持全部 Markdown **粗体**、*斜体*、~~删除线~~、\`行内代码\` 等基础格式，以及组合使用 **粗斜体** 和 ~~粗删除~~。

链接示例：[LZEditor GitHub](https://github.com)

### 差异对比

Lorem ipsum dolor sit \`amet\`, consectetur adipiscing **elit**.

- ~~vestibulum~~ eros. Aliquam pellentesque **vehicula** sapien,
- ~~Sed hendrerit ligula in tempus.~~
- \`Sed sit amet elit ornare\`, vehicula elit vel, imperdiet leo.
- \`neque venenatis gravida\` [quam suscipit](https://example.com) a eget mi.
- Curabitur placerat viverra libero.

### 任务列表

1. ~~完成 AI 代理服务器~~
2. **接入真实 LLM API**
3. *打包为桌面应用*
4. 🔄 支持多平台编译
5. ⏳ Nascetur ridiculus mus

---

## 引用与代码

> "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..."
> — Lorem Ipsum

### 终端命令

\`\`\`bash
$ cat /proc/cpuinfo | grep "model name" | head -n 3
model name : Apple M3 Pro
cpu cores  : 12
\`\`\`

### JavaScript 示例

\`\`\`javascript
const editor = createEditor({
  extensions: [StarterKit, TaskList, AIAssistant],
  content: DEFAULT_CONTENT,
  onUpdate: ({ editor }) => {
    saveSnapshot(editor.getHTML())
  }
})
\`\`\`

### Python 示例

\`\`\`python
from lzeditor import Editor

def process_document(path: str) -> dict:
    """解析文档并提取关键数据"""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    result = {
        "words": len(content.split()),
        "lines": content.count("\\n"),
        "blocks": content.count("\\n\\n"),
    }
    return result

if __name__ == "__main__":
    data = process_document("welcome.md")
    print(f"字数: {data['words']}, 行数: {data['lines']}")
\`\`\`

---

## 数学公式

LZEditor 支持 **KaTeX** 数学公式渲染，在编辑器中选中文字后点击工具栏的 **公式** 图标即可插入。

### 行内公式

质能方程 $E = mc^2$ 是物理学中最著名的公式之一。勾股定理 $a^2 + b^2 = c^2$ 描述了直角三角形的边长关系。

### 块级公式

欧拉恒等式：

$$e^{i\\pi} + 1 = 0$$

高斯积分：

$$\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

矩阵表示：

$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}$$

求和符号：

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

---

## DrawIO 流程图

LZEditor 支持通过工具栏插入 **DrawIO 流程图**。点击右上角的 **图表** 按钮，即可打开 DrawIO 编辑器，绘制流程图、时序图、类图等。

### 示例：系统架构流程图

\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│   Database  │
│  (React)    │     │  (Node.js)  │     │ (PostgreSQL) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Redis      │     │   AI Model  │     │  Backup     │
│  Cache      │     │ (OpenAI)    │     │  (S3)       │
└─────────────┘     └─────────────┘     └─────────────┘
\`\`\`

> 提示：DrawIO 图表以图片形式嵌入文档，导出为 PDF 时保留矢量清晰度。

---

## 表格示例

| 模块 | 状态 | 说明 |
|------|------|------|
| 编辑器 | ✅ 已完成 | TipTap + React |
| AI 助手 | 🔄 开发中 | 多 Provider 支持 |
| 导出 | ⏳ 待完成 | PDF/HTML/DOCX/MD |
| 同步 | 📋 规划中 | Git/Dropbox/WebDAV |
| 公式 | ✅ 已完成 | KaTeX 渲染引擎 |
| 图表 | ✅ 已完成 | DrawIO 集成 |

---

## 导出格式

LZEditor 支持多种导出格式，满足不同场景需求：

| 格式 | 图标 | 适用场景 | 特点 |
|------|------|----------|------|
| **PDF** | 📄 | 打印、正式分享 | 矢量排版，保留公式和图表 |
| **HTML** | 🌐 | 网页发布 | 自包含单文件，可离线阅读 |
| **DOCX** | 📝 | Office 办公 | 兼容 Word，支持富文本 |
| **Markdown** | 📋 | 版本控制、协作 | 纯文本，Git 友好 |
| **PNG** | 🖼️ | 社交媒体 | 图片格式，便于分享 |

---

## 标签

\`markdown\` \`writing\` \`workflow\` \`ai\` \`editor\` \`electron\` \`katex\` \`drawio\`

---

 *END OF DOCUMENT*
 `

export const NEW_DOC_TEMPLATE = `# 新建文档

开始写作吧…
`

export const DEFAULT_DOC_TITLE = 'Welcome to LZEditor'
