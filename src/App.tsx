import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react'
import { mdToHtml } from './utils/mdToHtml'
import { shouldShowRightPreview, shouldShowRightPanel, shouldShowCenterColumn } from './utils/modeLayout'
import { countLineDiff, formatTimeTs } from './utils/historyTimeline'
import { nextVersionId } from './utils/versionId'
import { isVersionSuppressed } from './utils/versionCapture'
import { Toolbar } from './components/layout/Toolbar'
import { LeftNav } from './components/layout/LeftNav'
import { DocumentMetaBar } from './components/layout/DocumentMetaBar'
import { Footer } from './components/layout/Footer'
import { SettingsDialog } from './components/panels/SettingsDialog'
import { ExportDialog } from './components/panels/ExportDialog'
import { HistoryPanel } from './components/panels/HistoryPanel'
import { StyleMainPanel } from './components/panels/StyleMainPanel'
import { CodeEditor } from './components/editor/CodeEditor'
import { MilkdownEditor } from './components/editor/MilkdownEditor'
import { getDocMd } from './utils/docSource'
import { README_CONTENT } from './components/editor/constants'
import { ReadMode } from './components/editor/ReadMode'
import { SearchPanel } from './components/panels/SearchPanel'
import { LibraryPanel } from './components/panels/LibraryPanel'
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
import { getEditorFacade } from './components/editor/facade/registry'
import { useAIStore } from './store/aiStore'
import { runWillSave } from './plugins'
import { PluginFloatingViews } from './plugins/views'
import { usePluginTrayBridge } from './plugins/tray'
import { useTheme } from './hooks/useTheme'
import { useTypographyOverrides } from './hooks/useTypographyOverrides'
import { WelcomeScreen } from './components/layout/WelcomeScreen'
import { pickFolderFiles, importFolderFiles, pickFile, importSingleFile } from './utils/docImport'
import { buildTableMd } from './utils/tableMd'
import { silentError } from './utils/silentError'
import { toast } from './utils/toast'

/** HTML 属性值转义（对齐图片、新标签页链接走 HTML 输出时用）。 */
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 主进程只读这四个开关（托盘、关窗即退、新窗口、标签页），
// 全量 settings 里带明文 API Key，没必要发进主进程。
// 只推主进程真正会读的键。enableTabs 是渲染进程自己消费的（DocumentMetaBar），
// 混进来只是多一次 IPC 往返，还会让人误以为主进程在读它。
const APP_SETTING_KEYS = ['showTrayIcon', 'openInNewWindow', 'quitWhenAllWindowsClosed'] as const

const buildImageMd = (url: string, alt: string, align: 'top' | 'left' | 'right' | undefined) => {
  if (align === 'left' || align === 'right') {
    return `\n\n<img src="${escAttr(url)}" alt="${escAttr(alt)}" style="float:${align}">\n\n`
  }
  return `\n\n![${alt.replace(/\]/g, '\\]')}](${url})\n\n`
}

const CHART_TYPE_LABEL: Record<string, string> = { line: '折线图', bar: '柱状图', pie: '饼图', scatter: '散点图' }

/** 隐藏首次启动欢迎页（sessionStorage 记住，本会话不再弹出）。 */
const dismissWelcome = () => useEditorStore.getState().setShowWelcome(false)

/** 打开文件夹并批量导入其中的 Markdown 文件。 */
async function openFolderAndImport(): Promise<void> {
  const files = await pickFolderFiles()
  if (files) await importFolderFiles(files)
}

function App() {
  useTheme()
  useTypographyOverrides()
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
  const showWelcome = useEditorStore(s => s.showWelcome)
  const activeDocId = useEditorStore(s => s.activeDocId)
  const docsMd = useEditorStore(s => s.docsMd || {})
  const navMode = useSettingsStore(s => s.navMode || 'top')
  const showSearch = useEditorStore(s => s.showSearch)

  // ── 插件托盘桥：把 menu==='tray' 的插件项同步到主进程托盘菜单 ──
  usePluginTrayBridge()

  // 面板打开时让编辑器失去焦点
  useEffect(() => {
    const hasPanel = openPanel !== 'none' || insertPanel !== 'none' || showSearch
    if (!hasPanel) return
    try {
      // yeli 画布聚焦的是块级 contenteditable，CM6 时代 blur 的是 view.contentDOM；
      // 这里 blur 掉画布 shell 内的焦点元素即可（面板打开时编辑器应让位）。
      const active = document.activeElement
      if (active instanceof HTMLElement && active.closest('.code-editor-shell')) active.blur()
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
    const ed = () => getEditorFacade()

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
        e.preventDefault(); dismissWelcome(); void pickFile().then(file => { if (file) importSingleFile(file) })
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
        e.preventDefault(); ed()?.execCommand('insert.code-block')
      } else if (key === '8' && e.shiftKey) {
        e.preventDefault(); ed()?.execCommand('insert.bullet-list')
      } else if (key === '7' && e.shiftKey) {
        e.preventDefault(); ed()?.execCommand('insert.numbered-list')
      } else if (key === '9' && e.shiftKey) {
        e.preventDefault(); ed()?.execCommand('insert.task')
      } else if (key === 'b' && e.shiftKey) {
        e.preventDefault(); ed()?.execCommand('insert.quote')
      }
    }

    document.addEventListener('keydown', onKey)
    const api = window.electronAPI
    // onMenu* 是 ipcRenderer.on 的包装，必须成对解绑，否则 StrictMode 重挂会叠出重复监听
    const onNew = () => { dismissWelcome(); useEditorStore.getState().createDoc('untitled.md') }
    const onOpen = () => { dismissWelcome(); void pickFile().then(file => { if (file) importSingleFile(file) }) }
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
    const api = window.electronAPI
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
        if (!res?.ok || !res.text) {
          // 主进程会拒绝未授权的路径（file:read 只放行文件关联发放的授权）。
          // 这里原本静默 return，配合欢迎页已经 dismissWelcome()，用户双击文件只会看到欢迎页
          // 消失然后什么都没有——失败必须说出来
          toast(`打开文件失败：${res?.error || filePath}`, { type: 'error', duration: 4000 })
          return
        }
        const name = String(res.name || filePath.split(/[\\/]/).pop() || 'untitled.md')
        const es = useEditorStore.getState()
        const id = es.createDoc(name, '', undefined, filePath)
        const html = mdToHtml(res.text)
        es.updateDoc({ md: res.text, html, docsMd: { [id]: res.text } })
        try { localStorage.setItem(`lzeditor-doc-${id}`, JSON.stringify({ md: res.text, html, savedAt: Date.now() })) } catch {}
        getEditorFacade()?.setText(res.text)
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
  // markdown 源码：左右对齐没有 markdown 语法，落 HTML 的 float；渲染管线放行 img/style
  const insertImage = (url: string, alt: string, align?: 'top' | 'left' | 'right') => {
    insertMarkdown(buildImageMd(url, alt, align))
  }
  const uploadImage = (file: File, align?: 'top' | 'left' | 'right') => {
    if (!getEditorFacade()) return
    const reader = new FileReader()
    reader.onload = (ev) => insertImage(ev.target?.result as string, file.name, align)
    reader.readAsDataURL(file)
    closeInsert()
  }
  const insertMarkdown = (md: string) => {
    const facade = getEditorFacade()
    // getSelection() 已从 DOM 反推当前光标（A3）：typewriter 未同步时也能锚定光标
    // 而非退化到文末。?? undefined 仅在 DOM 也确定不了时兜底为「追加到文末」。
    if (facade) { facade.insertText(md, facade.getSelection() ?? undefined); closeInsert(); return }
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
    const facade = getEditorFacade()
    // 与图片/链接/表情/表格一致：锚定光标（getSelection()），而非退化到文末（A3）。
    if (facade) facade.insertText(`\`\`\`${lang}\n${code}\n\`\`\``, facade.getSelection() ?? undefined)
    closeInsert()
  }
  const insertLink = (text: string, url: string, newTab?: boolean) => {
    const facade = getEditorFacade()
    if (!facade) return
    const label = (text.trim() || url).replace(/\s+/g, ' ')
    const anchor = facade.getSelection() ?? undefined
    if (newTab) {
      // markdown 链接无法表达 target，落 HTML（消毒白名单放行 target 属性）
      facade.insertText(`<a href="${escAttr(url)}" target="_blank" rel="noopener">${label}</a>`, anchor)
    } else {
      facade.insertText(`[${label}](${url})`, anchor)
    }
    closeInsert()
  }
  const insertFormula = (formula: string) => {
    const facade = getEditorFacade()
    // 行内 $$f$$（与 CM6 一致）+ 光标锚定，与其它插入行为一致（A3）。
    if (facade) facade.insertText(`$$${formula}$$`, facade.getSelection() ?? undefined)
    closeInsert()
  }
  const insertChart = (src: string, alt: string, type: string) => {
    // 图表是位图，类型信息只能进 alt 文本（读屏/导出 Word 都能看到）
    const label = `${CHART_TYPE_LABEL[type] ?? '图表'}：${alt}`.replace(/\]/g, '\\]')
    const facade = getEditorFacade()
    facade?.insertText(`\n\n![${label}](${src})\n\n`, facade.getSelection() ?? undefined)
    closeInsert()
  }
  const insertEmoji = (text: string) => {
    const facade = getEditorFacade()
    facade?.insertText(text, facade.getSelection() ?? undefined)
    closeInsert()
  }
  const insertTable = (rows: number, cols: number, data?: string[][], withHeaderRow = true) => {
    if (rows <= 0 || cols <= 0) return
    const facade = getEditorFacade()
    facade?.insertText(`\n\n${buildTableMd(rows, cols, data, withHeaderRow)}\n\n`, facade.getSelection() ?? undefined)
    closeInsert()
  }

  // ── 新编辑器（yeli 区块画布）的受控数据面 ──
  // md 输入：优先 docsMd，其次文档源码兜底（builtin/README），避免首开空内容。
  const editorMd = useMemo(() => {
    const docId = activeDocId || 'readme'
    if (docsMd?.[docId]) return docsMd[docId]
    return getDocMd(docId) || (docId === 'readme' ? README_CONTENT : '')
  }, [activeDocId, docsMd])

  // 大文档输入性能：mdToHtml 在每键同步全量渲染（497KB → ~900ms/键）会卡输入。
  // 修复：md 立即保存（不丢内容），html 计算 + docHTML 更新 + localStorage 走
  // debounce（~180ms 停顿后计算），消除每键同步渲染阻塞。切文档时只更新仍在看的 docHTML。
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (renderTimerRef.current) clearTimeout(renderTimerRef.current) }, [])

  // onChange(md) 输出：保真 md 回写 store + docsMd（同步），html 计算与落盘走 debounce。
  const handleEditorChange = useCallback((md: string) => {
    const es = useEditorStore.getState()
    es.setMdContent(md)
    const docId = es.activeDocId
    if (!docId) return
    // 立即保存 md：关文档/切文档不丢最新内容（html 由 debounce 补算）
    es.updateDoc({ md, docsMd: { [docId]: md } })
    if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
    renderTimerRef.current = setTimeout(() => {
      try {
        const html = mdToHtml(md)
        const st = useEditorStore.getState()
        if (st.activeDocId === docId) st.updateDoc({ html })
        // 插件 will-save 钩子（只读）：在真正落盘前调用，不改保存逻辑
        const title = st.docs.find((d: any) => d.id === docId)?.title ?? ''
        runWillSave({ md, title })
        localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md, html, savedAt: Date.now() }))
        // 本地编辑快照：程序化载入（回滚/重播）期间抑制，避免产生重复快照。
        if (!isVersionSuppressed()) {
          const st2 = useEditorStore.getState()
          const prev = st2.versionsByDoc?.[docId]?.at(-1)?.md ?? ''
          const { date, time } = formatTimeTs(Date.now())
          st2.addVersion(docId, { id: nextVersionId(), md, html, ts: Date.now(), date, time, desc: '本地编辑', changes: countLineDiff(prev, md), source: 'local' })
        }
      } catch (e) { silentError('编辑器内容回写文档失败', e) }
    }, 180)
  }, [])

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
    // 排版模式不挂源码编辑器：样式面板独占全宽，左侧源码应隐藏（见 modeLayout）。
    if (appMode === 'style') {
      return null
    }
    // 编辑 / 代码 两种模式挂编辑器：edit（默认）→ Milkdown WYSIWYG，
    // code → CM6 源码视图。切换经 store.setAppMode 保真（不丢 markdown）。
    if (appMode === 'code') {
      return <CodeEditor md={editorMd} onChange={handleEditorChange} />
    }
    return <MilkdownEditor md={editorMd} onChange={handleEditorChange} />
  })()

  // 右侧预览只在编辑模式下显示：代码/排版/历史/阅读模式都有自己独立的右栏或全宽内容
  // WYSIWYG 模式本身就是整篇渲染视图，再显示预览会同一篇文档渲染两次，故一并排除（见 modeLayout）。
  const showRightPreview = shouldShowRightPreview({ showPreview, appMode })

  // ── 顶部布局 ──
  const topLayout = (
    <>
      <Toolbar />
      <DocumentMetaBar />
      <div className="app-main" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* 文档库最左侧：大纲与文档库同时显示时，文档库在左、大纲在右。 */}
        {showLibrary && <LibraryPanel sidebar className={libraryClosing ? 'closing' : ''} />}
        {showOutline && <SidebarOutline />}
        {/* 排版模式：centerContent 返回 null（源码编辑器不渲染），样式面板独占全宽 */}
        {centerContent}
        {/* 顶部布局同样要给排版面板留右栏：showRightPreview 已排除 style，
            没有这一段的话点「样式」只会把预览藏掉，面板不出现，看起来像没反应 */}
        {appMode === 'style' ? (
          <div className={`app-right-panel app-right-panel--style${stylePanelAnimating ? ` ${stylePanelAnimating}` : ''}`}>
            <div className="style-mode-stack"><StyleMainPanel /></div>
          </div>
        ) : showRightPreview && <SidebarPreview />}
      </div>
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

      {/* 中编辑区：排版模式不渲染（样式面板独占全宽，左侧源码隐藏） */}
      {shouldShowCenterColumn(appMode) && (
        <div className="app-center">
          <DocumentMetaBar />
          <div className="app-editor-area">
            {centerContent}
          </div>
        </div>
      )}

      {/* 右面板：单面板互斥，样式 > 预览 > 文档库。阅读/历史模式由中心内容独占，不留右栏。
          历史模式下 LeftNav 会把 showRightPanel 置 true，若右栏条件不整体排除 history，
          会与中心内容的 history 分支重复渲染同一份 HistoryPanel。
          showRightPanel 是只在 LeftNav 进入样式/历史时置 true 的冗余状态，其它入口退出
          样式后残留 true 会渲染空面板，故不再参与条件（见 modeLayout.shouldShowRightPanel）。 */}
      {shouldShowRightPanel({ appMode, showRightPreview, showLibrary }) && (
        <div className={`app-right-panel${appMode === 'style' ? ' app-right-panel--style' : ''}${appMode === 'style' && stylePanelAnimating ? ` ${stylePanelAnimating}` : ''}`}>
          {appMode === 'style' ? <div className="style-mode-stack"><StyleMainPanel /></div>
          : showRightPreview ? <SidebarPreview />
          : showLibrary ? <LibraryPanel sidebar />
          : null}
        </div>
      )}
      </div>
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
      <AIPanel />
      <PluginFloatingViews />

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
