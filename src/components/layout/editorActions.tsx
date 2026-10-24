import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { pickFolderFiles, importFolderFiles } from '../../utils/docImport'

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
  { icon: 'ri-function-fill', label: '数学公式', action: 'math' },
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
  { icon: 'ri-git-merge-line', label: '合并单元格', action: 'merge', disabled: true },
  { icon: 'ri-git-pull-request-line', label: '拆分单元格', action: 'split', disabled: true },
  { icon: 'ri-layout-column-line', label: '切换标题列', action: 'headerCol', disabled: true },
  { sep: true },
  { icon: 'ri-delete-bin-line', label: '删除表格', action: 'delete', disabled: true },
]

export const MODE_ITEMS: MenuItem[] = [
  { icon: 'ri-eye-2-line', label: '分屏预览', action: 'preview' },
  { icon: 'ri-code-s-line', label: '代码模式', action: 'code' },
  { icon: 'ri-book-open-line', label: '阅读模式', action: 'read' },
]

/** 表格工具项的置灰只和「光标是否在表格内」有关，两个入口共用同一份。 */
export const applyTableItems = (tableActive: boolean): MenuItem[] =>
  TABLE_ITEMS.map(item => (item.disabled ? { ...item, disabled: !tableActive } : item))

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** 光标是否在表格内 —— 表格子菜单的置灰依赖它。 */
export function useTableActive(): boolean {
  const editor = useEditorStore((s: any) => s.editor)
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (!editor) return
    const update = () => setActive(editor.isActive('table'))
    editor.on('selectionUpdate', update)
    update()
    return () => { editor.off('selectionUpdate', update) }
  }, [editor])
  return active
}

/**
 * 同一时刻只开一个飞出菜单：点其它触发器切换，点在菜单外关闭。
 * 返回的 menuRef 挂在 ActionMenu 上，rect 是触发器按钮的位置。
 */
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

/** 编辑动作，供顶栏和左侧 rail 共用，避免两套逻辑漂移。 */
export function useEditorActions() {
  const editor = useEditorStore((s: any) => s.editor)
  const setInsertPanel = useEditorStore((s: any) => s.setInsertPanel)
  const createDoc = useEditorStore((s: any) => s.createDoc)

  const applyCmd = useCallback((cmd: string) => {
    if (!editor) return
    editor.chain().focus()
    const ok = (editor.commands as any)[cmd]?.()
    if (!ok) {
      const markMap: Record<string, string> = {
        bold: 'toggleBold', italic: 'toggleItalic', underline: 'toggleUnderline',
        strikeThrough: 'toggleStrike', highlight: 'toggleHighlight',
      }
      const fn = markMap[cmd]
      if (fn) (editor.commands as any)[fn]()
    }
  }, [editor])

  const formatAction = useCallback((action: string) => {
    if (!editor) return
    const chain = editor.chain().focus()
    if (action === 'link') { setInsertPanel('link'); return }
    if (action === 'image') { setInsertPanel('image'); return }
    switch (action) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': {
        const level = parseInt(action[1])
        const selected = editor.state.selection
        const hasText = selected && selected.from !== selected.to
        if (!hasText) chain.insertContent(`<h${level}>标题 ${level}</h${level}>`)
        else chain.toggleHeading({ level })
        break
      }
      case 'clear': chain.unsetAllMarks().clearNodes(); break
      case 'hr': chain.setHorizontalRule(); break
      case 'ol': chain.toggleOrderedList(); break
      case 'ul': chain.toggleBulletList(); break
      case 'task': chain.toggleTaskList(); break
      case 'sup': chain.toggleSuperscript(); break
      case 'sub': chain.toggleSubscript(); break
    }
    chain.run()
  }, [editor, setInsertPanel])

  const insertAction = useCallback((action: string) => {
    if (!editor) return
    const chain = editor.chain().focus()
    switch (action) {
      case 'toc': {
        const headings: string[] = []
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === 'heading') {
            headings.push(' '.repeat(node.attrs.level - 1) + '- ' + node.textContent)
          }
          return true
        })
        const tocBody = headings.length > 0
          ? headings.map(h => `<p>${escapeHtml(h)}</p>`).join('')
          : '<p>暂无标题</p>'
        chain.insertContent(
          `<blockquote class="lz-insert lz-insert-toc" data-insert="toc"><p><strong>目录</strong></p>${tocBody}</blockquote><p></p>`
        )
        break
      }
      case 'quote': {
        const sel = editor.state.selection
        const text = sel && sel.from !== sel.to ? editor.state.doc.textBetween(sel.from, sel.to) : '引用内容'
        chain.insertContent(`<blockquote class="lz-insert lz-insert-quote" data-insert="quote"><p>${escapeHtml(text)}</p></blockquote>`)
        break
      }
      case 'footnote':
        chain.insertContent('<sup class="lz-insert-footnote-ref" data-insert="footnote">[^1]</sup>')
        break
      case 'hr':
        chain.setHorizontalRule()
        break
      case 'blockquote':
        chain.toggleBlockquote()
        break
      case 'code':
        setInsertPanel('code'); return
      case 'math':
        setInsertPanel('formula'); return
      case 'chart':
        setInsertPanel('chart'); return
      case 'emoji':
        setInsertPanel('emoji'); return
    }
    chain.run()
  }, [editor, setInsertPanel])

  const tableAction = useCallback((action: string) => {
    if (!editor) return
    if (action === 'insert') { setInsertPanel('table'); return }
    const chain = editor.chain().focus()
    switch (action) {
      case 'colBefore': chain.addColumnBefore(); break
      case 'col': chain.addColumnAfter(); break
      case 'row': chain.addRowAfter(); break
      case 'delCol': chain.deleteColumn(); break
      case 'delRow': chain.deleteRow(); break
      case 'merge': chain.mergeCells(); break
      case 'split': chain.splitCell(); break
      case 'headerCol': chain.toggleHeaderColumn(); break
      case 'delete': chain.deleteTable(); break
      case 'autoW': chain.fixTables(); break
    }
    chain.run()
  }, [editor, setInsertPanel])

  const modeAction = useCallback((action: string) => {
    const st = useEditorStore.getState()
    switch (action) {
      case 'preview': st.setOpenPanel(st.openPanel === 'preview' ? 'none' : 'preview'); break
      case 'code': st.setAppMode('code'); break
      case 'read': st.setAppMode('read'); break
    }
  }, [])

  const newDocument = useCallback(() => {
    createDoc()
    const current = useEditorStore.getState().editor
    if (current) current.chain().focus().clearContent().run()
    useEditorStore.getState().setLastEditTime(Date.now())
  }, [createDoc])

  const openFileDialog = useCallback(() => useEditorStore.getState().setOpenPanel('file'), [])

  /** 打开文件夹并批量导入其中的 Markdown 文件（快捷键 Ctrl/⌘+Shift+O）。 */
  const openFolderDialog = useCallback(async () => {
    const files = await pickFolderFiles()
    if (files) await importFolderFiles(files)
  }, [])

  return { editor, applyCmd, formatAction, insertAction, tableAction, modeAction, newDocument, openFileDialog, openFolderDialog }
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
