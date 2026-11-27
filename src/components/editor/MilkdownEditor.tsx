import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from '@milkdown/kit/core'
import { listenerCtx } from '@milkdown/kit/plugin/listener'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { configureEditorRoot, withEditorCore } from '../../additional/milkdown/textus/editor/editor-extensions'
import { useSettings } from '../../additional/milkdown/textus/shim/settings-context'
import { useLatest } from '../../additional/milkdown/textus/utils/hooks/useLatest'
import { useEditorRunner } from '../../additional/milkdown/textus/editor/useEditorRunner'
import { createMilkdownEditorFacade } from './facade/milkdown/MilkdownEditorFacade'
import { getEditorFacade, registerEditorFacade } from './facade/registry'
import type { EditorFacade } from './facade/EditorFacade'
import { ScrollRail } from '../ui/ScrollRail'
import { MilkdownLineGutter } from './MilkdownLineGutter'
import { markersFromPreviewDom } from '../../utils/railMarkers'
import { useSettingsStore } from '../../store/settingsStore'
import { useEditorStore } from '../../store/editorStore'
import { lineColFromSource, lineContentOffset } from '../../utils/textStats'
import { fontStackFor } from '../../hooks/useTypographyOverrides'
import '../../additional/milkdown/milkdown.css'
import '@milkdown/kit/prose/view/style/prosemirror.css'
import '../../additional/milkdown/textus/theme/content-base.css'
import '../../additional/milkdown/textus/theme/content-themes.css'
import '../../additional/milkdown/textus/editor/milkdown-theme.css'
import '../../additional/milkdown/textus/editor/completion/completion-panel.css'
import '../../additional/milkdown/textus/editor/diagram-zoom.css'
import '../../additional/milkdown/textus/editor/hover/hover-card.css'

/* ═══════════════════════════════════════════════════════════
   Milkdown 可编辑编辑器（WYSIWYG，默认模式）。
   vendored Textus 装配（withEditorCore）+ 受控 markdown 初值 +
   markdownUpdated 回调把保真 markdown 带出。docPath 恒 null（无磁盘），
   走 noDiskImages 分支（同 TextusPreview）。CSS 由 .textus-editor-shell 作用域。
   挂载时注册自己的 EditorFacade（模式感知），卸载时清除——与 CodeEditor 同构。
   ═══════════════════════════════════════════════════════════ */

interface MilkdownEditorProps {
  /** 受控 markdown 初值/外部写入（切换文档时用）。 */
  md: string
  /** 每次编辑后带出保真 markdown（App 回写 store）。 */
  onChange: (md: string) => void
  /** 挂载就绪后提供已注册的 facade（可选，App 一般不直接用）。 */
  onReady?: (facade: EditorFacade) => void
  /** 预览分屏时隐藏编辑区导航 rail（避免与预览 rail 重复，优化 #6）。 */
  hideRail?: boolean
}

function EditableEditor({ md, onChange, onReady, shellRef }: MilkdownEditorProps & { shellRef: React.RefObject<HTMLDivElement | null> }) {
  const { settings, t } = useSettings()
  const autoPair = useSettingsStore((s) => s.autoPair)
  const autoCompleteMarkdownPairs = useSettingsStore((s) => s.autoCompleteMarkdownPairs)
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers)
  const smartQuotes = useSettingsStore((s) => s.smartQuotes)
  const cornerQuotes = useSettingsStore((s) => s.cornerQuotes)
  const autoSpaceCJK = useSettingsStore((s) => s.autoSpaceCJK)
  const fullwidthSymbols = useSettingsStore((s) => s.fullwidthSymbols)
  const allowMarkdownSymbols = useSettingsStore((s) => s.allowMarkdownSymbols)
  // 把设置中心里的自动配对/自动补全/代码行号接到 Textus 的 settings 上：
  // 这些插件通过 `() => settings.current.*` 实时读取，所以切换开关即时生效。
  const settingsRef = useLatest({
    ...settings,
    autoCloseBrackets: autoPair !== false,
    autoCloseMarks: autoCompleteMarkdownPairs !== false,
    codeLineNumbers: showLineNumbers === true,
    smartQuotes: smartQuotes !== false,
    cornerQuotes: cornerQuotes === true,
    autoSpaceCJK: autoSpaceCJK !== false,
    fullwidthSymbols: fullwidthSymbols === true,
    allowMarkdownSymbols: allowMarkdownSymbols !== false,
  })
  const docPathRef = useLatest<string | null>(null)
  const labelRef = useLatest(t.splitPreview)
  const onChangeRef = useLatest(onChange)
  const runner = useEditorRunner()
  const facadeRef = useRef<EditorFacade | null>(null)

  // 命令入口就绪后创建并注册 facade（模式感知：哪个编辑器活着注册哪个）。
  useEffect(() => {
    if (!runner) return
    const facade = createMilkdownEditorFacade(runner, shellRef.current)
    facadeRef.current = facade
    registerEditorFacade(facade)
    onReady?.(facade)
    // 代码模式 → 编辑模式：沿用切换前的光标行（此前总是回到第 1 行）。
    const cursor = useEditorStore.getState().cursorPosition
    if (cursor?.line > 1) {
      const off = lineContentOffset(facade.getText(), cursor.line)
      facade.setSelection(off, off)
    }
    // 光标行列跟踪 → cursorPosition（task 9）：Milkdown 不更新，恒 行1列1。
    // 与 CodeEditor 同构：onSelectionChange 传 ProseMirror 源偏移，换算 1-based 行列。
    const unsubscribeCursor = facade.onSelectionChange((sel) => {
      if (!sel) return
      const { line, column } = lineColFromSource(facade.getText(), sel.from)
      useEditorStore.getState().setCursorPosition({ line, column })
    })
    return () => {
      unsubscribeCursor()
      if (getEditorFacade() === facade) registerEditorFacade(null)
      facadeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner])

  // 外部源码变化（切文档/导入/回滚）：与当前保真输出不同才 setText（不重置光标）。
  useEffect(() => {
    const facade = facadeRef.current
    if (facade && facade.getText() !== md) facade.setText(md)
  }, [md])

  useEditor((root) =>
    withEditorCore(
      Editor.make().config((ctx) => {
        configureEditorRoot(ctx, root, md, () => labelRef.current)
        // 每次编辑把保真 markdown 带出（markdownUpdated 已序列化）
        ctx.get(listenerCtx).markdownUpdated((_c, next) => onChangeRef.current(next))
      }),
      {
        settings: settingsRef,
        docPath: docPathRef,
        currentLine: () => useSettingsStore.getState().currentLine !== false,
        focusMode: () => useSettingsStore.getState().focusMode === true,
        // 无磁盘后端：noDiskImages 为 no-op 插件，关闭 disk 图片/链接管线
        noDiskImages: () => () => {},
      },
    ),
  )

  return <Milkdown />
}

export const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const defaultFontSize = useSettingsStore((s) => s.defaultFontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const editorFont = useSettingsStore((s) => s.editorFont)
  const contentWidth = useSettingsStore((s) => s.contentWidth)
  const enableSpellCheck = useSettingsStore((s) => s.enableSpellCheck)
  const spellCheckLang = useSettingsStore((s) => s.spellCheckLang)
  const tabSize = useSettingsStore((s) => s.tabSize)
  const softWrap = useSettingsStore((s) => s.softWrap)
  // 行号栏用「编辑器实际序列化出来的 md」，与光标行列（facade.getSelection 的源偏移）
  // 用同一份文本，避免初始 md 与序列化文本的块边界不同导致行号对不上。
  const [gutterMd, setGutterMd] = useState(props.md)
  useEffect(() => { setGutterMd(props.md) }, [props.md])
  useEffect(() => {
    let alive = true
    let tries = 0
    const tick = () => {
      if (!alive) return
      const facade = getEditorFacade()
      if (facade) {
        const text = facade.getText()
        if (text) setGutterMd(text)
        return
      }
      if (++tries < 50) setTimeout(tick, 100)
    }
    tick()
    return () => { alive = false }
  }, [props.md])

  // 预览滚动同步需要编辑器滚动容器（优化 #9）：把 .milkdown 交给 store，
  // ScrollSync 在 CM6 桥缺失（Milkdown 是 ProseMirror）时按比例回退同步。
  // .milkdown 由 MilkdownProvider 异步挂载，用 MutationObserver 等它出现。
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    let scroller: HTMLDivElement | null = null
    const bind = () => {
      if (!scroller) {
        scroller = shell.querySelector<HTMLDivElement>('.milkdown')
        if (scroller) useEditorStore.getState().setEditorContentRef(scroller)
      }
    }
    bind()
    const obs = new MutationObserver(bind)
    obs.observe(shell, { childList: true, subtree: true })
    return () => {
      obs.disconnect()
      useEditorStore.getState().setEditorContentRef(null)
    }
  }, [])

  // 编辑设置里的字号 / 行高同样作用于 WYSIWYG，否则两种编辑模式正文尺度不一致。
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    shell.style.setProperty('--cm-font-size', `${defaultFontSize}px`)
    shell.style.setProperty('--cm-line-height', lineHeight || '1.8')
    // content-themes.css 为纸面主题写死了 --doc-line-height: 27.33px，
    // 会压过 milkdown.css 的 var(--cm-line-height)。内联写 --doc-line-height
    // 才能让「行高」设置真正作用于所见即所得正文。
    shell.style.setProperty('--doc-line-height', lineHeight || '1.8')
    // 字体族也要接进所见即所得。content-themes.css 为纸面主题写死了
    // .milkdown 的 font-family，--doc-font 会被它压过；直接给 .milkdown
    // 写内联字体（最高优先级），设置「默认字体」才能在编辑模式生效。
    const applyFont = () => {
      const md = shell.querySelector<HTMLElement>('.milkdown')
      if (md) md.style.fontFamily = fontStackFor(editorFont)
    }
    applyFont()
    const obs = new MutationObserver(applyFont)
    obs.observe(shell, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [defaultFontSize, lineHeight, editorFont])
  // 拼写检查 / tab 宽度 / 软换行：Milkdown 的 ProseMirror DOM 挂载后才存在，
  // 用 MutationObserver 在出现时应用（与上面拿滚动容器的做法一致）。
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const apply = () => {
      const pm = shell.querySelector<HTMLElement>('.ProseMirror')
      if (!pm) return
      pm.spellcheck = enableSpellCheck !== false
      pm.setAttribute('lang', spellCheckLang || 'zh-CN')
      pm.style.tabSize = String(tabSize || 2)
      pm.style.whiteSpace = softWrap === false ? 'pre' : ''
    }
    apply()
    const obs = new MutationObserver(apply)
    obs.observe(shell, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [enableSpellCheck, spellCheckLang, tabSize, softWrap])
  // 内容列宽跟随编辑设置（G14）：默认 760px，用户可调 960/1024/1200/1280
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    shell.style.setProperty("--document-width", `${contentWidth}px`)
  }, [contentWidth])
  // G13 纸面必须跟随 app 亮/暗，不能跟 OS prefers-color-scheme。vendored
  // content-themes.css 的 [data-content-theme="paper"] 只按 shell 上的 data-theme
  // 或 OS 媒体查询选纸面 token，所以壳必须镜像 app data-theme（同 TextusPreview）。
  // 同时把 --doc-bg 钉死在壳 inline 上，覆盖 vendored 的暗纸 #1f1b16，命中 plan 的
  // 字面 #1C1C1F（:root 上 applyTheme 已按当前主题写好 inline --doc-bg）。
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const root = document.documentElement
    const apply = () => {
      const theme = root.getAttribute('data-theme')
      if (theme === 'dark' || theme === 'light') shell.setAttribute("data-theme", theme)
      else shell.removeAttribute('data-theme')
      const bg = root.style.getPropertyValue('--doc-bg')
      if (bg) shell.style.setProperty("--doc-bg", bg)
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  const getScroller = useCallback(
    () => shellRef.current?.querySelector<HTMLElement>('.milkdown') ?? null,
    [],
  )
  // WYSIWYG 的块已经渲染在 DOM 里，直接量真实位置（图片 / 代码块高度可变，
  // 按源码行号比例定位会漂）。源码模式才退回行号比例。
  const getMarkers = useCallback(
    () => markersFromPreviewDom(
      shellRef.current?.querySelector<HTMLElement>('.ProseMirror') ?? null,
      shellRef.current?.querySelector<HTMLElement>('.milkdown') ?? null,
    ),
    [],
  )
  return (
    <div className="textus-editor-shell" data-content-theme="paper" ref={shellRef}>
      <MilkdownProvider>
        <EditableEditor {...props} shellRef={shellRef} />
      </MilkdownProvider>
      {/* WYSIWYG 行号栏（优化 #28）：绝对定位兄弟，不触碰 Milkdown DOM */}
      <MilkdownLineGutter md={gutterMd} getScroller={getScroller} />
      {!props.hideRail && (
        <ScrollRail
          getScroller={getScroller}
          getMarkers={getMarkers}
          version={props.md}
          ariaLabel="编辑区文档导航"
        />
      )}
    </div>
  )
}
