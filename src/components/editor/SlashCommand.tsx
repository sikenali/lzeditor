import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { EditorView } from '@codemirror/view'
import { useEditorStore } from '../../store/editorStore'
import { runFormatCommand, type FormatCommand } from './codemirror/commands'
import { slashRange } from './codemirror/slash'

export interface SlashCommandItem {
  id: string
  icon: string
  label: string
  keywords?: string
  /** 直接插入的 markdown 文本；有它就当片段处理，不走格式命令 */
  body?: string
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
  // 片段
  { id: 'code-inline', icon: 'ri-code-line',   label: '行内代码',  keywords: '代码 code inline', body: '`code`' },
  { id: 'math-inline', icon: 'ri-square-root-2-line', label: '行内公式', keywords: '公式 math inline', body: '$E = mc^2$' },
  { id: 'mermaid',     icon: 'ri-git-branch-line', label: 'Mermaid 图表', keywords: '图表 mermaid diagram', body: '```mermaid\nflowchart LR\n  A --> B\n```\n' },
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

interface SlashCommandProps {
  position: { x: number; y: number }
  visible: boolean
  filter: string
  onClose: () => void
  /** CodeMirror 6 实例，命令直接 dispatch 到它的 view */
  cm?: { view: EditorView } | null
}

const COLS = 3
const PANEL_W = 272

const COMMAND_MAP: Record<string, FormatCommand> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strikethrough',
  highlight: 'highlight',
  h1: 'heading-1', h2: 'heading-2', h3: 'heading-3', h4: 'heading-4', h5: 'heading-5', h6: 'heading-6',
  ol: 'numbered-list',
  ul: 'bullet-list',
  task: 'task-list',
  quote: 'quote',
  hr: 'rule',
  toc: 'toc',
  footnote: 'footnote',
}

const PANEL_MAP: Record<string, string> = {
  link: 'link',
  image: 'image',
  emoji: 'emoji',
  code: 'code',
  math: 'formula',
  table: 'table',
  chart: 'chart',
}

/** 把过滤词在标签里高亮出来。正则从字面量构造，字面量里的特殊字符要先转义。 */
function highlight(label: string, filter: string): React.ReactNode[] {
  if (!filter) return [label]
  const escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return label.split(new RegExp(`(${escaped})`, 'gi')).map((part, j) =>
    part.toLowerCase() === filter.toLowerCase()
      ? <mark key={j} className="slash-highlight">{part}</mark>
      : part
  )
}

export const SlashCommand: React.FC<SlashCommandProps> = ({ position, visible, filter, onClose, cm }) => {
  const setInsertPanel = useEditorStore((s: any) => s.setInsertPanel)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cmRef = useRef(cm)
  cmRef.current = cm

  // 定位：面板贴在光标（"/" + 过滤词）右侧
  const effectivePosition = useMemo(() => {
    const view = cm?.view
    if (!view) return position
    try {
      const { from } = view.state.selection.main
      const coords = view.coordsAtPos(from)
      if (!coords || coords.right === undefined) return position
      return { x: coords.right + 2, y: coords.top - 2 }
    } catch { return position }
  }, [cm, filter, position])

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

  // 删除 "/" 和过滤词
  const removeSlashQuery = useCallback(() => {
    const view = cmRef.current?.view
    if (!view) return
    const range = slashRange(view.state)
    const to = view.state.selection.main.from
    if (!range || range.from >= to) return
    view.dispatch({
      changes: { from: range.from, to },
      selection: { anchor: range.from },
      userEvent: 'input.delete',
    })
  }, [])

  const executeCommand = useCallback((cmd: SlashCommandItem) => {
    onClose()
    const view = cmRef.current?.view
    removeSlashQuery()
    if (!view) return
    if (cmd.dialog) {
      const panel = PANEL_MAP[cmd.id]
      if (panel) setInsertPanel(panel)
      return
    }
    if (cmd.body !== undefined) {
      const { from, to } = view.state.selection.main
      const text = cmd.body
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
        scrollIntoView: true,
        userEvent: 'input.complete',
      })
      view.focus()
      return
    }
    const fc = COMMAND_MAP[cmd.id]
    if (!fc) return
    runFormatCommand(view, fc)
  }, [onClose, removeSlashQuery, setInsertPanel])

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
      {filter && (
        <div className="slash-search-bar">
          <span className="remix ri-search-line slash-search-icon"></span>
          <span className="slash-search-query">{filter}</span>
          <span className="slash-search-count">{filtered.length} 项</span>
        </div>
      )}
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
                      {highlight(cmd.label, filter)}
                    </>
                  ) : cmd.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="slash-footer">
        <span><kbd>↑↓</kbd> 导航</span>
        <span><kbd>↵</kbd> 执行</span>
        <span><kbd>Esc</kbd> 关闭</span>
      </div>
    </div>
  )
}
