import React, { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'
import { LinkDialog } from '../panels/LinkDialog'
import { ImageDialog } from '../panels/ImageDialog'

type MenuKey = 'format' | 'table' | 'insert' | 'supsub' | 'preview' | null

const FORMAT_ITEMS = [
  { label: '标题 1', action: 'h1' },
  { label: '标题 2', action: 'h2' },
  { label: '标题 3', action: 'h3' },
  { label: '标题 4', action: 'h4' },
  { label: '标题 5', action: 'h5' },
  { sep: true },
  { label: '清除格式', action: 'clear' },
  { sep: true },
  { label: '分割线', action: 'hr' },
  { label: '链接', action: 'link' },
  { label: '图片', action: 'image' },
  { sep: true },
  { label: '有序列表', action: 'ol' },
  { label: '无序列表', action: 'ul' },
  { label: '任务列表', action: 'task' },
]

const INSERT_ITEMS = [
  { icon: 'ri-toc', label: '目录', action: 'toc' },
  { icon: 'ri-quotation-text', label: '引言', action: 'quote' },
  { icon: 'ri-footprint', label: '脚注', action: 'footnote' },
  { sep: true },
  { icon: 'ri-separator', label: '分割线', action: 'hr' },
  { icon: 'ri-double-quotes-l', label: '块引用', action: 'blockquote' },
  { icon: 'ri-code-box-line', label: '代码块', action: 'code' },
  { icon: 'ri-function-fill', label: '数学公式', action: 'math' },
]

const TABLE_ITEMS = [
  { label: '插入表格', action: 'insert' },
  { sep: true },
  { label: '插入列', action: 'col' },
  { label: '插入行', action: 'row' },
  { sep: true },
  { label: '删除表格', action: 'delete' },
]

const SUPSUB_ITEMS = [
  { label: '上角标', action: 'sup' },
  { label: '下角标', action: 'sub' },
]

const PREVIEW_ITEMS = [
  { label: '即时预览', action: 'instant' },
  { label: '预览 · 样式集', action: 'full' },
  { label: '预览 · 源码', action: 'code' },
]

export const Toolbar: React.FC = () => {
  const openPanel = useEditorStore((s: any) => s.openPanel)
  const showOutline = useEditorStore((s: any) => s.showOutline)
  const showPreview = useEditorStore((s: any) => s.showPreview)
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)
  const setShowPreview = useEditorStore((s: any) => s.setShowPreview)
  const setReadMode = useEditorStore((s: any) => s.setReadMode)
  const editorRef = useEditorStore((s: any) => s.editorRef)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)
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
    if (!editorRef) return
    document.execCommand(cmd, false)
    editorRef.focus()
    setDocHTML(editorRef.innerHTML)
    const text = editorRef.innerText || ''
    setWordCount(text.split(/\s+/).filter(Boolean).length)
  }

  const handleNewFile = () => setTitle(`untitled-${Date.now()}.md`)

  const insertImageFromUrl = (url: string, alt: string) => {
    if (!editorRef) return
    const img = document.createElement('img')
    img.src = url; img.alt = alt
    img.style.maxWidth = '100%'
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null
    if (range) { range.insertNode(img); range.setStartAfter(img); range.collapse(true) }
    else editorRef.appendChild(img)
    editorRef.focus()
    setDocHTML(editorRef.innerHTML)
  }

  const handleImageUpload = (file: File) => {
    if (!editorRef) return
    const reader = new FileReader()
    reader.onload = (ev) => insertImageFromUrl(ev.target?.result as string, file.name)
    reader.readAsDataURL(file)
  }

  const handleFormatAction = (action: string) => {
    setMenuOpen(null)
    if (!editorRef) return
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null

    switch (action) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': {
        const tag = action as `h${1|2|3|4|5}`
        const el = document.createElement(tag)
        el.textContent = sel?.toString() || `标题 ${action[1]}`
        range?.deleteContents(); range?.insertNode(el)
        break
      }
      case 'clear': {
        const el = range?.commonAncestorContainer?.parentElement
        if (el?.tagName?.match(/^H[1-5]$/)) {
          const p = document.createElement('p')
          p.textContent = el.textContent
          el.replaceWith(p)
        }
        break
      }
      case 'hr': {
        const hr = document.createElement('hr')
        range?.insertNode(hr)
        break
      }
      case 'link':
        setShowLinkDialog(true)
        return
      case 'image':
        setShowImageDialog(true)
        return
      case 'ol': {
        const ol = document.createElement('ol')
        ol.innerHTML = '<li>列表项</li><li>列表项</li>'
        range?.deleteContents(); range?.insertNode(ol)
        break
      }
      case 'ul': {
        const ul = document.createElement('ul')
        ul.innerHTML = '<li>列表项</li><li>列表项</li>'
        range?.deleteContents(); range?.insertNode(ul)
        break
      }
      case 'task': {
        const ul = document.createElement('ul')
        ul.innerHTML = '<li class="task-item"><input type="checkbox"> 待办</li><li class="task-item"><input type="checkbox"> 待办</li>'
        range?.deleteContents(); range?.insertNode(ul)
        break
      }
    }
    setDocHTML(editorRef.innerHTML)
    const text = editorRef.innerText || ''
    setWordCount(text.split(/\s+/).filter(Boolean).length)
  }

  const handleInsertAction = (action: string) => {
    setMenuOpen(null)
    if (!editorRef) return
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null

    switch (action) {
      case 'toc': {
        const p = document.createElement('p')
        p.textContent = '[TOC]'
        p.style.cssText = 'color:var(--text-muted);font-size:12px;font-family:monospace;'
        range?.insertNode(p)
        break
      }
      case 'quote': {
        const bq = document.createElement('blockquote')
        bq.textContent = sel?.toString() || '引用内容'
        bq.style.cssText = 'border-left:3px solid var(--accent-primary);padding:8px 16px;margin:8px 0;background:var(--accent-a3);border-radius:0 8px 8px 0;'
        range?.deleteContents(); range?.insertNode(bq)
        break
      }
      case 'footnote': {
        const sup = document.createElement('sup')
        sup.textContent = '[^1]'
        sup.style.cssText = 'color:var(--accent-primary);'
        range?.insertNode(sup)
        break
      }
      case 'hr': {
        const hr = document.createElement('hr')
        hr.style.cssText = 'border:none;border-top:1px solid var(--border-subtle);margin:12px 0;'
        range?.insertNode(hr)
        break
      }
      case 'blockquote': {
        const bq = document.createElement('blockquote')
        bq.textContent = sel?.toString() || '块引用'
        bq.style.cssText = 'border-left:3px solid var(--amber);padding:12px 20px;margin:12px 0;background:var(--bg-quote);border-radius:0 10px 10px 0;font-style:italic;color:var(--text-secondary);'
        range?.deleteContents(); range?.insertNode(bq)
        break
      }
      case 'code': {
        const code = prompt('请输入代码内容:')
        if (code !== null && range) {
          const pre = document.createElement('pre')
          pre.style.cssText = 'background:var(--bg-code);padding:14px 18px;border-radius:8px;font-family:monospace;font-size:13px;overflow-x:auto;margin:10px 0;border:1px solid var(--border-subtle);'
          const codeEl = document.createElement('code')
          codeEl.textContent = code
          pre.appendChild(codeEl)
          range.deleteContents(); range.insertNode(pre)
        }
        break
      }
      case 'math': {
        const formula = prompt('输入数学公式 (LaTeX):', 'E = mc^2')
        if (formula && range) {
          const span = document.createElement('span')
          span.textContent = `$${formula}$`
          span.style.cssText = 'background:var(--bg-code);padding:2px 8px;border-radius:4px;font-family:monospace;font-size:14px;color:var(--amber);border:1px solid var(--border-subtle);'
          range.insertNode(span)
        }
        break
      }
    }
    setDocHTML(editorRef.innerHTML)
  }

  const handleTableAction = (action: string) => {
    setMenuOpen(null)
    if (action === 'insert' && editorRef) {
      const r = parseInt(prompt('行数:', '3') || '3')
      const c = parseInt(prompt('列数:', '3') || '3')
      if (r > 0 && c > 0) {
        const table = document.createElement('table')
        table.style.cssText = 'border-collapse:collapse;width:100%;margin:8px 0;'
        for (let i = 0; i < r; i++) {
          const tr = document.createElement('tr')
          for (let j = 0; j < c; j++) {
            const td = document.createElement('td')
            td.style.cssText = 'border:1px solid var(--border-default);padding:6px 10px;min-width:50px;'
            td.textContent = i === 0 ? '标题' : ''
            tr.appendChild(td)
          }
          table.appendChild(tr)
        }
        editorRef.appendChild(table)
        editorRef.focus()
        setDocHTML(editorRef.innerHTML)
      }
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
          <button className="toolbar-btn" onClick={() => {
            const sel = window.getSelection()
            if (sel?.rangeCount) { const r = sel.getRangeAt(0); const s = document.createElement('span'); s.style.cssText='background:var(--accent-a40);padding:0 2px;border-radius:2px'; r.surroundContents(s) }
          }} title="高亮"><span className="remix toolbar-icon ri-mark-pen-fill"></span><span className="toolbar-label">高亮</span></button>

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
