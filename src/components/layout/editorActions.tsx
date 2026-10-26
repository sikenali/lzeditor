import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { pickFolderFiles, importFolderFiles } from '../../utils/docImport'
import { getCM6Editor } from '../editor/codemirror/registry'
import { runTableOp, type TableOp } from '../editor/codemirror/table-edit'
import type { FormatCommand } from '../editor/codemirror/commands'

export interface MenuItem {
  icon?: string
  label?: string
  action?: string
  sep?: boolean
  disabled?: boolean
}

export const NEW_ITEMS: MenuItem[] = [
  { icon: 'ri-file-add-line', label: '新建文档', action: 'new' },
  { icon: 'ri-folder-open-line', label: '新建文件-模板', action: 'open' },
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
  { icon: 'ri-superscript', label: '上角标', action: 'sup' },
  { icon: 'ri-subscript', label: '下角标', action: 'sub' },
]

export const INSERT_ITEMS: MenuItem[] = [
  { icon: 'ri-menu-line', label: '目录', action: 'toc' },
  { icon: 'ri-double-quotes-l', label: '引言', action: 'quote' },
  { icon: 'ri-bookmark-line', label: '脚注', action: 'footnote' },
  { icon: 'ri-emotion-line', label: '表情', action: 'emoji' },
  { icon: 'ri-double-quotes-r', label: '块引用', action: 'blockquote' },
  { icon: 'ri-code-box-line', label: '代码块', action: 'code' },
  { icon: 'ri-function-fill', label: '数学公式', action: 'formula' },
  { icon: 'ri-bar-chart-2-line', label: '图表', action: 'chart' },
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
  { icon: 'ri-delete-bin-line', label: '删除表格', action: 'delete', disabled: true },
]

export const MODE_ITEMS: MenuItem[] = [
  { icon: 'ri-eye-2-line', label: '预览模式', action: 'preview' },
  { icon: 'ri-code-s-line', label: '代码模式', action: 'code' },
  { icon: 'ri-palette-line', label: '排版模式', action: 'style' },
  { icon: 'ri-book-open-line', label: '阅读模式', action: 'read' },
]

/** 表格工具项的置灰只和「光标是否在表格内」有关，两个入口共用同一份。 */
export const applyTableItems = (tableActive: boolean): MenuItem[] =>
  TABLE_ITEMS.map(item => (item.disabled ? { ...item, disabled: !tableActive } : item))

/** 光标是否在表格内 —— 表格子菜单的置灰依赖它。 */
export function useTableActive(): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let alive = true
    let unbind: (() => void) | null = null
    let tries = 0
    const tick = () => {
      try {
        const cm = getCM6Editor()
        if (!cm) { setActive(false); return }
        const { from } = cm.view.state.selection.main
        setActive(/^\s*\|.*\|\s*$/.test(cm.view.state.doc.lineAt(from).text))
      } catch { setActive(false) }
    }
    // CM6 是懒挂载的，第一次进工具栏时可能还没实例，轮询几次再挂监听
    const attach = () => {
      if (!alive) return
      const cm = getCM6Editor()
      if (!cm) {
        if (tries++ > 25) return
        setTimeout(attach, 200)
        return
      }
      tick()
      unbind = cm.onSelection(tick)
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
  underline: 'underline', highlight: 'highlight', toggleHighlight: 'highlight',
  code: 'code', link: 'link', image: 'image', quote: 'quote',
  'bullet-list': 'bullet-list', 'numbered-list': 'numbered-list', 'task-list': 'task-list',
  'code-block': 'code-block', table: 'table', rule: 'rule', hr: 'rule',
  h1: 'heading-1', h2: 'heading-2', h3: 'heading-3', h4: 'heading-4', h5: 'heading-5', h6: 'heading-6',
  paragraph: 'paragraph',
}

const FORMAT_MAP: Record<string, FormatCommand> = {
  h1: 'heading-1', h2: 'heading-2', h3: 'heading-3', h4: 'heading-4', h5: 'heading-5', h6: 'heading-6',
  clear: 'clear', hr: 'rule', ol: 'numbered-list', ul: 'bullet-list', task: 'task-list',
  sup: 'sup', sub: 'sub', quote: 'quote', toc: 'toc', footnote: 'footnote',
  link: 'link', image: 'image',
}

const INSERT_MAP: Record<string, FormatCommand> = {
  toc: 'toc', quote: 'quote', blockquote: 'quote', footnote: 'footnote', hr: 'rule',
}

const PANEL_ACTIONS = new Set(['link', 'image', 'code', 'formula', 'chart', 'emoji', 'table'])

/** 编辑动作，供顶栏和左侧 rail 共用，避免两套逻辑漂移。 */
export function useEditorActions() {
  const setInsertPanel = useEditorStore((s: any) => s.setInsertPanel)
  const createDoc = useEditorStore((s: any) => s.createDoc)

  // 无映射的动作不静默失败：插入类改为打开对应面板
  const runMapped = useCallback((action: string, map: Record<string, FormatCommand>): boolean => {
    const cm = getCM6Editor()
    if (!cm) return false
    const fc = map[action]
    if (!fc) {
      if (PANEL_ACTIONS.has(action)) setInsertPanel(action)
      return true
    }
    return cm.run(fc)
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
    const cm = getCM6Editor()
    if (!cm) return
    runTableOp(cm.view, action as TableOp)
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
  }, [])

  const newDocument = useCallback(() => {
    createDoc()
    useEditorStore.getState().setLastEditTime(Date.now())
  }, [createDoc])

  const openFileDialog = useCallback(() => useEditorStore.getState().setOpenPanel('file'), [])

  /** 打开文件夹并批量导入其中的 Markdown 文件（快捷键 Ctrl/⌘+Shift+O）。 */
  const openFolderDialog = useCallback(async () => {
    const files = await pickFolderFiles()
    if (files) await importFolderFiles(files)
  }, [])

  return { applyCmd, formatAction, insertAction, tableAction, modeAction, newDocument, openFileDialog, openFolderDialog }
}

/** 飞出菜单。align='right' 贴触发器右侧（左侧 rail 用），'below' 贴下方（顶栏用）。 */
export const ActionMenu: React.FC<{
  refEl: React.RefObject<HTMLDivElement>
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
