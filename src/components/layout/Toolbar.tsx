import React, { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'
import { useSettingsStore } from '../../store/settingsStore'
import { BeautifyDialog } from '../panels/BeautifyDialog'

type MenuKey = 'format' | 'table' | 'insert' | 'supsub' | 'preview' | 'export' | null

const FORMAT_ITEMS = [
  { icon: 'ri-h-1', label: '标题 1', action: 'h1' },
  { icon: 'ri-h-2', label: '标题 2', action: 'h2' },
  { icon: 'ri-h-3', label: '标题 3', action: 'h3' },
  { icon: 'ri-h-4', label: '标题 4', action: 'h4' },
  { icon: 'ri-h-5', label: '标题 5', action: 'h5' },
  { sep: true },
  { icon: 'ri-eraser-fill', label: '清除格式', action: 'clear' },
  { sep: true },
  { icon: 'ri-separator', label: '分割线', action: 'hr' },
  { icon: 'ri-link', label: '链接', action: 'link' },
  { icon: 'ri-image-line', label: '图片', action: 'image' },
  { sep: true },
  { icon: 'ri-list-ordered', label: '有序列表', action: 'ol' },
  { icon: 'ri-list-unordered', label: '无序列表', action: 'ul' },
  { icon: 'ri-task-line', label: '任务列表', action: 'task' },
]

const INSERT_ITEMS = [
  { icon: 'ri-menu-line', label: '目录', action: 'toc' },
  { icon: 'ri-double-quotes-l', label: '引言', action: 'quote' },
  { icon: 'ri-superscript', label: '脚注', action: 'footnote' },
  { icon: 'ri-bar-chart-2-line', label: '图表', action: 'chart' },
  { icon: 'ri-emotion-line', label: '表情图标', action: 'emoji' },
  { sep: true },
  { icon: 'ri-separator', label: '分割线', action: 'hr' },
  { icon: 'ri-double-quotes-l', label: '块引用', action: 'blockquote' },
  { icon: 'ri-code-box-line', label: '代码块', action: 'code' },
  { icon: 'ri-function-fill', label: '数学公式', action: 'math' },
]

const TABLE_ITEMS = [
  { icon: 'ri-table-2', label: '插入表格', action: 'insert' },
  { sep: true },
  { icon: 'ri-insert-column-left', label: '在左侧插入列', action: 'colBefore' },
  { icon: 'ri-insert-column-right', label: '在右侧插入列', action: 'col' },
  { icon: 'ri-insert-row-bottom', label: '在下方插入行', action: 'row' },
  { icon: 'ri-delete-column', label: '删除列', action: 'delCol' },
  { icon: 'ri-delete-row', label: '删除行', action: 'delRow' },
  { sep: true },
  { icon: 'ri-git-merge-line', label: '合并单元格', action: 'merge' },
  { icon: 'ri-git-pull-request-line', label: '拆分单元格', action: 'split' },
  { icon: 'ri-layout-column-line', label: '切换标题列', action: 'headerCol' },
  { sep: true },
  { icon: 'ri-delete-bin-line', label: '删除表格', action: 'delete' },
  { icon: 'ri-expand-left-right-line', label: '修复表格布局', action: 'autoW' },
]

const SUPSUB_ITEMS = [
  { icon: 'ri-superscript', label: '上角标', action: 'sup' },
  { icon: 'ri-subscript', label: '下角标', action: 'sub' },
]

const PREVIEW_ITEMS = [
  { icon: 'ri-edit-2-line', label: '编辑模式', action: 'edit' },
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
  const setInsertPanel = useEditorStore((s: any) => s.setInsertPanel)
  const showOutline = useEditorStore((s: any) => s.showOutline)
  const showPreview = useEditorStore((s: any) => s.showPreview)
  const showLibrary = useEditorStore((s: any) => s.showLibrary)
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)
  const setShowPreview = useEditorStore((s: any) => s.setShowPreview)
  const setShowLibrary = useEditorStore((s: any) => s.setShowLibrary)
  const setReadMode = useEditorStore((s: any) => s.setReadMode)
  const codeMode = useEditorStore((s: any) => s.codeMode)
  const setCodeMode = useEditorStore((s: any) => s.setCodeMode)
  const editor = useEditorStore((s: any) => s.editor)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const createDoc = useEditorStore((s: any) => s.createDoc)
  const compactToolbar = useSettingsStore((s) => s.showAllToolbarButtons)
  const showToolbarLabels = useSettingsStore((s) => s.showToolbarLabels)

    const [menuOpen, setMenuOpen] = useState<MenuKey>(null)
    const [showBeautifyDialog, setShowBeautifyDialog] = useState(false)
   const menuRef = useRef<HTMLDivElement>(null)
   const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

   // Close menu on outside click
   useEffect(() => {
     const handler = (e: MouseEvent) => {
       if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
         setMenuOpen(null)
       }
     }
     document.addEventListener('mousedown', handler)
     return () => document.removeEventListener('mousedown', handler)
   }, [])

   const openMenu = (key: MenuKey) => {
     if (menuTimerRef.current) clearTimeout(menuTimerRef.current)
     setMenuOpen(key)
   }

  const closeMenu = () => {
    menuTimerRef.current = setTimeout(() => setMenuOpen(null), 400)
  }

  const applyCmd = (cmd: string) => {
    if (!editor) return
    editor.chain().focus()
    const ok = (editor.commands as any)[cmd]?.()
    if (!ok) {
      // Fall back to mark toggle for known format names
      const markMap: Record<string, string> = { bold: 'toggleBold', italic: 'toggleItalic', underline: 'toggleUnderline', strikeThrough: 'toggleStrike' }
      const fn = markMap[cmd]
      if (fn) (editor.commands as any)[fn]()
    }
  }

  const handleNewFile = React.useCallback(() => {
    // createDoc handles naming automatically (Untitled-1.md, Untitled-2.md, ...)
    const id = createDoc()
    const currentEditor = useEditorStore.getState().editor
    if (currentEditor) {
      currentEditor.chain().focus().clearContent().run()
    }
    useEditorStore.getState().setLastEditTime(Date.now())
  }, [createDoc])

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
      case 'chart':
        setInsertPanel('chart')
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
      case 'code': {
        setInsertPanel('code')
        return
      }
      case 'math': {
        setInsertPanel('formula')
        return
      }
      case 'chart': {
        setInsertPanel('chart')
        return
      }
      case 'emoji': {
        setInsertPanel('emoji')
        return
      }
    }
  }

  const handleTableAction = (action: string) => {
    setMenuOpen(null)
    if (!editor) return
    const chain = editor.chain().focus()
    switch (action) {
      case 'insert': {
        setInsertPanel('table')
        break
      }
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

  const handlePreviewAction = (action: string) => {
    setMenuOpen(null)
    switch (action) {
      case 'edit':
        setCodeMode(false)
        setReadMode(false)
        setShowPreview(useSettingsStore.getState().previewModeEnabled !== false)
        break
      case 'code':
        setCodeMode(true)
        setReadMode(false)
        setShowPreview(useSettingsStore.getState().previewModeEnabled !== false)
        break
      case 'read':
        setCodeMode(false)
        setReadMode(true)
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

  // Submenu component
  const SubMenu: React.FC<{ menuKey: MenuKey; items: { label?: string; action?: string; icon?: string; sep?: boolean }[]; onAction: (a: string) => void }> = ({ menuKey, items, onAction }) => {
    if (menuOpen !== menuKey) return null
    return (
      <div className="toolbar-submenu" ref={menuRef}>
        {items.map((item, i) =>
          item.sep
            ? <div key={i} className="toolbar-submenu-sep" />
            : <button key={i} className="toolbar-submenu-item" onClick={() => { onAction(item.action!); setMenuOpen(null) }}>
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
           <button className={`toolbar-btn ${showLibrary ? 'active' : ''}`} onClick={() => setShowLibrary(!showLibrary)}>
             <span className="remix toolbar-icon ri-archive-2-line"></span>
             <span className="toolbar-label">文档库</span>
           </button>
           <button className="toolbar-btn" onClick={handleNewFile}>
             <span className="remix toolbar-icon ri-file-add-line"></span>
             <span className="toolbar-label">新建</span>
           </button>
           <button className={`toolbar-btn ${showOutline ? 'active' : ''}`} onClick={() => setShowOutline(!showOutline)}>
             <span className="remix toolbar-icon ri-list-unordered"></span>
             <span className="toolbar-label">大纲</span>
           </button>
             <div className="toolbar-menu-btn" onMouseEnter={() => openMenu('preview')} onMouseLeave={closeMenu}>
               <button className={`toolbar-btn ${showPreview || codeMode ? 'active' : ''}`}>
                 <span className="remix toolbar-icon ri-eye-2-fill"></span>
                 <span className="toolbar-label">模式</span>
                 <span className="toolbar-menu-dot"></span>
               </button>
               <SubMenu menuKey="preview" items={PREVIEW_ITEMS} onAction={handlePreviewAction} />
             </div>
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

            <div className="toolbar-menu-btn" onMouseEnter={() => openMenu('format')} onMouseLeave={closeMenu}>
              <button className="toolbar-btn">
                <span className="remix toolbar-icon ri-text-wrap"></span>
                <span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>格式</span>
                <span className="toolbar-menu-dot"></span>
              </button>
              <SubMenu menuKey="format" items={FORMAT_ITEMS} onAction={handleFormatAction} />
            </div>

            <button className="toolbar-btn" onClick={() => setInsertPanel('image')}><span className="remix toolbar-icon ri-image-line"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>图片</span></button>
            <button className="toolbar-btn" onClick={() => setInsertPanel('link')}><span className="remix toolbar-icon ri-link"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>链接</span></button>

            <div className="toolbar-menu-btn" onMouseEnter={() => openMenu('table')} onMouseLeave={closeMenu}>
              <button className="toolbar-btn">
                <span className="remix toolbar-icon ri-table-2"></span>
                <span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>表格</span>
                <span className="toolbar-menu-dot"></span>
              </button>
              <SubMenu menuKey="table" items={TABLE_ITEMS} onAction={handleTableAction} />
            </div>

            <div className="toolbar-menu-btn" onMouseEnter={() => openMenu('insert')} onMouseLeave={closeMenu}>
              <button className="toolbar-btn">
                <span className="remix toolbar-icon ri-add-circle-line"></span>
                <span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>插入</span>
                <span className="toolbar-menu-dot"></span>
              </button>
              <SubMenu menuKey="insert" items={INSERT_ITEMS} onAction={handleInsertAction} />
            </div>

            {!compactToolbar && <>
              <button className="toolbar-btn" onClick={() => setInsertPanel('emoji')}><span className="remix toolbar-icon ri-emotion-line"></span><span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>表情</span></button>
              <div className="toolbar-menu-btn" onMouseEnter={() => openMenu('supsub')} onMouseLeave={closeMenu}>
                <button className="toolbar-btn">
                  <span className="remix toolbar-icon ri-superscript"></span>
                  <span className={`toolbar-label${!showToolbarLabels ? ' toolbar-label-hidden' : ''}`}>角标</span>
                  <span className="toolbar-menu-dot"></span>
                </button>
                <SubMenu menuKey="supsub" items={SUPSUB_ITEMS} onAction={(a) => { handleFormatAction(a); setMenuOpen(null) }} />
              </div>
            </>}
          </div>

         {/* ── Right ── */}
         <div className="toolbar-group">
           {!compactToolbar && <button className="toolbar-btn" onClick={() => useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })}>
             <span className="remix toolbar-icon ri-openai-fill"></span>
             <span className="toolbar-label">AI</span>
           </button>}
           <button className={`toolbar-btn ${openPanel === 'history' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'history' ? 'none' : 'history')}>
             <span className="remix toolbar-icon ri-history-fill"></span>
             <span className="toolbar-label">历史</span>
           </button>
            <button className={`toolbar-btn ${openPanel === 'export' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'export' ? 'none' : 'export')}>
              <span className="remix toolbar-icon ri-download-2-line"></span>
              <span className="toolbar-label">导出</span>
            </button>
           <button className={`toolbar-btn ${openPanel === 'settings' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'settings' ? 'none' : 'settings')}>
             <span className="remix toolbar-icon ri-settings-3-fill"></span>
             <span className="toolbar-label">设置</span>
           </button>
         </div>
       </div>

      {showBeautifyDialog && <BeautifyDialog onClose={() => setShowBeautifyDialog(false)} />}
    </>
  )
}
