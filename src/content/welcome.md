# Welcome to LZEditor

> 轻文档协作编辑器，AI 辅助写作 · 暗夜霓虹主题

---

## 快速开始

### 核心功能

- **Markdown 编辑** — 实时预览，所见即所得
- **AI 写作助手** — 改写、润色、续写、摘要、翻译
- **版本历史** — 自动保存快照，随时回滚
- **多端同步** — Git / Dropbox / WebDAV

### 技术栈

```bash
# 开发环境
npm run dev

# 构建桌面应用
npm run electron:build

# 打包 LPK 云应用
cd lzc && bash package.sh
```

> 选中这段文字可以体验 AI 浮动工具栏 —— 点击图标即可唤起 AI 辅助。

---

## 编辑器特性

### 差异对比

Lorem ipsum dolor sit `amet`, consectetur adipiscing **elit**.

- ~~vestibulum~~ eros. Aliquam pellentesque **vehicula** sapien,
- ~~Sed hendrerit ligula in tempus.~~
- `Sed sit amet elit ornare`, vehicula elit vel, imperdiet leo.
- `neque venenatis gravida` [quam suscipit](https://example.com) a eget mi.
- Curabitur placerat viverra libero.

### 任务列表

1. 完成 AI 代理服务器
2. 接入真实 LLM API
3. 打包为桌面应用
4. *支持多平台编译*
5. *Nascetur ridiculus mus*

---

## 引用与代码

> "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..."
> — Lorem Ipsum

### 终端命令

```bash
$ cat /proc/cpuinfo | grep "model name" | head -n 3
model name : Apple M3 Pro
cpu cores  : 12
```

### JavaScript 示例

```javascript
const editor = createEditor({
  extensions: [StarterKit, TaskList, AIAssistant],
  content: DEFAULT_CONTENT,
  onUpdate: ({ editor }) => {
    saveSnapshot(editor.getHTML())
  }
})
```

---

## 表格示例

| 模块 | 状态 | 说明 |
|------|------|------|
| 编辑器 | ✅ 已完成 | TipTap + React |
| AI 助手 | 🔄 开发中 | 多 Provider 支持 |
| 导出 | ⏳ 待完成 | PDF/HTML/DOCX |
| 同步 | 📋 规划中 | Git/Dropbox/WebDAV |

---

## 标签

`markdown` `writing` `workflow` `ai` `editor` `electron`

---

*END OF DOCUMENT*
