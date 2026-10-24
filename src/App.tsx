import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { mdToHtml } from './utils/mdToHtml'
import { Toolbar } from './components/layout/Toolbar'
import { LeftNav } from './components/layout/LeftNav'
import { DocumentMetaBar } from './components/layout/DocumentMetaBar'
import { StatusBar } from './components/layout/StatusBar'
import { Footer } from './components/layout/Footer'
import { SettingsDialog } from './components/panels/SettingsDialog'
import { ExportDialog } from './components/panels/ExportDialog'
import { HistoryPanel } from './components/panels/HistoryPanel'
import { StyleMainPanel } from './components/panels/StyleMainPanel'
import { LZEditor } from './components/editor/LZEditor'
import { SearchPanel } from './components/panels/SearchPanel'
import { LibraryPanel } from './components/panels/LibraryPanel'
import { FilePanel } from './components/panels/FilePanel'
import { PreviewPanel } from './components/panels/PreviewPanel'
import { SidebarOutline } from './components/sidebar/SidebarOutline'
import { SidebarPreview } from './components/sidebar/SidebarPreview'
import { ImageDialog } from './components/panels/ImageDialog'
import { LinkDialog } from './components/panels/LinkDialog'
import { CodeDialog } from './components/panels/CodeDialog'
import { FormulaDialog } from './components/panels/FormulaDialog'
import { TableDropdown } from './components/panels/TableDropdown'
import { AIPanel } from './components/editor/AIPanel'
// 两个重量级对话框按需加载：emoji-picker-react 约 40MB、echarts 约 61MB，
// 静态 import 会让首屏主 chunk 白涨 1MB+，而它们只在弹窗打开时才需要
const EmojiDialog = lazy(() => import('./components/panels/EmojiDialog').then(m => ({ default: m.EmojiDialog })))
const ChartDialog = lazy(() => import('./components/panels/ChartDialog').then(m => ({ default: m.ChartDialog })))
import { useEditorStore, switchDocSilently } from './store/editorStore'
import { useSettingsStore } from './store/settingsStore'
import { useAIStore } from './store/aiStore'
import { useTheme } from './hooks/useTheme'
import { WelcomeScreen } from './components/layout/WelcomeScreen'
import { pickFolderFiles, importFolderFiles } from './utils/docImport'
import { silentError } from './utils/silentError'

const escapeTableText = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const buildTableHtml = (rows: number, cols: number, data?: string[][], withHeaderRow = true) => {
  const trs: string[] = []
  for (let r = 0; r < rows; r++) {
    const isHeader = withHeaderRow && r === 0
    const tds: string[] = []
    for (let c = 0; c < cols; c++) {
      const text = (data?.[r]?.[c] || '').trim()
      const inner = text
        ? `<p>${escapeTableText(text).replace(/\n/g, '<br>')}</p>`
        : '<p></p>'
      const tag = isHeader ? 'th' : 'td'
      tds.push(`<${tag}>${inner}</${tag}>`)
    }
    trs.push(`<tr>${tds.join('')}</tr>`)
  }
  return `<table><tbody>${trs.join('')}</tbody></table>`
}

/** 隐藏首次启动欢迎页（sessionStorage 记住，本会话不再弹出）。 */
const dismissWelcome = () => useEditorStore.getState().setShowWelcome(false)

/** 打开文件夹并批量导入其中的 Markdown 文件。 */
async function openFolderAndImport(): Promise<void> {
  const files = await pickFolderFiles()
  if (files) await importFolderFiles(files)
}

function App() {
  useTheme()
  const openPanel = useEditorStore(s => s.openPanel)
  const insertPanel = useEditorStore(s => s.insertPanel)
  const appMode = useEditorStore(s => s.appMode)
  const setAppMode = useEditorStore(s => s.setAppMode)
  const codeMode = useEditorStore(s => s.codeMode)
  const setCodeMode = useEditorStore(s => s.setCodeMode)
  const codeModeCursor = useEditorStore(s => s.codeModeCursor)
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const showLibrary = useEditorStore(s => s.showLibrary)
  const showRightPanel = useEditorStore(s => s.showRightPanel)
  const editor = useEditorStore(s => s.editor)
  const showWelcome = useEditorStore(s => s.showWelcome)
  const navMode = useSettingsStore(s => s.navMode || 'top')
  const showSearch = useEditorStore(s => s.showSearch)

  // 面板打开时让编辑器失去焦点
  useEffect(() => {
    const hasPanel = openPanel !== 'none' || insertPanel !== 'none' || showSearch
    if (hasPanel && editor) {
      try { editor.commands.blur() } catch {}
    }
  }, [openPanel, insertPanel, showSearch, editor])

  const closePanel = () => useEditorStore.getState().setOpenPanel('none')
  const closeInsert = () => useEditorStore.getState().setInsertPanel('none')

  // 同步 appMode 和 codeMode
  useEffect(() => {
    if (appMode === 'code' && !codeMode) setCodeMode(true)
    if (appMode === 'edit' && codeMode) setCodeMode(false)
  }, [appMode, codeMode, setCodeMode])

  // 启动时按「下次启动自动打开最后编辑的文档」还原
  useEffect(() => {
    try {
      if (useSettingsStore.getState().reopenLastDoc === false) return
      const last = localStorage.getItem('lzeditor-last-doc')
      if (!last) return
      const es = useEditorStore.getState()
      // 静默切换：还原上次文档不该连带关掉欢迎页
      if (es.docs.some((d: any) => d.id === last)) switchDocSilently(() => es.switchDoc(last))
    } catch (e) { silentError('恢复上次打开的文档失败', e) }
  }, [])

  // 内部链接：点击跳转到对应文档与章节
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (!href || href.startsWith('http') || href.startsWith('mailto:')) return
      const es = useEditorStore.getState()

      // 同文档锚点：Chrome 在 contenteditable 内不会执行 fragment 跳转，
      // 必须自己 preventDefault 并滚动，否则点内链完全没反应。
      if (href.startsWith('#')) {
        const anchor = decodeURIComponent(href.slice(1))
        const el = document.getElementById(anchor)
        if (!el) return
        e.preventDefault()
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        es.setActiveTocId(anchor)
        if (location.hash !== href) {
          try { window.history.replaceState(null, '', href) } catch { /* ignore */ }
        }
        return
      }

      const hashAt = href.indexOf('#')
      const docKey = hashAt === -1 ? href : href.slice(0, hashAt)
      const anchor = hashAt === -1 ? '' : href.slice(hashAt + 1)
      const target = es.docs.find((d: any) => d.id === docKey || d.title === docKey)
      if (!target) return
      e.preventDefault()
      es.switchDoc(target.id)
      es.setAppMode('edit')
      if (anchor) {
        setTimeout(() => {
          document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 250)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // 全局快捷键（与「快捷键设置」页列出的组合一致）
  useEffect(() => {
    const mod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey
    const ed = () => useEditorStore.getState().editor

    const toggleAI = () => {
      const s = useAIStore.getState()
      if (s.panelVisible) s.hidePanel()
      else s.showPanel('question', '', { x: Math.max(8, window.innerWidth - 380), y: 120 })
    }

    const onKey = (e: KeyboardEvent) => {
      if (!mod(e)) return
      const es = useEditorStore.getState()
      const key = e.key.toLowerCase()

      // 标题 Ctrl+Alt+1..6 由 TipTap 的 Heading 扩展自带 Mod-Alt-N 绑定处理；
      // 这里再调一次会变成「开→关」双重触发，等于什么都没发生，所以不再重复绑定。

      if (key === 'n') {
        e.preventDefault(); dismissWelcome(); es.createDoc('untitled.md')
      } else if (key === 'o' && e.shiftKey) {
        e.preventDefault(); dismissWelcome(); void openFolderAndImport()
      } else if (key === 'o') {
        e.preventDefault(); dismissWelcome(); es.setOpenPanel('file')
      } else if (key === 's') {
        e.preventDefault(); es.setLastEditTime(Date.now())
      } else if (key === 'e' && !e.altKey) {
        e.preventDefault(); dismissWelcome(); es.setOpenPanel('export')
      } else if (e.key === ',') {
        e.preventDefault(); dismissWelcome(); es.setOpenPanel('settings')
      } else if (key === 'f' && !e.shiftKey) {
        e.preventDefault(); es.setShowSearch(true)
      } else if (key === 'h' && e.shiftKey) {
        e.preventDefault(); es.setShowSearch(true)
      } else if (key === 'f' && e.shiftKey) {
        e.preventDefault()
        if (document.fullscreenElement) document.exitFullscreen?.()
        else document.body.requestFullscreen?.()
      } else if (key === 'p') {
        e.preventDefault(); window.print()
      } else if (e.key === '/') {
        e.preventDefault(); toggleAI()
      } else if (e.altKey && key === 'c') {
        e.preventDefault(); ed()?.chain?.().focus().toggleCodeBlock().run()
      } else if (key === '8' && e.shiftKey) {
        e.preventDefault(); ed()?.chain?.().focus().toggleBulletList().run()
      } else if (key === '7' && e.shiftKey) {
        e.preventDefault(); ed()?.chain?.().focus().toggleOrderedList().run()
      } else if (key === '9' && e.shiftKey) {
        e.preventDefault(); ed()?.chain?.().focus().toggleTaskList().run()
      } else if (key === 'b' && e.shiftKey) {
        e.preventDefault(); ed()?.chain?.().focus().toggleBlockquote().run()
      } else if (e.key === 'Enter') {
        // TipTap v3 把 hardBreak 命令改名为 setHardBreak；旧名调用会直接抛错
        e.preventDefault()
        ed()?.chain?.().focus().setHardBreak?.().run()
      }
    }

    document.addEventListener('keydown', onKey)
    const api = (window as any).electronAPI
    api?.onMenuNew?.(() => { dismissWelcome(); useEditorStore.getState().createDoc('untitled.md') })
    api?.onMenuOpen?.(() => { dismissWelcome(); useEditorStore.getState().setOpenPanel('file') })
    api?.onMenuExport?.(() => { dismissWelcome(); useEditorStore.getState().setOpenPanel('export') })
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Electron：同步行为设置给主进程，并处理「从资源管理器打开文档」
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return
    const pushSettings = () => api.sendSettings?.(useSettingsStore.getState())
    pushSettings()
    const unsub = useSettingsStore.subscribe(pushSettings)

    const onLocalFile = async (filePath: string) => {
      try {
        dismissWelcome()
        const res = await api.readLocalFile(filePath)
        if (!res?.ok || !res.text) return
        const name = String(res.name || filePath.split(/[\\/]/).pop() || 'untitled.md')
        const es = useEditorStore.getState()
        const id = es.createDoc(name)
        const html = mdToHtml(res.text)
        es.updateDoc({ md: res.text, html, docsMd: { [id]: res.text } })
        try { localStorage.setItem(`lzeditor-doc-${id}`, JSON.stringify({ md: res.text, html, savedAt: Date.now() })) } catch {}
        es.editor?.commands?.setContent(html)
      } catch (e) { silentError('导入文件写入编辑器失败', e) }
    }
    api.onMenuOpenFile?.(onLocalFile)
    return () => unsub()
  }, [])

  const [libraryClosing, setLibraryClosing] = useState(false)
  const prevShowLibrary = useRef(showLibrary)
  useEffect(() => {
    if (!showLibrary && prevShowLibrary.current) {
      setLibraryClosing(true)
      const t = setTimeout(() => setLibraryClosing(false), 200)
      return () => clearTimeout(t)
    }
    setLibraryClosing(false)
    prevShowLibrary.current = showLibrary
  }, [showLibrary])

  // 样式面板开闭动画追踪
  const prevAppMode = useRef(appMode)
  const [stylePanelAnimating, setStylePanelAnimating] = useState<string | null>(null)
  useEffect(() => {
    if (appMode === 'style' && prevAppMode.current !== 'style') {
      setStylePanelAnimating('style-panel-in')
      const t = setTimeout(() => setStylePanelAnimating(null), 300)
      return () => clearTimeout(t)
    }
    if (appMode !== 'style' && prevAppMode.current === 'style') {
      setStylePanelAnimating('style-panel-exit')
      const t = setTimeout(() => setStylePanelAnimating(null), 250)
      return () => clearTimeout(t)
    }
    setStylePanelAnimating(null)
    prevAppMode.current = appMode
  }, [appMode])

  // 搜索面板开闭动画追踪
  const prevShowSearch = useRef(showSearch)
  const [searchPanelAnimating, setSearchPanelAnimating] = useState<string | null>(null)
  useEffect(() => {
    if (showSearch && !prevShowSearch.current) {
      setSearchPanelAnimating('search-panel-in')
      const t = setTimeout(() => setSearchPanelAnimating(null), 300)
      return () => clearTimeout(t)
    }
    if (!showSearch && prevShowSearch.current) {
      setSearchPanelAnimating('search-panel-exit')
      const t = setTimeout(() => setSearchPanelAnimating(null), 200)
      return () => clearTimeout(t)
    }
    setSearchPanelAnimating(null)
    prevShowSearch.current = showSearch
  }, [showSearch])
  const insertImage = (url: string, alt: string, align?: 'top' | 'left' | 'right') => {
    if (!editor) return
    editor.chain().focus().insertImage({ src: url, alt, align }).run()
    closeInsert()
  }
  const uploadImage = (file: File, align?: 'top' | 'left' | 'right') => {
    if (!editor) return
    const reader = new FileReader()
    reader.onload = (ev) => insertImage(ev.target?.result as string, file.name, align)
    reader.readAsDataURL(file)
    closeInsert()
  }
  const insertMarkdown = (md: string) => {
    const cur = useEditorStore.getState()
    const pos = cur.codeModeCursor ?? 0
    const content = cur.mdContent
    const newContent = content.slice(0, pos) + md + content.slice(pos)
    useEditorStore.getState().setMdContent(newContent)
    const docId = cur.activeDocId
    if (docId) {
      try {
        const html = mdToHtml(newContent)
        useEditorStore.getState().updateDoc({ md: newContent, html, docsMd: { [docId]: newContent } })
        localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md: newContent, html, savedAt: Date.now() }))
      } catch (e) { silentError('AI 内容回写文档失败', e) }
    }
    closeInsert()
  }
  const insertCode = (code: string, lang: string) => {
    if (!editor) return
    // 以 JSON 节点插入代码块，字符串会被当成 HTML 解析
    editor.commands.insertContent({
      type: 'codeBlock',
      attrs: { language: lang },
      content: [{ type: 'text', text: code }],
    })
    closeInsert()
  }
  const insertLink = (text: string, url: string, newTab?: boolean) => {
    if (!editor) return
    const linkContent = {
      type: 'link',
      attrs: { href: url, ...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }
    }
    if (text.trim() && text !== url) {
      editor.chain().focus().setTextSelection({ from: editor.state.selection.from, to: editor.state.selection.to }).insertContent(text).run()
      editor.chain().focus().setLink(linkContent).run()
    } else {
      editor.chain().focus().extendMarkRange('link').insertContent(linkContent).run()
    }
    closeInsert()
  }
  const insertFormula = (formula: string) => {
    if (!editor) return
    editor.chain().focus().insertMath(formula).run()
    closeInsert()
  }
  const insertChart = (src: string, alt: string, _type: string) => {
    if (!editor) return
    // 必须以 JSON 节点插入，字符串会被当成 HTML 解析而无法渲染成图片
    editor.commands.insertContent({ type: 'image', attrs: { src, alt } })
    closeInsert()
  }
  const insertEmoji = (text: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(text).run()
    closeInsert()
  }
  const insertTable = (rows: number, cols: number, data?: string[][], withHeaderRow = true) => {
    if (!editor || rows <= 0 || cols <= 0) return
    editor.chain().focus().insertContent(buildTableHtml(rows, cols, data, withHeaderRow)).run()
    closeInsert()
  }

  // ── 中心内容 ──
  const centerContent = (() => {
    // 首次启动：欢迎页替代编辑区，不再默认展开 welcome/README 文档
    if (showWelcome) return <WelcomeScreen />
    if (appMode === 'edit' || appMode === 'code') {
      return <LZEditor />
    }
    if (appMode === 'read') {
      return <LZEditor />
    }
    if (appMode === 'history') {
      return <HistoryPanel onClose={() => setAppMode('edit')} />
    }
    if (appMode === 'style') {
      return <StyleMainPanel />
    }
    return <LZEditor />
  })()

  // ── 顶部布局 ──
  const topLayout = (
    <>
      <Toolbar />
      <DocumentMetaBar />
      <div className="app-main" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {showOutline && <SidebarOutline />}
        {showLibrary && <LibraryPanel sidebar className={libraryClosing ? 'closing' : ''} />}
        {centerContent}
        {(showPreview) && appMode !== 'history' && appMode !== 'style' && <SidebarPreview />}
      </div>
      <StatusBar />
      <Footer />
    </>
  )

  // ── 左侧布局：大纲 + 左导航 + 中编辑区 + 右面板 ──
  const leftLayout = (
    <div className="app-left-layout">
      <div className="app-left-body">
      {/* 大纲面板 */}
      {showOutline && (
        <div className="app-outline-panel">
          <SidebarOutline />
        </div>
      )}

      {/* 左导航 */}
      <div className="app-left-nav">
        <LeftNav />
      </div>

      {/* 中编辑区 */}
      <div className="app-center">
        <DocumentMetaBar />
        <div className="app-editor-area">
          {centerContent}
        </div>
      </div>

      {/* 右面板：单面板互斥，历史 > 样式 > 预览 > 文档库 */}
      {(showRightPanel || showPreview || showLibrary || appMode === 'history' || appMode === 'style') && (
        <div className={`app-right-panel${appMode === 'style' && stylePanelAnimating ? ` ${stylePanelAnimating}` : ''}`}>
          {appMode === 'history' ? <HistoryPanel onClose={() => setAppMode('edit')} />
          : appMode === 'style' ? <StyleMainPanel />
          : showPreview ? <SidebarPreview />
          : showLibrary ? <LibraryPanel sidebar />
          : null}
        </div>
      )}
      </div>
      <StatusBar />
      <Footer />
    </div>
  )

  return (
    <div className={`app${navMode === 'left' ? ' nav-mode-left' : ''}`} style={{ display: 'flex', flexDirection: navMode === 'left' ? 'row' : 'column', height: '100vh', overflow: 'hidden' }}>
      {navMode === 'left' ? leftLayout : topLayout}
      {useEditorStore(s => s.showSearch) && (
        <div className={`search-panel-bar${searchPanelAnimating === 'search-panel-exit' ? ' search-panel-exiting' : ''}`}>
          <SearchPanel onClose={() => useEditorStore.getState().setShowSearch(false)} />
        </div>
      )}

      {openPanel === 'settings' && <SettingsDialog onClose={closePanel} />}
      {openPanel === 'export' && <ExportDialog onClose={closePanel} />}
      {openPanel === 'history' && <HistoryPanel onClose={closePanel} />}
      {openPanel === 'library' && <LibraryPanel onClose={closePanel} />}
      {openPanel === 'file' && <FilePanel onClose={closePanel} />}
      {openPanel === 'preview' && <PreviewPanel onClose={closePanel} />}
      <AIPanel />

      {insertPanel === 'image' && <ImageDialog onClose={closeInsert} onInsert={insertImage} onUpload={uploadImage} codeModeCursor={codeModeCursor} onInsertMarkdown={insertMarkdown} />}
      {insertPanel === 'link' && <LinkDialog onClose={closeInsert} onInsert={insertLink} codeModeCursor={codeModeCursor} onInsertMarkdown={insertMarkdown} />}
      {insertPanel === 'code' && <CodeDialog onClose={closeInsert} onInsert={insertCode} />}
      {insertPanel === 'formula' && <FormulaDialog onClose={closeInsert} onInsert={insertFormula} />}
      {insertPanel === 'table' && (
        <TableDropdown open={true} onToggle={() => closeInsert()} onInsert={insertTable} />
      )}
      <Suspense fallback={null}>
        {insertPanel === 'emoji' && <EmojiDialog onClose={closeInsert} onInsert={insertEmoji} />}
        {insertPanel === 'chart' && <ChartDialog onClose={closeInsert} onInsert={insertChart} />}
      </Suspense>
    </div>
  )
}

export default App
