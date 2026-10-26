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
import { ReadMode } from './components/editor/ReadMode'
import { SearchPanel } from './components/panels/SearchPanel'
import { LibraryPanel } from './components/panels/LibraryPanel'
import { FilePanel } from './components/panels/FilePanel'
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
import { getCM6Editor } from './components/editor/codemirror/registry'
import { useAIStore } from './store/aiStore'
import { useTheme } from './hooks/useTheme'
import { WelcomeScreen } from './components/layout/WelcomeScreen'
import { pickFolderFiles, importFolderFiles } from './utils/docImport'
import { silentError } from './utils/silentError'

/** HTML 属性值转义（对齐图片、新标签页链接走 HTML 输出时用）。 */
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 主进程只读这四个开关（托盘、关窗即退、新窗口、标签页），
// 全量 settings 里带明文 API Key，没必要发进主进程。
const APP_SETTING_KEYS = ['enableTabs', 'showTrayIcon', 'openInNewWindow', 'quitWhenAllWindowsClosed'] as const

const buildImageMd = (url: string, alt: string, align: 'top' | 'left' | 'right' | undefined) => {
  if (align === 'left' || align === 'right') {
    return `\n\n<img src="${escAttr(url)}" alt="${escAttr(alt)}" style="float:${align}">\n\n`
  }
  return `\n\n![${alt.replace(/\]/g, '\\]')}](${url})\n\n`
}

const CHART_TYPE_LABEL: Record<string, string> = { line: '折线图', bar: '柱状图', pie: '饼图', scatter: '散点图' }

const buildTableMd = (rows: number, cols: number, data?: string[][], withHeader = true) => {
  const r = Math.max(1, Math.min(rows, 50))
  const c = Math.max(1, Math.min(cols, 30))
  const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()
  const pad = (i: number, j: number, fallback = '') => cell(data?.[i]?.[j] ?? fallback)
  const body = (i: number) => `| ${Array.from({ length: c }, (_, j) => pad(i, j)).join(' | ')} |`
  // 无标题行就不写分隔线：GFM 表格靠第二行的 `|---|` 识别表头，去掉后整块退化成纯竖线文本
  if (!withHeader) return Array.from({ length: r }, (_, i) => body(i)).join('\n')
  return [
    `| ${Array.from({ length: c }, (_, i) => pad(0, i, `表头${i + 1}`)).join(' | ')} |`,
    `| ${Array.from({ length: c }, () => '---').join(' | ')} |`,
    ...Array.from({ length: r - 1 }, (_, i) => body(i + 1)),
  ].join('\n')
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
  const showWelcome = useEditorStore(s => s.showWelcome)
  const navMode = useSettingsStore(s => s.navMode || 'top')
  const showSearch = useEditorStore(s => s.showSearch)

  // 面板打开时让编辑器失去焦点
  useEffect(() => {
    const hasPanel = openPanel !== 'none' || insertPanel !== 'none' || showSearch
    if (!hasPanel) return
    try {
      const content = getCM6Editor()?.view.contentDOM as HTMLElement | null
      content?.blur()
    } catch {}
  }, [openPanel, insertPanel, showSearch])

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
    const ed = () => getCM6Editor()

    const toggleAI = () => {
      const s = useAIStore.getState()
      if (s.panelVisible) s.hidePanel()
      else s.showPanel('question', '', { x: Math.max(8, window.innerWidth - 380), y: 120 })
    }

    const onKey = (e: KeyboardEvent) => {
      if (!mod(e)) return
      const es = useEditorStore.getState()
      const key = e.key.toLowerCase()

      // 标题 Ctrl+Alt+1..6 由 CM6 的 headingKeymap 绑定；这里重复调用会变成
      // 「开→关」双重触发，等于什么都没发生，所以不再重复绑定。

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
      } else if (key === 'r' && !e.shiftKey && !e.altKey) {
        // Ctrl/Cmd+R 在 Electron 里默认是刷新窗口，必须 preventDefault
        e.preventDefault(); es.setAppMode(es.appMode === 'read' ? 'edit' : 'read')
      } else if (e.key === '/') {
        e.preventDefault(); toggleAI()
      } else if (e.altKey && key === 'c') {
        e.preventDefault(); ed()?.run('code-block')
      } else if (key === '8' && e.shiftKey) {
        e.preventDefault(); ed()?.run('bullet-list')
      } else if (key === '7' && e.shiftKey) {
        e.preventDefault(); ed()?.run('numbered-list')
      } else if (key === '9' && e.shiftKey) {
        e.preventDefault(); ed()?.run('task-list')
      } else if (key === 'b' && e.shiftKey) {
        e.preventDefault(); ed()?.run('quote')
      }
    }

    document.addEventListener('keydown', onKey)
    const api = (window as any).electronAPI
    // onMenu* 是 ipcRenderer.on 的包装，必须成对解绑，否则 StrictMode 重挂会叠出重复监听
    const onNew = () => { dismissWelcome(); useEditorStore.getState().createDoc('untitled.md') }
    const onOpen = () => { dismissWelcome(); useEditorStore.getState().setOpenPanel('file') }
    const onExport = () => { dismissWelcome(); useEditorStore.getState().setOpenPanel('export') }
    api?.onMenuNew?.(onNew)
    api?.onMenuOpen?.(onOpen)
    api?.onMenuExport?.(onExport)
    return () => {
      document.removeEventListener('keydown', onKey)
      api?.offMenuNew?.(onNew)
      api?.offMenuOpen?.(onOpen)
      api?.offMenuExport?.(onExport)
    }
  }, [])

  // Electron：同步行为设置给主进程，并处理「从资源管理器打开文档」
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return
    const pushSettings = () => {
      const s = useSettingsStore.getState()
      api.sendSettings?.(Object.fromEntries(APP_SETTING_KEYS.map(k => [k, s[k]])))
    }
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
        getCM6Editor()?.setText(res.text)
      } catch (e) { silentError('导入文件写入编辑器失败', e) }
    }
    const offLocalFile = api.onMenuOpenFile?.(onLocalFile)
    return () => {
      unsub()
      offLocalFile?.()
    }
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
  // CM6 编辑的是 markdown 源码：左右对齐没有 markdown 语法，落 HTML 的 float；渲染管线放行 img/style
  const insertImage = (url: string, alt: string, align?: 'top' | 'left' | 'right') => {
    insertMarkdown(buildImageMd(url, alt, align))
  }
  const uploadImage = (file: File, align?: 'top' | 'left' | 'right') => {
    if (!getCM6Editor()) return
    const reader = new FileReader()
    reader.onload = (ev) => insertImage(ev.target?.result as string, file.name, align)
    reader.readAsDataURL(file)
    closeInsert()
  }
  const insertMarkdown = (md: string) => {
    const cm = getCM6Editor()
    if (cm) { cm.insertText(md); closeInsert(); return }
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
    getCM6Editor()?.insertText(`\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`)
    closeInsert()
  }
  const insertLink = (text: string, url: string, newTab?: boolean) => {
    const cm = getCM6Editor()
    if (!cm) return
    const label = (text.trim() || url).replace(/\s+/g, ' ')
    if (newTab) {
      // markdown 链接无法表达 target，落 HTML（消毒白名单放行 target 属性）
      cm.insertText(`<a href="${escAttr(url)}" target="_blank" rel="noopener">${label}</a>`)
    } else {
      cm.insertText(`[${label}](${url})`)
    }
    closeInsert()
  }
  const insertFormula = (formula: string) => {
    getCM6Editor()?.insertText(`$$${formula}$$`)
    closeInsert()
  }
  const insertChart = (src: string, alt: string, type: string) => {
    // 图表是位图，类型信息只能进 alt 文本（读屏/导出 Word 都能看到）
    const label = `${CHART_TYPE_LABEL[type] ?? '图表'}：${alt}`.replace(/\]/g, '\\]')
    getCM6Editor()?.insertText(`\n\n![${label}](${src})\n\n`)
    closeInsert()
  }
  const insertEmoji = (text: string) => {
    getCM6Editor()?.insertText(text)
    closeInsert()
  }
  const insertTable = (rows: number, cols: number, data?: string[][], withHeaderRow = true) => {
    if (rows <= 0 || cols <= 0) return
    getCM6Editor()?.insertText(`\n\n${buildTableMd(rows, cols, data, withHeaderRow)}\n\n`)
    closeInsert()
  }

  // ── 中心内容 ──
  const centerContent = (() => {
    // 首次启动：欢迎页替代编辑区，不再默认展开 welcome/README 文档
    if (showWelcome) return <WelcomeScreen />
    if (appMode === 'history') {
      return <HistoryPanel onClose={() => setAppMode('edit')} />
    }
    // 阅读模式整块替换编辑区，双联页书本翻页
    if (appMode === 'read') {
      return <ReadMode />
    }
    // 编辑 / 代码 / 排版 三种模式都挂源码编辑器：
    // 预览模式与排版模式的右侧内容走右栏，代码模式不给右栏留位。
    return <LZEditor />
  })()

  // 右侧预览只在编辑模式下显示：代码/排版/历史/阅读模式都有自己独立的右栏或全宽内容
  const showRightPreview = showPreview && appMode !== 'code' && appMode !== 'history'
    && appMode !== 'style' && appMode !== 'read'

  // ── 顶部布局 ──
  const topLayout = (
    <>
      <Toolbar />
      <DocumentMetaBar />
      <div className="app-main" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {showOutline && <SidebarOutline />}
        {showLibrary && <LibraryPanel sidebar className={libraryClosing ? 'closing' : ''} />}
        {centerContent}
        {/* 顶部布局同样要给排版面板留右栏：showRightPreview 已排除 style，
            没有这一段的话点「样式」只会把预览藏掉，面板不出现，看起来像没反应 */}
        {appMode === 'style' ? (
          <div className={`app-right-panel app-right-panel--style${stylePanelAnimating ? ` ${stylePanelAnimating}` : ''}`}>
            <div className="style-mode-stack"><StyleMainPanel /></div>
          </div>
        ) : showRightPreview && <SidebarPreview />}
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

      {/* 右面板：单面板互斥，历史 > 样式 > 预览 > 文档库。阅读模式占满中编辑区，不留右栏 */}
      {(appMode !== 'read') && (showRightPanel || showRightPreview || showLibrary || appMode === 'history' || appMode === 'style') && (
        <div className={`app-right-panel${appMode === 'style' ? ' app-right-panel--style' : ''}${appMode === 'style' && stylePanelAnimating ? ` ${stylePanelAnimating}` : ''}`}>
          {appMode === 'history' ? <HistoryPanel onClose={() => setAppMode('edit')} />
          : appMode === 'style' ? <div className="style-mode-stack"><StyleMainPanel /></div>
          : showRightPreview ? <SidebarPreview />
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
