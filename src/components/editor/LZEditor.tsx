import React, { useRef, useEffect, useCallback } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useAIStore } from '../../store/aiStore'
import { useEditorStore } from '../../store/editorStore'
import { FloatingToolbar } from './FloatingToolbar'
import { AIPanel } from './AIPanel'
import { useDocumentSelection } from '../../hooks/useDocumentSelection'
import type { AIAction } from '../../shared/types'
import { DEFAULT_CONTENT } from './constants'

const DEFAULT_CONTENT = `# Welcome to LZEditor

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

> 选中这段文字可以体验 AI 浮动工具栏 —— 点击图标即可唤起 AI 辅助。

---

## 编辑器特性

### 差异对比

Lorem ipsum dolor sit \`amet\`, consectetur adipiscing **elit**.

- ~~vestibulum~~ eros. Aliquam pellentesque **vehicula** sapien,
- ~~Sed hendrerit ligula in tempus.~~
- \`Sed sit amet elit ornare\`, vehicula elit vel, imperdiet leo.
- \`neque venenatis gravida\` [quam suscipit](https://example.com) a eget mi.
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

\`markdown\` \`writing\` \`workflow\` \`ai\` \`editor\` \`electron\`

---

*END OF DOCUMENT*
`\`\`bash
# 开发环境
npm run dev

# 构建桌面应用
npm run electron:build

# 打包 LPK 云应用
cd lzc && bash package.sh
\`\`\`

> 选中这段文字可以体验 AI 浮动工具栏 —— 点击图标即可唤起 AI 辅助。

---

## 编辑器特性

### 差异对比

Lorem ipsum dolor sit \`amet\`, consectetur adipiscing **elit**.

- ~~vestibulum~~ eros. Aliquam pellentesque **vehicula** sapien,
- ~~Sed hendrerit ligula in tempus.~~
- \`Sed sit amet elit ornare\`, vehicula elit vel, imperdiet leo.
- \`neque venenatis gravida\` [quam suscipit](https://example.com) a eget mi.
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

\`markdown\` \`writing\` \`workflow\` \`ai\` \`editor\` \`electron\`

---

*END OF DOCUMENT*
`\`\`bash
npm run dev
\`\`\`

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

- \`mollis\` ~~vestibulum~~ eros. Aliquam pellentesque vehicula sapien,
- ~~Sed hendrerit ligula in tempus.~~
- \`Sed sit amet elit ornare, vehicula elit vel, imperdiet leo.\`
- \`neque venenatis gravida\` [quam suscipit](https://example.com) a eget mi. Nulla sollicitudin.
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

\`\`\`bash
$ cat /proc/cpuinfo | grep "model name" | head -n 3
model name : Apple M3 Pro
cpu cores  : 12
\`\`\`

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

\`markdown\` \`writing\` \`workflow\` \`ai\` \`editor\`

---

*END OF DOCUMENT*
`

export const LZEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const { toolbar } = useDocumentSelection(editorRef)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)
  const setCharCount = useEditorStore((s: any) => s.setCharCount)
  const setCursorPosition = useEditorStore((s: any) => s.setCursorPosition)
  const setEditorRef = useEditorStore((s: any) => s.setEditorRef)

  React.useEffect(() => {
    setEditorRef(editorRef.current)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem,
    ],
    content: DEFAULT_CONTENT,
    onUpdate: ({ editor }: any) => {
      const text = editor.getText()
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      setCharCount(text.length)
    },
    onSelectionUpdate: ({ editor }: any) => {
      const pos = editor.state.selection
      const line = editor.state.doc.nodeSize > 0
        ? editor.view.coordsAtPos(pos.from).top
        : 0
      setCursorPosition({ line: Math.max(1, Math.floor(line / 22) + 1), column: pos.from })
    },
    editable: true,
  })

  const handleToolbarAction = useCallback((action: AIAction) => {
    const selectedText = editor ? editor.state.doc.textContent.slice(editor.state.selection.from, editor.state.selection.to) : ''
    const pos = toolbar.position
    useAIStore.getState().showPanel(action, selectedText, pos)
  }, [editor, toolbar])

  useEffect(() => {
    return () => { editor?.destroy() }
  }, [editor])

  // Handle image paste/drop
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file && editor) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            const img = ev.target?.result as string
            editor.commands.insertContent({
              type: 'image',
              attrs: { src: img, alt: file.name },
            })
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }, [editor])

  const handleDrop = useCallback((e: DragEvent) => {
    const files = e.dataTransfer?.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') && editor) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const img = ev.target?.result as string
          editor.commands.insertContent({
            type: 'image',
            attrs: { src: img, alt: file.name },
          })
        }
        reader.readAsDataURL(file)
      }
    })
  }, [editor])

  // Attach paste/drop listeners to the container div (editorRef) instead of editor.view.dom
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault()
          const file = items[i].getAsFile()
          if (file && editor) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              editor.commands.insertContent({
                type: 'image',
                attrs: { src: ev.target?.result as string, alt: file.name },
              })
            }
            reader.readAsDataURL(file)
          }
        }
      }
    }
    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files
      if (!files) return
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/') && editor) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            editor.commands.insertContent({
              type: 'image',
              attrs: { src: ev.target?.result as string, alt: file.name },
            })
          }
          reader.readAsDataURL(file)
        }
      })
    }
    el.addEventListener('paste', onPaste)
    el.addEventListener('drop', onDrop)
    return () => {
      el.removeEventListener('paste', onPaste)
      el.removeEventListener('drop', onDrop)
    }
  }, [editor, editorRef])

  return (
    <div className="lz-editor" ref={editorRef}>
      <div className="lz-editor-content">
        <EditorContent editor={editor} />
      </div>
      <FloatingToolbar
        position={toolbar.position}
        
        visible={toolbar.visible}
        onAction={handleToolbarAction}
      />
      <AIPanel />
    </div>
  )
}
