# 技术笔记

> 本文档基于 Calicat 设计稿构建，包含所有 mock 数据用于功能测试。

---

## 项目规划

### 核心功能

- Markdown 编辑与实时预览
- AI 写作助手（改写/润色/续写/摘要/翻译）
- 版本历史与回滚
- 暗夜霓虹主题

### 技术栈

```bash
npm run dev
```

> 选中这段文字可以体验 AI 浮动工具栏 —— 点击图标即可唤起 AI 辅助。

### 下一步

1. 完成 AI 代理服务器
2. 接入真实 LLM API
3. 打包为桌面应用

---

## 编辑器功能演示

### 标题层级

Praesent varius diam

Nam id imperdiet turpis. Fusce dignissim vel eros sit amet auctor. Donec quis lorem egestas, placerat odio vel, pulvinar tellus. Nullam tristique neque urna, non dapibus augue pulvinar et. Sed porta ac nulla in ultricies. Aenean ut mollis vestibulum eros.

### 差异对比示例

Lorem ipsum dolor sit **amet**, consectetur adipiscing elit.

- `mollis` ~~vestibulum~~ eros. Aliquam pellentesque vehicula sapien,
- ~~Sed hendrerit ligula in tempus.~~
- `Sed sit amet elit ornare, vehicula elit vel, imperdiet leo.`
- `neque venenatis gravida` [quam suscipit](https://example.com) a eget mi. Nulla sollicitudin.
- Curabitur placerat viverra libero.

---

## 阅读模式演示

### 本节要点

1. 保持 Markdown 标记可见，写作时无需在「源码」与「预览」之间来回切换。
2. 每次自动保存都会生成快照，可在历史面板中对比与回滚。
3. 样式集决定导出观感，切换到 Ocean 后表格与标题会统一为冷色调。

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

---

## 表格示例

| 模块 | 状态 | 说明 |
|------|------|------|
| 编辑器 | 已完成 | TipTap + React |
| AI 助手 | 开发中 | 多 Provider 支持 |
| 导出 | 待完成 | PDF/HTML/DOCX |
| 同步 | 规划中 | Git/Dropbox/WebDAV |

---

## 标签

`markdown` `writing` `workflow` `ai` `editor`

---

*END OF DOCUMENT*
