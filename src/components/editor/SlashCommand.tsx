import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'

export interface SlashCommandItem {
  id: string
  icon: string
  label: string
  keywords?: string
  group?: string
  action?: string
  dialog?: boolean
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  // Format
  { id: 'bold', icon: 'ri-bold', label: '粗体', keywords: '粗体 加粗 bold', group: '格式' },
  { id: 'italic', icon: 'ri-italic', label: '斜体', keywords: '斜体 italic', group: '格式' },
  { id: 'underline', icon: 'ri-underline', label: '下划线', keywords: '下划线 underline', group: '格式' },
  { id: 'strikethrough', icon: 'ri-strikethrough', label: '删除线', keywords: '删除线 strikethrough', group: '格式' },
  { id: 'highlight', icon: 'ri-mark-pen-fill', label: '高亮', keywords: '高亮 highlight', group: '格式' },
  { id: 'h1', icon: 'ri-h-1', label: '标题1', keywords: '标题 h1 heading', group: '格式' },
  { id: 'h2', icon: 'ri-h-2', label: '标题2', keywords: '标题 h2 heading', group: '格式' },
  { id: 'h3', icon: 'ri-h-3', label: '标题3', keywords: '标题 h3 heading', group: '格式' },
  { id: 'hr', icon: 'ri-separator', label: '分割线', keywords: '分割线 hr line', group: '格式' },
  { id: 'ol', icon: 'ri-list-ordered', label: '有序列表', keywords: '有序列表 ordered', group: '格式' },
  { id: 'ul', icon: 'ri-list-unordered', label: '无序列表', keywords: '无序列表 bullet', group: '格式' },
  { id: 'task', icon: 'ri-task-line', label: '任务列表', keywords: '任务列表 todo', group: '格式' },
  // Insert
  { id: 'link', icon: 'ri-link', label: '链接', keywords: '链接 link url', group: '插入', dialog: true },
  { id: 'image', icon: 'ri-image-line', label: '图片', keywords: '图片 image photo', group: '插入', dialog: true },
  { id: 'emoji', icon: 'ri-emotion-line', label: '表情', keywords: '表情 emoji', group: '插入', dialog: true },
  { id: 'toc', icon: 'ri-menu-line', label: '目录', keywords: '目录 toc outline', group: '插入' },
  { id: 'quote', icon: 'ri-double-quotes-l', label: '引言', keywords: '引言 quote 引用', group: '插入' },
  { id: 'footnote', icon: 'ri-footprint-line', label: '脚注', keywords: '脚注 footnote', group: '插入' },
  { id: 'chart', icon: 'ri-flow-chart', label: '图表', keywords: '图表 chart echarts', group: '插入', dialog: true },
  { id: 'code', icon: 'ri-code-box-line', label: '代码块', keywords: '代码 code block', group: '插入', dialog: true },
  { id: 'math', icon: 'ri-function-fill', label: '公式', keywords: '公式 math 数学 formula', group: '插入', dialog: true },
  { id: 'blockquote', icon: 'ri-double-quotes-l', label: '块引用', keywords: '块引用 blockquote', group: '插入' },
  // Table
  { id: 'table-insert', icon: 'ri-table-2', label: '表格', keywords: '表格 table', group: '表格', dialog: true },
]

interface SlashCommandProps {
  position: { x: number; y: number }
  visible: boolean
  filter: string
  onClose: () => void
}

export const SlashCommand: React.FC<SlashCommandProps> = ({ position, visible, filter, onClose }) => {
  const editor = useEditorStore((s) => s.editor)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = SLASH_COMMANDS.filter(cmd => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(q) ||
      (cmd.keywords && cmd.keywords.toLowerCase().includes(q)) ||
      cmd.id.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    setSelectedIndex(0)
  }, [filter])

  useEffect(() => {
    const idx = filtered.indexOf(filtered[selectedIndex])
    if (idx === -1) setSelectedIndex(0)
  }, [filtered, selectedIndex])

  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null
    node?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const cols = 3
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + cols, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - cols, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filtered[selectedIndex]
      if (cmd) executeCommand(cmd)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [filtered, selectedIndex, onClose])

  const executeCommand = useCallback((cmd: SlashCommandItem) => {
    onClose()
    if (!editor) return
    const chain = editor.chain().focus()

    switch (cmd.id) {
      case 'bold': chain.toggleBold().run(); break
      case 'italic': chain.toggleItalic().run(); break
      case 'underline': chain.toggleUnderline().run(); break
      case 'strikethrough': chain.toggleStrike().run(); break
      case 'highlight': chain.toggleHighlight().run(); break
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = parseInt(cmd.id[1])
        chain.toggleHeading({ level }).run()
        break
      }
      case 'hr': chain.setHorizontalRule().run(); break
      case 'ol': chain.toggleOrderedList().run(); break
      case 'ul': chain.toggleBulletList().run(); break
      case 'task': chain.toggleTaskList().run(); break
      case 'toc': {
        const headings: string[] = []
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === 'heading') {
            headings.push(' '.repeat(node.attrs.level - 1) + '- ' + node.textContent)
          }
          return true
        })
        const tocBody = headings.length > 0
          ? headings.map(h => `<p>${h}</p>`).join('')
          : '<p>暂无标题</p>'
        chain.insertContent(`<div data-toc><p><strong>目录</strong></p>${tocBody}</div><p></p>`).run()
        break
      }
      case 'quote': {
        const sel = editor.state.selection
        const text = sel && sel.from !== sel.to ? editor.state.doc.textBetween(sel.from, sel.to) : '引用内容'
        chain.insertContent(`<blockquote><p>${text}</p></blockquote>`).run()
        break
      }
      case 'footnote': chain.insertContent('<sup>[^1]</sup>').run(); break
      case 'blockquote': chain.toggleBlockquote().run(); break
      case 'link': setOpenPanel('link'); break
      case 'image': setOpenPanel('image'); break
      case 'emoji': setOpenPanel('emoji'); break
      case 'chart': setOpenPanel('chart'); break
      case 'code': setOpenPanel('code'); break
      case 'math': setOpenPanel('formula'); break
      case 'table-insert': {
        const r = parseInt(prompt('行数:', '3') || '3')
        const c = parseInt(prompt('列数:', '3') || '3')
        if (r > 0 && c > 0) chain.insertTable({ rows: r, cols: c, withHeaderRow: true }).run()
        break
      }
    }
  }, [editor, onClose, setOpenPanel])

  if (!visible) return null

  const panelWidth = 260
  const clampedX = Math.min(position.x + 8, window.innerWidth - panelWidth - 16)
  const clampedY = Math.min(position.y, window.innerHeight - 300)

  return (
    <div
      className="slash-command"
      style={{ left: clampedX, top: clampedY }}
      onKeyDown={handleKeyDown}
    >
      <div ref={listRef} className="slash-command-grid">
        {filtered.length === 0 ? (
          <div className="slash-command-empty">无匹配命令</div>
        ) : (
          filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              data-idx={i}
              className={`slash-command-cell${i === selectedIndex ? ' active' : ''}`}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className={`remix slash-command-icon ${cmd.icon}`}></span>
              <span className="slash-command-label">{cmd.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
