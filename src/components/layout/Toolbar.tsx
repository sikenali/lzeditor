import React, { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'
import { LinkDialog } from '../panels/LinkDialog'
import { ImageDialog } from '../panels/ImageDialog'

type MenuKey = 'format' | 'table' | 'insert' | 'supsub' | 'preview' | null

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
  { icon: 'ri-task', label: '任务列表', action: 'task' },
]

const INSERT_ITEMS = [
  { icon: 'ri-menu-line', label: '目录', action: 'toc' },
  { icon: 'ri-quotation-text', label: '引言', action: 'quote' },
  { icon: 'ri-footprint', label: '脚注', action: 'footnote' },
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
  { icon: 'ri-eye-line', label: '即时预览', action: 'instant' },
  { icon: 'ri-file-code-line', label: '预览 · 样式集', action: 'full' },
  { icon: 'ri-code-s-line', label: '预览 · 源码', action: 'code' },
]

export const Toolbar: React.FC = () => {
  const openPanel = useEditorStore((s: any) => s.openPanel)
  const showOutline = useEditorStore((s: any) => s.showOutline)
  const showPreview = useEditorStore((s: any) => s.showPreview)
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)
  const setShowPreview = useEditorStore((s: any) => s.setShowPreview)
  const setReadMode = useEditorStore((s: any) => s.setReadMode)
  const editor = useEditorStore((s: any) => s.editor)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const isReadMode = useEditorStore((s: any) => s.isReadMode)

  const [menuOpen, setMenuOpen] = useState<MenuKey>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  const toggleMenu = (key: MenuKey) => {
    setMenuOpen(prev => prev === key ? null : key)
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

  const handleNewFile = () => { setTitle(`untitled-${Date.now()}.md`); useEditorStore.getState().setDocPath('') }

  const insertImageFromUrl = (url: string, alt: string) => {
    if (!editor) return
    editor.chain().focus().insertImage({ src: url, alt }).run()
  }

  const handleImageUpload = (file: File) => {
    if (!editor) return
    const reader = new FileReader()
    reader.onload = (ev) => insertImageFromUrl(ev.target?.result as string, file.name)
    reader.readAsDataURL(file)
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
        setShowLinkDialog(true)
        return
      case 'image':
        setShowImageDialog(true)
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
          ? headings.map(h => `<p>${h}</p>`).join('')
          : '<p>暂无标题</p>'
        chain.insertContent(
          `<div data-toc><p><strong>目录</strong></p>${tocBody}</div><p></p>`
        ).run()
        break
      }
      case 'quote': {
        const sel = editor.state.selection
        const text = sel && sel.from !== sel.to ? editor.state.doc.textBetween(sel.from, sel.to) : '引用内容'
        chain.insertContent(`<blockquote><p>${text}</p></blockquote>`).run()
        break
      }
      case 'footnote':
        chain.insertContent('<sup>[^1]</sup>').run()
        break
      case 'hr':
        chain.setHorizontalRule().run()
        break
      case 'blockquote':
        chain.toggleBlockquote().run()
        break
      case 'code': {
        const code = prompt('请输入代码内容:')
        if (code !== null && code !== undefined) {
          const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          chain.insertContent(`<pre><code>${escaped}</code></pre>`).run()
        }
        break
      }
      case 'math': {
        const formula = prompt('输入数学公式 (LaTeX):', 'E = mc^2')
        if (formula) chain.insertMath(formula).run()
        break
      }
    }
  }

  const handleTableAction = (action: string) => {
    setMenuOpen(null)
    if (!editor) return
    const chain = editor.chain().focus()
    switch (action) {
      case 'insert': {
        const r = parseInt(prompt('行数:', '3') || '3')
        const c = parseInt(prompt('列数:', '3') || '3')
        if (r > 0 && c > 0) chain.insertTable({ rows: r, cols: c, withHeaderRow: true }).run()
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
      case 'instant':
        setShowPreview((v: boolean) => !v)
        break
      case 'full':
        setOpenPanel(openPanel === 'preview' ? 'none' : 'preview')
        break
      case 'code':
        setOpenPanel(openPanel === 'preview' ? 'none' : 'preview')
        break
    }
  }

  // Submenu component
  const SubMenu: React.FC<{ key: MenuKey; items: { label: string; action: string; icon?: string; sep?: boolean }[]; onAction: (a: string) => void }> = ({ key, items, onAction }) => {
    if (menuOpen !== key) return null
    return (
      <div className="toolbar-submenu" ref={menuRef}>
        {items.map((item, i) =>
          item.sep
            ? <div key={i} className="toolbar-submenu-sep" />
            : <button key={i} className="toolbar-submenu-item" onClick={() => onAction(item.action!)}>
                {item.icon && <span className={`remix ${item.icon}`}></span>}
                <span>{item.label}</span>
              </button>
        )}
      </div>
    )
  }

  // Menu button wrapper
  const MenuBtn: React.FC<{ key: MenuKey; icon: string; label: string; items: { label: string; action: string; icon?: string; sep?: boolean }[]; onAction: (a: string) => void }> = ({ key, icon, label, items, onAction }) => (
    <div className="toolbar-menu-btn">
      <button className="toolbar-btn" onClick={(e) => { e.stopPropagation(); toggleMenu(key) }}>
        <span className="remix toolbar-icon">{icon}</span>
        <span className="toolbar-label">{label}</span>
        <span className={`toolbar-dd-arrow ${menuOpen === key ? 'open' : ''}`}>▼</span>
      </button>
      <SubMenu key={key} items={items} onAction={onAction} />
    </div>
  )

  return (
    <>
      <div className="toolbar">
        {/* ── Left ── */}
        <div className="toolbar-group">
          <button className={`toolbar-btn ${openPanel === 'library' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'library' ? 'none' : 'library')} title="文档库">
            <span className="remix toolbar-icon ri-archive-2-line"></span>
            <span className="toolbar-label">文档库</span>
          </button>
          <button className="toolbar-btn" onClick={handleNewFile} title="新建文档">
            <span className="remix toolbar-icon ri-file-add-line"></span>
            <span className="toolbar-label">新建</span>
          </button>
          <button className={`toolbar-btn ${showOutline ? 'active' : ''}`} onClick={() => setShowOutline(!showOutline)} title="大纲">
            <span className="remix toolbar-icon ri-list-unordered"></span>
            <span className="toolbar-label">大纲</span>
          </button>
          <div className="toolbar-menu-btn">
            <button className={`toolbar-btn ${showPreview ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('preview') }} title="预览">
              <span className="remix toolbar-icon ri-eye-2-fill"></span>
              <span className="toolbar-label">预览</span>
              <span className={`toolbar-dd-arrow ${menuOpen === 'preview' ? 'open' : ''}`}>▼</span>
            </button>
            {menuOpen === 'preview' && (
              <div className="toolbar-submenu" ref={menuRef}>
                {PREVIEW_ITEMS.map((item, i) =>
                  <button key={i} className="toolbar-submenu-item" onClick={() => handlePreviewAction(item.action!)}>
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Middle ── */}
        <div className="toolbar-group toolbar-group--middle">
          <button className="toolbar-btn" onClick={() => applyCmd('bold')} title="粗体"><span className="remix toolbar-icon ri-bold"></span><span className="toolbar-label">粗体</span></button>
          <button className="toolbar-btn" onClick={() => applyCmd('italic')} title="斜体"><span className="remix toolbar-icon ri-italic"></span><span className="toolbar-label">斜体</span></button>
          <button className="toolbar-btn" onClick={() => applyCmd('underline')} title="下划线"><span className="remix toolbar-icon ri-underline"></span><span className="toolbar-label">下划线</span></button>
          <button className="toolbar-btn" onClick={() => applyCmd('strikeThrough')} title="删除线"><span className="remix toolbar-icon ri-strikethrough"></span><span className="toolbar-label">删除线</span></button>
          <button className="toolbar-btn" onClick={() => applyCmd('toggleHighlight')} title="高亮"><span className="remix toolbar-icon ri-mark-pen-fill"></span><span className="toolbar-label">高亮</span></button>

          <div className="toolbar-menu-btn">
            <button className="toolbar-btn" onClick={(e) => { e.stopPropagation(); toggleMenu('format') }} title="格式">
              <span className="remix toolbar-icon ri-text-wrap"></span>
              <span className="toolbar-label">格式</span>
              <span className={`toolbar-dd-arrow ${menuOpen === 'format' ? 'open' : ''}`}>▼</span>
            </button>
            {menuOpen === 'format' && (
              <div className="toolbar-submenu" ref={menuRef}>
                {FORMAT_ITEMS.map((item, i) =>
                  item.sep
                    ? <div key={i} className="toolbar-submenu-sep" />
                    : <button key={i} className="toolbar-submenu-item" onClick={() => handleFormatAction(item.action!)}>
                        <span>{item.label}</span>
                      </button>
                )}
              </div>
            )}
          </div>

          <button className="toolbar-btn" onClick={() => setShowImageDialog(true)} title="图片"><span className="remix toolbar-icon ri-image-line"></span><span className="toolbar-label">图片</span></button>
          <button className="toolbar-btn" onClick={() => setShowLinkDialog(true)} title="链接"><span className="remix toolbar-icon ri-link"></span><span className="toolbar-label">链接</span></button>

          <div className="toolbar-menu-btn">
            <button className="toolbar-btn" onClick={(e) => { e.stopPropagation(); toggleMenu('supsub') }} title="角标">
              <span className="remix toolbar-icon ri-superscript"></span>
              <span className="toolbar-label">角标</span>
              <span className={`toolbar-dd-arrow ${menuOpen === 'supsub' ? 'open' : ''}`}>▼</span>
            </button>
            {menuOpen === 'supsub' && (
              <div className="toolbar-submenu" ref={menuRef}>
                {SUPSUB_ITEMS.map((item, i) =>
                  <button key={i} className="toolbar-submenu-item" onClick={() => { handleFormatAction(item.action!); toggleMenu(null) }}>
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="toolbar-menu-btn">
            <button className="toolbar-btn" onClick={(e) => { e.stopPropagation(); toggleMenu('table') }} title="表格">
              <span className="remix toolbar-icon ri-table-2"></span>
              <span className="toolbar-label">表格</span>
              <span className={`toolbar-dd-arrow ${menuOpen === 'table' ? 'open' : ''}`}>▼</span>
            </button>
            {menuOpen === 'table' && (
              <div className="toolbar-submenu" ref={menuRef}>
                {TABLE_ITEMS.map((item, i) =>
                  item.sep
                    ? <div key={i} className="toolbar-submenu-sep" />
                    : <button key={i} className="toolbar-submenu-item" onClick={() => handleTableAction(item.action!)}>
                        <span>{item.label}</span>
                      </button>
                )}
              </div>
            )}
          </div>

          <div className="toolbar-menu-btn">
            <button className="toolbar-btn" onClick={(e) => { e.stopPropagation(); toggleMenu('insert') }} title="插入">
              <span className="remix toolbar-icon ri-add-circle-line"></span>
              <span className="toolbar-label">插入</span>
              <span className={`toolbar-dd-arrow ${menuOpen === 'insert' ? 'open' : ''}`}>▼</span>
            </button>
            {menuOpen === 'insert' && (
              <div className="toolbar-submenu" ref={menuRef}>
                {INSERT_ITEMS.map((item, i) =>
                  item.sep
                    ? <div key={i} className="toolbar-submenu-sep" />
                    : <button key={i} className="toolbar-submenu-item" onClick={() => handleInsertAction(item.action!)}>
                        {item.icon && <span className={`remix ${item.icon}`}></span>}
                        <span>{item.label}</span>
                      </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right ── */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })} title="AI">
            <span className="remix toolbar-icon ri-openai-fill"></span>
            <span className="toolbar-label">AI</span>
          </button>
          <button className={`toolbar-btn ${isReadMode ? 'active' : ''}`} onClick={() => setReadMode((v: boolean) => !v)} title="阅读">
            <span className="remix toolbar-icon ri-book-open-fill"></span>
            <span className="toolbar-label">阅读</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'history' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'history' ? 'none' : 'history')} title="历史">
            <span className="remix toolbar-icon ri-history-fill"></span>
            <span className="toolbar-label">历史</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'export' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'export' ? 'none' : 'export')} title="导出">
            <span className="remix toolbar-icon ri-download-2-line"></span>
            <span className="toolbar-label">导出</span>
          </button>
          <button className={`toolbar-btn ${openPanel === 'settings' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'settings' ? 'none' : 'settings')} title="设置">
            <span className="remix toolbar-icon ri-settings-3-fill"></span>
            <span className="toolbar-label">设置</span>
          </button>
        </div>
      </div>

      {showLinkDialog && <LinkDialog onClose={() => setShowLinkDialog(false)} />}
      {showImageDialog && <ImageDialog onClose={() => setShowImageDialog(false)} onInsert={insertImageFromUrl} onUpload={handleImageUpload} />}
    </>
  )
}
