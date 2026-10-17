import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'

export interface SlashCommandItem {
  id: string
  icon: string
  label: string
  keywords?: string
  action?: string
  dialog?: boolean
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  // 格式
  { id: 'bold',       icon: 'ri-bold',        label: '粗体',       keywords: '粗体 加粗 bold' },
  { id: 'italic',     icon: 'ri-italic',      label: '斜体',       keywords: '斜体 italic' },
  { id: 'underline',  icon: 'ri-underline',   label: '下划线',     keywords: '下划线 underline' },
  { id: 'strike',     icon: 'ri-strikethrough', label: '删除线',   keywords: '删除线 strikethrough' },
  { id: 'highlight',  icon: 'ri-mark-pen-fill', label: '高亮',     keywords: '高亮 highlight' },
  // 标题
  { id: 'h1',         icon: 'ri-h-1',         label: '标题 1',     keywords: '标题 h1 heading' },
  { id: 'h2',         icon: 'ri-h-2',         label: '标题 2',     keywords: '标题 h2 heading' },
  { id: 'h3',         icon: 'ri-h-3',         label: '标题 3',     keywords: '标题 h3 heading' },
  // 列表
  { id: 'ol',         icon: 'ri-list-ordered', label: '有序列表',  keywords: '有序列表 ordered' },
  { id: 'ul',         icon: 'ri-list-unordered',label: '无序列表', keywords: '无序列表 bullet' },
  { id: 'task',       icon: 'ri-task-line',    label: '任务列表',  keywords: '任务列表 todo' },
  { id: 'quote',      icon: 'ri-double-quotes-l', label: '引用',    keywords: '引用 quote' },
  // 插入
  { id: 'link',       icon: 'ri-link',        label: '链接',       keywords: '链接 link url', dialog: true },
  { id: 'image',      icon: 'ri-image-line',  label: '图片',       keywords: '图片 image photo', dialog: true },
  { id: 'emoji',      icon: 'ri-emotion-line',label: '表情',       keywords: '表情 emoji', dialog: true },
  { id: 'code',       icon: 'ri-code-box-line',label: '代码块',    keywords: '代码 code block', dialog: true },
  { id: 'math',       icon: 'ri-function-fill',label: '公式',      keywords: '公式 math formula', dialog: true },
  { id: 'table',      icon: 'ri-table-2',     label: '表格',      keywords: '表格 table', dialog: true },
  { id: 'chart',      icon: 'ri-bar-chart-2-line',label: '图表',   keywords: '图表 chart echarts', dialog: true },
  { id: 'hr',         icon: 'ri-separator',   label: '分割线',     keywords: '分割线 hr line' },
  { id: 'toc',        icon: 'ri-menu-line',   label: '目录',       keywords: '目录 toc outline' },
  { id: 'footnote',   icon: 'ri-footprint-line', label: '脚注',    keywords: '脚注 footnote' },
]

const escapeHtml = (v: string) =>
  v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

interface SlashCommandProps {
  position: { x: number; y: number }
  visible: boolean
  filter: string
  onClose: () => void
  editor?: any
}

const COLS = 3
const PANEL_W = 272

export const SlashCommand: React.FC<SlashCommandProps> = ({ position, visible, filter, onClose, editor }) => {
  const setInsertPanel = useEditorStore((s: any) => s.setInsertPanel)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 定位：找到 "/" 字符位置，面板紧贴其右侧
  const effectivePosition = useMemo(() => {
    if (!editor) return position
    try {
      const sel = editor.state.selection
      if (!sel) return position
      const textBefore = editor.state.doc.textBetween(Math.max(0, sel.from - 60), sel.from, '')
      const match = textBefore.match(/\/([^\s]*)$/)
      if (!match) return position
      const slashDocPos = sel.from - match[0].length  // "/" 在文档中的位置
      const afterSlashDocPos = slashDocPos + 1        // "/" 后面一个位置
      const coords = editor.view.coordsAtPos(afterSlashDocPos)
      if (!coords?.right) return position
      // 面板左边 = "/" 右边，如果有滤镜文本则继续右移
      const charW = 7.5  // 平均字符宽度
      const extraX = match[1].length * charW
      return { x: coords.right + 2 + extraX, y: coords.top - 2 }
    } catch { return position }
  }, [editor, filter, position])

  // 过滤
  const filtered = useMemo(() => {
    if (!filter) return SLASH_COMMANDS
    const q = filter.toLowerCase()
    return SLASH_COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.keywords && c.keywords.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    )
  }, [filter])

  useEffect(() => { setSelectedIndex(0) }, [filter])
  useEffect(() => {
    if (filtered[selectedIndex]) return
    setSelectedIndex(0)
  }, [filtered])
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null
    node?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // 删除 "/" 和滤镜文本
  const removeSlashQuery = useCallback(() => {
    if (!editor) return
    const from = editor.state.selection.from
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 40), from, '')
    const match = textBefore.match(/\/([^\s]*)$/)
    if (!match) return
    editor.chain().focus().deleteRange({ from: from - match[0].length, to: from }).run()
  }, [editor])

  // 执行
  const executeCommand = useCallback((cmd: SlashCommandItem) => {
    onClose()
    if (!editor) return
    removeSlashQuery()
    const chain = editor.chain().focus()
    switch (cmd.id) {
      case 'bold':       chain.toggleBold().run(); break
      case 'italic':     chain.toggleItalic().run(); break
      case 'underline':  chain.toggleUnderline().run(); break
      case 'strike':     chain.toggleStrike().run(); break
      case 'highlight':  chain.toggleHighlight().run(); break
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        chain.toggleHeading({ level: parseInt(cmd.id[1]) }).run(); break
      case 'hr':         chain.setHorizontalRule().run(); break
      case 'ol':         chain.toggleOrderedList().run(); break
      case 'ul':         chain.toggleBulletList().run(); break
      case 'task':       chain.toggleTaskList().run(); break
      case 'quote': {
        const sel = editor.state.selection
        const text = sel && sel.from !== sel.to
          ? editor.state.doc.textBetween(sel.from, sel.to) : '引用内容'
        chain.insertContent(`<blockquote class="lz-insert lz-insert-quote" data-insert="quote"><p>${escapeHtml(text)}</p></blockquote>`).run()
        break
      }
      case 'footnote':   chain.insertContent('<sup class="lz-insert-footnote-ref" data-insert="footnote">[^1]</sup>').run(); break
      case 'link':       setInsertPanel('link'); break
      case 'image':      setInsertPanel('image'); break
      case 'emoji':      setInsertPanel('emoji'); break
      case 'code':       setInsertPanel('code'); break
      case 'math':       setInsertPanel('formula'); break
      case 'table':      setInsertPanel('table'); break
      case 'chart':      setInsertPanel('chart'); break
      case 'toc': {
        const headings: string[] = []
        editor.state.doc.descendants((n: any) => {
          if (n.type.name === 'heading') headings.push(' '.repeat(n.attrs.level - 1) + '- ' + n.textContent)
          return true
        })
        const tocBody = headings.length
          ? headings.map(h => `<p>${escapeHtml(h)}</p>`).join('')
          : '<p>暂无标题</p>'
        chain.insertContent(`<blockquote class="lz-insert lz-insert-toc" data-insert="toc"><p><strong>目录</strong></p>${tocBody}</blockquote><p></p>`).run()
        break
      }
    }
  }, [editor, onClose, removeSlashQuery, setInsertPanel])

  // 键盘
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!visible) return
    if (e.key === 'ArrowRight')  { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + COLS, filtered.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - COLS, 0)) }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const cmd = filtered[selectedIndex]
      if (cmd) executeCommand(cmd)
    } else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }, [filtered, selectedIndex, onClose, visible, executeCommand])

  useEffect(() => {
    if (!visible) return
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [visible, handleKeyDown])

  if (!visible) return null

  const rawX = effectivePosition.x
  const rawY = effectivePosition.y

  // 边界检测：避免超出右边缘和底边缘
  const availW = window.innerWidth
  const availH = window.innerHeight
  const padding = 8
  const listH = Math.min(filtered.length * 48 + 36 + (filter ? 34 : 0), 340)

  // X 坐标：保证不超出右边界
  const x = Math.min(Math.max(padding, rawX), availW - PANEL_W - padding)
  // Y 坐标：优先显示在光标下方，溢出时显示在上方
  const y = (rawY + listH + padding) > availH
    ? Math.max(padding, rawY - listH)
    : rawY

  return (
    <div
      ref={panelRef}
      className="slash-command"
      style={{ left: x, top: y, width: PANEL_W }}
    >
      {/* 搜索栏 */}
      {filter && (
        <div className="slash-search-bar">
          <span className="remix ri-search-line slash-search-icon"></span>
          <span className="slash-search-query">{filter}</span>
          <span className="slash-search-count">{filtered.length} 项</span>
        </div>
      )}
      {/* 命令列表 */}
      <div ref={listRef} className="slash-command-list">
        {filtered.length === 0 ? (
          <div className="slash-command-empty">
            <span className="remix ri-question-line"></span>
            无匹配结果
          </div>
        ) : (
          <div className="slash-grid">
            {filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                data-idx={i}
                className={`slash-cell${i === selectedIndex ? ' active' : ''}`}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className={`remix ${cmd.icon} slash-cell-icon`}></span>
                <span className="slash-cell-label">
                  {filter ? (
                    <>
                      {cmd.label.split(new RegExp(`(${filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, j) =>
                        part.toLowerCase() === filter.toLowerCase()
                          ? <mark key={j} className="slash-highlight">{part}</mark>
                          : part
                      )}
                    </>
                  ) : cmd.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* 底部快捷键提示 */}
      <div className="slash-footer">
        <span><kbd>↑↓</kbd> 导航</span>
        <span><kbd>↵</kbd> 执行</span>
        <span><kbd>Esc</kbd> 关闭</span>
      </div>
    </div>
  )
}
