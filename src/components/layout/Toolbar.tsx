import { mdToHtml } from '../../utils/mdToHtml'
import React, { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'
import { useSettingsStore } from '../../store/settingsStore'
import { BeautifyDialog } from '../panels/BeautifyDialog'

type MenuKey = 'format' | 'table' | 'insert' | 'preview' | 'export' | 'mode' | null

const FORMAT_ITEMS = [
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

const INSERT_ITEMS = [
  { icon: 'ri-menu-line', label: '目录', action: 'toc' },
  { icon: 'ri-double-quotes-l', label: '引言', action: 'quote' },
  { icon: 'ri-bookmark-line', label: '脚注', action: 'footnote' },
  { icon: 'ri-emotion-line', label: '表情', action: 'emoji' },
  { icon: 'ri-double-quotes-r', label: '块引用', action: 'blockquote' },
  { icon: 'ri-code-box-line', label: '代码块', action: 'code' },
  { icon: 'ri-function-fill', label: '数学公式', action: 'math' },
  { icon: 'ri-bar-chart-2-line', label: '图表', action: 'chart' },
]

const TABLE_ITEMS = [
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

const MODE_ITEMS = [
  { icon: 'ri-code-s-line', label: '代码模式', action: 'code' },
  { icon: 'ri-book-open-line', label: '阅读模式', action: 'read' },
]

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const Toolbar: React.FC = () => {
  const openPanel = useEditorStore((s: any) => s.openPanel)
  const appMode = useEditorStore((s: any) => s.appMode)
  const setAppMode = useEditorStore((s: any) => s.setAppMode)
  const setInsertPanel = useEditorStore((s: any) => s.setInsertPanel)
  const showOutline = useEditorStore((s: any) => s.showOutline)
  const showPreview = useEditorStore((s: any) => s.showPreview)
  const showLibrary = useEditorStore((s: any) => s.showLibrary)
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)
  const setShowPreview = useEditorStore((s: any) => s.setShowPreview)
  const setShowLibrary = useEditorStore((s: any) => s.setShowLibrary)
  const showSearch = useEditorStore((s: any) => s.showSearch)
  const setShowSearch = useEditorStore((s: any) => s.setShowSearch)
  const editor = useEditorStore((s: any) => s.editor)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const createDoc = useEditorStore((s: any) => s.createDoc)
  const compactToolbar = useSettingsStore((s) => s.showAllToolbarButtons)
  const showToolbarLabels = useSettingsStore((s) => s.showToolbarLabels)

  const [menuOpen, setMenuOpen] = useState<MenuKey>(null)
  const [showBeautifyDialog, setShowBeautifyDialog] = useState(false)
  const [tableActive, setTableActive] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const previewBtnRef = useRef<HTMLButtonElement>(null)
  const formatBtnRef = useRef<HTMLButtonElement>(null)
  const tableBtnRef = useRef<HTMLButtonElement>(null)
  const insertBtnRef = useRef<HTMLButtonElement>(null)
  const modeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navMode = useSettingsStore((s) => s.navMode)
  useEffect(() => {
    if (navMode !== 'left' || !menuOpen || !menuRef.current) {
      if (menuRef.current) {
        menuRef.current.style.position = ''
        menuRef.current.style.left = ''
        menuRef.current.style.top = ''
      }
      return
    }
    const triggerMap: Record<string, React.RefObject<HTMLButtonElement | null>> = {
      preview: previewBtnRef, format: formatBtnRef, table: tableBtnRef,
      insert: insertBtnRef, mode: modeBtnRef,
    }
    const trigger = triggerMap[menuOpen]?.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const el = menuRef.current
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    el.style.top = '-9999px'
    requestAnimationFrame(() => {
      const mw = el.offsetWidth || 180
      const mh = el.offsetHeight || 240
      const left = Math.min(rect.right + 4, vw - mw - 8)
      const top = Math.min(rect.top, vh - mh - 8)
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    })
  }, [menuOpen, navMode])

  useEffect(() => {
    if (!menuOpen && menuRef.current) {
      menuRef.current.style.position = ''
      menuRef.current.style.left = ''
      menuRef.current.style.top = ''
    }
  }, [menuOpen])

  // Track if cursor is inside a table
  useEffect(() => {
    if (!editor) return
    const updateTableActive = () => {
      setTableActive(editor.isActive('table'))
    }
    editor.on('selectionUpdate', updateTableActive)
    updateTableActive()
    return () => {
      editor.off('selectionUpdate', updateTableActive)
    }
  }, [editor])

  const openMenu = (key: MenuKey) => {
    setMenuOpen(menuOpen === key ? null : key)
  }
  const closeMenu = () => setMenuOpen(null)

  const applyCmd = (cmd: string) => {
    if (!editor) return
    editor.chain().focus()
    const ok = (editor.commands as any)[cmd]?.()
    if (!ok) {
      const markMap: Record<string, string> = { bold: 'toggleBold', italic: 'toggleItalic', underline: 'toggleUnderline', strikeThrough: 'toggleStrike', highlight: 'toggleHighlight' }
      const fn = markMap[cmd]
      if (fn) (editor.commands as any)[fn]()
    }
  }

  const handleNewFile = React.useCallback(() => {
    const id = createDoc()
    const currentEditor = useEditorStore.getState().editor
    if (currentEditor) {
      currentEditor.chain().focus().clearContent().run()
    }
    useEditorStore.getState().setLastEditTime(Date.now())
  }, [createDoc])

  const handleOpenFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.txt'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const id = createDoc(file.name.replace(/\.\w+$/, ''), '', undefined)
        const ed = useEditorStore.getState().editor
        if (ed) {
          const html = mdToHtml(text)
          ed.commands.setContent(html)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleFormatAction = (action: string) => {
    setMenuOpen(null)
    if (!editor) return
    const chain = editor.chain().focus()
    switch (action) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': {
        const level = parseInt(action[1])
        const selected = editor.state.selection
        const hasText = selected && selected.from !== selected.to
        if (!hasText) chain.insertContent(`<h${level}>标题 ${level}</h${level}>`).run()
        else chain.toggleHeading({ level }).run()
        break
      }
      case 'clear':
        chain.unsetAllMarks().clearNodes().run()
        break
      case 'hr':
        chain.setHorizontalRule().run()
        break
      case 'link':
        setInsertPanel('link')
        return
      case 'image':
        setInsertPanel('image')
        return
      case 'ol':
        chain.toggleOrderedList().run()
        break
      case 'ul':
        chain.toggleBulletList().run()
        break
      case 'task':
        chain.toggleTaskList().run()
        break
      case 'sup':
        chain.toggleSuperscript().run()
        break
      case 'sub':
        chain.toggleSubscript().run()
        break
    }
  }

  const handleInsertAction = (action: string) => {
    setMenuOpen(null)
    if (!editor) return
    const chain = editor.chain().focus()
    switch (action) {
      case 'toc': {
        const headings: string[] = []
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === 'heading') {
            headings.push(' '.repeat(node.attrs.level - 1) + '- '.repeat(1) + node.textContent)
          }
          return true
        })
        const tocBody = headings.length > 0
          ? headings.map(h => `<p>${escapeHtml(h)}</p>`).join('')
          : '<p>暂无标题</p>'
        chain.insertContent(
          `<blockquote class="lz-insert lz-insert-toc" data-insert="toc"><p><strong>目录</strong></p>${tocBody}</blockquote><p></p>`
        ).run()
        break
      }
      case 'quote': {
        const sel = editor.state.selection
        const text = sel && sel.from !== sel.to ? editor.state.doc.textBetween(sel.from, sel.to) : '引用内容'
        chain.insertContent(`<blockquote class="lz-insert lz-insert-quote" data-insert="quote"><p>${escapeHtml(text)}</p></blockquote>`).run()
        break
      }
      case 'footnote':
        chain.insertContent('<sup class="lz-insert-footnote-ref" data-insert="footnote">[^1]</sup>').run()
        break
      case 'hr':
        chain.setHorizontalRule().run()
        break
      case 'blockquote':
        chain.toggleBlockquote().run()
        break
      case 'code':
        setInsertPanel('code')
        return
      case 'math':
        setInsertPanel('formula')
        return
      case 'chart':
        setInsertPanel('chart')
        return
      case 'emoji':
        setInsertPanel('emoji')
        return
    }
  }

  const handleTableAction = (action: string) => {
    setMenuOpen(null)
    if (!editor) return
    const chain = editor.chain().focus()
    switch (action) {
      case 'insert':
        setInsertPanel('table')
        break
      case 'colBefore':
        chain.addColumnBefore().run()
        break
      case 'col':
        chain.addColumnAfter().run()
        break
      case 'row':
        chain.addRowAfter().run()
        break
      case 'delCol':
        chain.deleteColumn().run()
        break
      case 'delRow':
        chain.deleteRow().run()
        break
      case 'merge':
        chain.mergeCells().run()
        break
      case 'split':
        chain.splitCell().run()
        break
      case 'headerCol':
        chain.toggleHeaderColumn().run()
        break
      case 'delete':
        chain.deleteTable().run()
        break
      case 'autoW':
        chain.fixTables().run()
        break
    }
  }

  const handleModeAction = (action: string) => {
    setMenuOpen(null)
    switch (action) {
      case 'code':
        setAppMode('code')
        break
      case 'read':
        setAppMode('read')
        break
    }
  }

  const handleExportAction = async (action: string) => {
    setMenuOpen(null)
    if (action === 'beautify') {
      setShowBeautifyDialog(true)
      return
    }
  }

  const SubMenu: React.FC<{ menuKey: MenuKey; items: { label?: string; action?: string; icon?: string; sep?: boolean; disabled?: boolean }[]; onAction: (a: string) => void }> = ({ menuKey, items, onAction }) => {
    if (menuOpen !== menuKey) return null
    return (
      <div className="toolbar-submenu" ref={menuRef}>
        {items.map((item, i) =>
          item.sep
            ? <div key={i} className="toolbar-submenu-sep" />
            : <button key={i} className={`toolbar-submenu-item${item.disabled ? ' disabled' : ''}`} onClick={() => { if (!item.disabled) { onAction(item.action!); setMenuOpen(null) } }}>
                {item.icon && <span className={`remix ${item.icon}`}></span>}
                <span>{item.label}</span>
              </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="toolbar">
        {/* ── Left ── */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => setShowLibrary(!showLibrary)}>
            <span className="remix toolbar-icon ri-archive-2-line"></span>
            <span className="toolbar-label">文档库</span>
          </button>
          <div className="toolbar-menu-btn" onClick={() => openMenu('preview')}>
            <button ref={previewBtnRef} className={`toolbar-btn ${menuOpen === 'preview' ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-file-add-line"></span>
              <span className="toolbar-label">新建</span>
              <span className="toolbar-menu-dot"></span>
            </button>
            <SubMenu menuKey="preview" items={[
              { icon: 'ri-file-add-line', label: '新建文档', action: 'new' },
              { icon: 'ri-folder-open-line', label: '打开本地文件', action: 'open' },
            ]} onAction={(a) => { if (a === 'new') handleNewFile(); else handleOpenFile(); setMenuOpen(null) }} />
          </div>
          <button className="toolbar-btn" onClick={() => setShowOutline(!showOutline)}>
            <span className="remix toolbar-icon ri-list-unordered"></span>
            <span className="toolbar-label">大纲</span>
          </button>
          <button className="toolbar-btn" onClick={() => setShowSearch(!showSearch)} title="查找与替换">
            <span className="remix toolbar-icon ri-search-line"></span>
            <span className="toolbar-label">查找</span>
          </button>
        </div>

        {/* ── Middle ── */}
        <div className="toolbar-group toolbar-group--middle">
          {!compactToolbar && <>
            <button className="toolbar-btn" onClick={() => applyCmd('bold')}><span className="remix toolbar-icon ri-bold"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>粗体</span></button>
            <button className="toolbar-btn" onClick={() => applyCmd('italic')}><span className="remix toolbar-icon ri-italic"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>斜体</span></button>
            <button className="toolbar-btn" onClick={() => applyCmd('underline')}><span className="remix toolbar-icon ri-underline"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>下划线</span></button>
            <button className="toolbar-btn" onClick={() => applyCmd('strikeThrough')}><span className="remix toolbar-icon ri-strikethrough"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>删除线</span></button>
            <button className="toolbar-btn" onClick={() => applyCmd('toggleHighlight')}><span className="remix toolbar-icon ri-mark-pen-fill"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>高亮</span></button>
          </>}

          <div className="toolbar-menu-btn" onClick={() => openMenu('format')}>
            <button ref={formatBtnRef} className={`toolbar-btn format-btn ${menuOpen === 'format' ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-text-wrap"></span>
              <span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>格式</span>
              <span className="toolbar-menu-dot"></span>
            </button>
            <SubMenu menuKey="format" items={FORMAT_ITEMS} onAction={handleFormatAction} />
          </div>

          <button className="toolbar-btn" onClick={() => setInsertPanel('image')}><span className="remix toolbar-icon ri-image-line"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>图片</span></button>
          <button className="toolbar-btn" onClick={() => setInsertPanel('link')}><span className="remix toolbar-icon ri-link"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>链接</span></button>

          <div className="toolbar-menu-btn" onClick={() => openMenu('table')}>
            <button ref={tableBtnRef} className={`toolbar-btn ${menuOpen === 'table' ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-table-2"></span>
              <span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>表格</span>
              <span className="toolbar-menu-dot"></span>
            </button>
            <SubMenu menuKey="table" items={TABLE_ITEMS.map(item => item.disabled ? { ...item, disabled: !tableActive } : item)} onAction={handleTableAction} />
          </div>

          <div className="toolbar-menu-btn" onClick={() => openMenu('insert')}>
            <button ref={insertBtnRef} className={`toolbar-btn ${menuOpen === 'insert' ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-add-circle-line"></span>
              <span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>插入</span>
              <span className="toolbar-menu-dot"></span>
            </button>
            <SubMenu menuKey="insert" items={INSERT_ITEMS} onAction={handleInsertAction} />
          </div>
        </div>

        {/* ── Right ── */}
        <div className={`toolbar-group${compactToolbar ? ' toolbar-group--compact' : ''}`}>
          {!compactToolbar && <button className="toolbar-btn" onClick={() => useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })}>
            <span className="remix toolbar-icon ri-openai-fill"></span>
            <span className="toolbar-label">AI</span>
          </button>}
          <div className="toolbar-menu-btn" onClick={() => openMenu('mode')}>
            <button ref={modeBtnRef} className={`toolbar-btn ${menuOpen === 'mode' ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-eye-2-fill"></span>
              <span className="toolbar-label">模式</span>
              <span className="toolbar-menu-dot"></span>
            </button>
            <SubMenu menuKey="mode" items={MODE_ITEMS} onAction={(a) => { handleModeAction(a); setMenuOpen(null) }} />
          </div>
          <button className="toolbar-btn" onClick={() => setAppMode(appMode === 'history' ? 'edit' : 'history')}>
            <span className="remix toolbar-icon ri-history-fill"></span>
            <span className="toolbar-label">历史</span>
          </button>
          <button className="toolbar-btn" onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')}>
            <span className="remix toolbar-icon ri-palette-fill"></span>
            <span className="toolbar-label">样式</span>
          </button>
          <button className="toolbar-btn" onClick={() => setOpenPanel(openPanel === 'export' ? 'none' : 'export')}>
            <span className="remix toolbar-icon ri-download-2-line"></span>
            <span className="toolbar-label">导出</span>
          </button>
          <button className="toolbar-btn" onClick={() => setOpenPanel(openPanel === 'settings' ? 'none' : 'settings')}>
            <span className="remix toolbar-icon ri-settings-3-fill"></span>
            <span className="toolbar-label">设置</span>
          </button>
        </div>
      </div>

      {showBeautifyDialog && <BeautifyDialog onClose={() => setShowBeautifyDialog(false)} />}
    </>
  )
}
