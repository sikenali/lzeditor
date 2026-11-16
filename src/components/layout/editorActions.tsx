import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { pickFolderFiles, importFolderFiles } from '../../utils/docImport'
import { getEditorFacade } from '../editor/facade/registry'
import { toast } from '../../utils/toast'

export interface MenuItem {
  icon?: string
  label?: string
  action?: string
  sep?: boolean
  disabled?: boolean
}

/** 格式/插入命令名（yeli 适配层：action → 命令名 → YELI_COMMAND → facade）。 */
type FormatCommand = string

export const NEW_ITEMS: MenuItem[] = [
  { icon: 'ri-file-add-line', label: '新建文档', action: 'new' },
  { icon: 'ri-folder-line', label: '打开文件夹…', action: 'openFolder' },
]

export const FORMAT_ITEMS: MenuItem[] = [
  { icon: 'ri-h-1', label: '标题 1', action: 'h1' },
  { icon: 'ri-h-2', label: '标题 2', action: 'h2' },
  { icon: 'ri-h-3', label: '标题 3', action: 'h3' },
  { icon: 'ri-h-4', label: '标题 4', action: 'h4' },
  { icon: 'ri-h-5', label: '标题 5', action: 'h5' },
  { sep: true },
  { icon: 'ri-eraser-fill', label: '清除格式', action: 'clear' },
  { icon: 'ri-link', label: '链接', action: 'link' },
  { icon: 'ri-image-line', label: '图片', action: 'image' },
  { sep: true },
  { icon: 'ri-list-ordered', label: '有序列表', action: 'ol' },
  { icon: 'ri-list-unordered', label: '无序列表', action: 'ul' },
  { icon: 'ri-task-line', label: '任务列表', action: 'task' },
  // 上标/下标 markdown 无法在 yeli 表达，不提供（见 B3）。
]

export const INSERT_ITEMS: MenuItem[] = [
  { icon: 'ri-double-quotes-l', label: '引言', action: 'quote' },
  { icon: 'ri-emotion-line', label: '表情', action: 'emoji' },
  { icon: 'ri-double-quotes-r', label: '块引用', action: 'blockquote' },
  { icon: 'ri-code-box-line', label: '代码块', action: 'code' },
  { icon: 'ri-function-fill', label: '数学公式', action: 'formula' },
  { icon: 'ri-bar-chart-2-line', label: '图表', action: 'chart' },
  // 目录/脚注 yeli 无插入命令，不提供（见 B3）。
]

export const TABLE_ITEMS: MenuItem[] = [
  { icon: 'ri-table-2', label: '插入表格', action: 'insert' },
  { sep: true },
  { icon: 'ri-insert-column-left', label: '左侧插入列', action: 'colBefore', disabled: true },
  { icon: 'ri-insert-column-right', label: '右侧插入列', action: 'col', disabled: true },
  { icon: 'ri-insert-row-bottom', label: '下方插入行', action: 'row', disabled: true },
  { icon: 'ri-delete-column', label: '删除列', action: 'delCol', disabled: true },
  { icon: 'ri-delete-row', label: '删除行', action: 'delRow', disabled: true },
  { sep: true },
  // markdown 无法表达单元格合并（需要 HTML colspan），不提供合并/拆分
  { icon: 'ri-layout-column-line', label: '切换标题行', action: 'headerRow', disabled: true },
  { sep: true },
  // yeli 无 table 删除命令，保持禁用（不提供无效果入口，见 applyTableItems）
  { icon: 'ri-delete-bin-line', label: '删除表格', action: 'delete', disabled: true },
]

export const MODE_ITEMS: MenuItem[] = [
  { icon: 'ri-eye-2-line', label: '预览模式', action: 'preview' },
  { icon: 'ri-code-s-line', label: '代码模式', action: 'code' },
  { icon: 'ri-article-line', label: 'WYSIWYG 模式', action: 'wysiwyg' },
  { icon: 'ri-palette-line', label: '排版模式', action: 'style' },
  { icon: 'ri-book-open-line', label: '阅读模式', action: 'read' },
]

/**
 * 表格工具项的置灰只和「光标是否在表格内」有关，两个入口共用同一份。
 * 仅对 yeli 有结构命令的项（见 TABLE_OP_TO_YELI）在表格内启用；headerRow/delete
 * 无 yeli 命令对应（markdown 无法表达标题行 / yeli 未实现删除表格），保持禁用，
 * 避免「点击无反应」的静默 no-op（见任务 5 B 组）。
 */
export const applyTableItems = (tableActive: boolean): MenuItem[] =>
  TABLE_ITEMS.map(item =>
    item.disabled && item.action && TABLE_OP_TO_YELI[item.action]
      ? { ...item, disabled: !tableActive }
      : item
  )

/**
 * WYSIWYG 模式（Milkdown）下禁用需要 editor facade 的命令型菜单项。
 *
 * Milkdown 是文档模型（ProseMirror），无源码 offset 语义，EditorFacade 的
 * replaceRange/insertText/getSelection 等对它不适用，facade 恒为 null。若菜单项
 * 保持可点会静默 no-op（runMapped 的 `if (!facade) return false`）。诚实做法：
 * 命令型项（标题/清除/列表/引用）禁用；面板型项（图片/链接/代码/公式/图表/
 * 表情/表格，走 App 的 fallback 插入）保留可用。
 */
export const applyWysiwygItems = (items: MenuItem[], wysiwyg: boolean): MenuItem[] =>
  wysiwyg
    ? items.map(item =>
        item.action && !PANEL_ACTIONS.has(item.action)
          ? { ...item, disabled: true }
          : item
      )
    : items

/** 光标是否在表格内 —— 表格子菜单的置灰依赖它。 */
export function useTableActive(): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let alive = true
    let unbind: (() => void) | null = null
    let tries = 0
    const tick = () => {
      try {
        const facade = getEditorFacade()
        if (!facade) { setActive(false); return }
        // getTableContext() 在光标/活动单元格位于表格块内时返回上下文（A1），
        // 否则 null → 置灰。DOM 单元格 + 源码偏移双路径，均不依赖行正则。
        setActive(facade.getTableContext() !== null)
      } catch { setActive(false) }
    }
    // facade 在编辑器挂载时注册，第一次进工具栏时可能还没就绪，轮询几次再挂监听
    const attach = () => {
      if (!alive) return
      const facade = getEditorFacade()
      if (!facade) {
        if (tries++ > 25) return
        setTimeout(attach, 200)
        return
      }
      tick()
      unbind = facade.onSelectionChange(tick)
    }
    attach()
    return () => { alive = false; unbind?.() }
  }, [])
  return active
}

export function useFlyout() {
  const [key, setKey] = useState<string | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setKey(null)
        setRect(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const open = useCallback((k: string, el: HTMLElement | null) => {
    if (!el) return
    if (key === k) { setKey(null); setRect(null); return }
    setKey(k)
    setRect(el.getBoundingClientRect())
  }, [key])

  const close = useCallback(() => { setKey(null); setRect(null) }, [])

  return { key, rect, menuRef, open, close, isOpen: (k: string) => key === k }
}

const CMD_MAP: Record<string, FormatCommand> = {
  bold: 'bold', italic: 'italic', strikeThrough: 'strikethrough', strikethrough: 'strikethrough',
  // 下划线/高亮 markdown 无法在 yeli 表达，按钮已移除（见 B3）。
  code: 'code', link: 'link', image: 'image', quote: 'quote',
  'bullet-list': 'bullet-list', 'numbered-list': 'numbered-list', 'task-list': 'task-list',
  'code-block': 'code-block', table: 'table', rule: 'rule', hr: 'rule',
  h1: 'heading-1', h2: 'heading-2', h3: 'heading-3', h4: 'heading-4', h5: 'heading-5', h6: 'heading-6',
  paragraph: 'paragraph',
}

const FORMAT_MAP: Record<string, FormatCommand> = {
  h1: 'heading-1', h2: 'heading-2', h3: 'heading-3', h4: 'heading-4', h5: 'heading-5', h6: 'heading-6',
  clear: 'clear', hr: 'rule', ol: 'numbered-list', ul: 'bullet-list', task: 'task-list',
  quote: 'quote', link: 'link', image: 'image',
  // 上标/下标/目录/脚注 yeli 无命令，菜单项已移除（见 B3）。
}

const INSERT_MAP: Record<string, FormatCommand> = {
  quote: 'quote', blockquote: 'quote', hr: 'rule',
  // 目录/脚注 yeli 无插入命令，菜单项已移除（见 B3）。
}

const PANEL_ACTIONS = new Set(['link', 'image', 'code', 'formula', 'chart', 'emoji', 'table'])

/**
 * 命令名 → yeli command-registry id。只有 yeli 有对应语义的命令才映射；
 * underline/highlight/sup/sub/toc/footnote 等 markdown 无法在 yeli 表达的命令
 * 不映射（对应按钮/菜单项已在 B3 移除，不再出现「点击无反应」入口）。
 */
const YELI_COMMAND: Partial<Record<FormatCommand, string>> = {
  bold: 'selection.bold',
  italic: 'selection.italic',
  strikethrough: 'selection.strike',
  code: 'selection.code',
  link: 'selection.link',
  clear: 'selection.clear',
  quote: 'insert.quote',
  'bullet-list': 'insert.bullet-list',
  'numbered-list': 'insert.numbered-list',
  'task-list': 'insert.task',
  'code-block': 'insert.code-block',
  table: 'insert.table',
  rule: 'insert.divider',
  'heading-1': 'insert.heading1',
  'heading-2': 'insert.section',
  'heading-3': 'insert.heading3',
  'heading-4': 'insert.heading4',
  'heading-5': 'insert.heading5',
  'heading-6': 'insert.heading6',
  paragraph: 'insert.paragraph',
}

/** 表格结构命令（列/行增删）→ yeli table.* 命令；执行需块上下文，无则安全 no-op。 */
const TABLE_OP_TO_YELI: Partial<Record<string, string>> = {
  colBefore: 'table.insert-column-left',
  col: 'table.insert-column-right',
  row: 'table.insert-row-below',
  delCol: 'table.delete-column',
  delRow: 'table.delete-row',
}

/** 编辑动作，供顶栏和左侧 rail 共用，避免两套逻辑漂移。 */
export function useEditorActions() {
  const setInsertPanel = useEditorStore((s: any) => s.setInsertPanel)
  const createDoc = useEditorStore((s: any) => s.createDoc)

  // 无映射的动作不静默失败：插入类改为打开对应面板
  const runMapped = useCallback((action: string, map: Record<string, FormatCommand>): boolean => {
    const facade = getEditorFacade()
    if (!facade) {
      // WYSIWYG（Milkdown）下无源码 facade：不静默失败，明确提示。
      // 命令型按钮已由 applyWysiwygItems / disabled={wysiwyg} 禁用，此处兜底快捷键等入口。
      if (useEditorStore.getState().wysiwyg) {
        toast('WYSIWYG 模式暂不支持该命令，请在编辑器内使用 Markdown 语法', { type: 'info' })
      }
      return false
    }
    const fc = map[action]
    if (!fc) {
      if (PANEL_ACTIONS.has(action)) setInsertPanel(action)
      return true
    }
    const yeliId = YELI_COMMAND[fc]
    if (!yeliId) return false
    facade.execCommand(yeliId)
    return true
  }, [setInsertPanel])

  const applyCmd = useCallback((cmd: string) => {
    runMapped(cmd, CMD_MAP)
  }, [runMapped])

  const formatAction = useCallback((action: string) => {
    if (PANEL_ACTIONS.has(action)) { setInsertPanel(action); return }
    runMapped(action, FORMAT_MAP)
  }, [setInsertPanel, runMapped])

  const insertAction = useCallback((action: string) => {
    if (PANEL_ACTIONS.has(action)) { setInsertPanel(action); return }
    runMapped(action, INSERT_MAP)
  }, [setInsertPanel, runMapped])

  const tableAction = useCallback((action: string) => {
    if (action === 'insert') { setInsertPanel('table'); return }
    const facade = getEditorFacade()
    if (!facade) return
    const yeliId = TABLE_OP_TO_YELI[action]
    if (!yeliId) return
    // 源码模式无表格块上下文：getTableContext() 恒为 null，此处不可达（菜单项已
    // 因 getTableContext()===null 置灰）。execCommand 的 table.* 分支在 CM6 下
    // 回退为插入 markdown 表格（Review Focus #4），不会静默失败。
    if (!facade.getTableContext()) return
    facade.execCommand(yeliId)
  }, [setInsertPanel])

  // 三模式：预览（左源码 + 右分屏预览，双向滚动同步）/ 代码（全宽源码）/ 排版（左源码 + 右样式预览）
  const modeAction = useCallback((action: string) => {
    const st = useEditorStore.getState()
    if (action === 'preview') {
      const next = !st.showPreview
      st.setShowPreview(next)
      if (next && st.appMode !== 'edit') st.setAppMode('edit')
      return
    }
    if (action === 'code' || action === 'style' || action === 'read') {
      st.setAppMode(st.appMode === action ? 'edit' : action)
    }
    if (action === 'wysiwyg') {
      st.setWysiwyg(!st.wysiwyg)
    }
  }, [])

  const newDocument = useCallback(() => {
    createDoc()
    useEditorStore.getState().setLastEditTime(Date.now())
  }, [createDoc])

  /** 打开文件夹并批量导入其中的 Markdown 文件（快捷键 Ctrl/⌘+Shift+O）。 */
  const openFolderDialog = useCallback(async () => {
    const files = await pickFolderFiles()
    if (files) await importFolderFiles(files)
  }, [])

  // WYSIWYG 模式状态：Toolbar/LeftNav 据此禁用需要 facade 的命令型入口
  const wysiwyg = useEditorStore((s: any) => s.wysiwyg)

  return { applyCmd, formatAction, insertAction, tableAction, modeAction, newDocument, openFolderDialog, wysiwyg }
}

/** 飞出菜单。align='right' 贴触发器右侧（左侧 rail 用），'below' 贴下方（顶栏用）。 */
export const ActionMenu: React.FC<{
  refEl: React.RefObject<HTMLDivElement | null>
  items: MenuItem[]
  anchor: DOMRect | null
  align?: 'below' | 'right'
  onAction: (action: string) => void
}> = ({ refEl, items, anchor, align = 'below', onAction }) => {
  useEffect(() => {
    const el = refEl.current
    if (!el || !anchor) return
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    el.style.top = '-9999px'
    requestAnimationFrame(() => {
      const mw = el.offsetWidth || 180
      const mh = el.offsetHeight || 240
      let left = 0
      let top = 0
      if (align === 'right') {
        left = anchor.right + 6
        if (left + mw > window.innerWidth - 4) left = Math.max(4, anchor.left - mw - 6)
        top = Math.min(Math.max(4, anchor.top), Math.max(4, window.innerHeight - mh - 4))
      } else {
        left = Math.min(Math.max(4, anchor.left), window.innerWidth - mw - 4)
        top = Math.min(Math.max(anchor.bottom + 6, 4), window.innerHeight - mh - 4)
      }
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    })
  }, [anchor, align, refEl])

  return (
    <div ref={refEl} className="toolbar-submenu">
      {items.map((item, i) =>
        item.sep
          ? <div key={i} className="toolbar-submenu-sep" />
          : <button
              key={i}
              className={`toolbar-submenu-item${item.disabled ? ' disabled' : ''}`}
              onClick={() => { if (!item.disabled) onAction(item.action!) }}
            >
              {item.icon && <span className={`remix ${item.icon}`}></span>}
              <span>{item.label}</span>
            </button>
      )}
    </div>
  )
}
