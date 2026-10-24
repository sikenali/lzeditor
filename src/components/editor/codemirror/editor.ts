import { EditorView } from '@codemirror/view'
import { EditorState, type Extension, Compartment } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { history, undo, redo } from '@codemirror/commands'
import {
  search,
  SearchQuery,
  setSearchQuery,
  findNext as cmFindNext,
  findPrevious as cmFindPrevious,
  replaceNext as cmReplaceNext,
  replaceAll as cmReplaceAll,
  openSearchPanel,
} from '@codemirror/search'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { drawSelection, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { type FormatCommand, runFormatCommand, tableGrid as cmTableGrid } from './commands'
import { setupAutoPair, teardownAutoPair } from './autopair'
import { setupInputFormat, teardownInputFormat, setInputFormatSettings, inputFormatListener, type InputFormatSettings } from './input-format'
import { setupSmartPaste, teardownSmartPaste } from './smart-paste'
import { setupImageDropPaste, teardownImageDropPaste, setImageHandler } from './image-input'
import { typewriterExtension, enableTypewriter, disableTypewriter } from './typewriter'
import { setSnippetImpl, snippetCompletionSource, snippetSource, snippetDataField, completionSetup, snippetTabKeymap, setSnippetDataEffect } from './complete'
import { slashPaletteExtension } from './slash'
import type { MarkdownSnippet } from './snippets'
import { livePreviewExtension } from './live-preview'

export type { FormatCommand }

export interface CM6EditorOptions {
  parent: HTMLElement
  doc: string
  onChange: () => void
  onCursor: (line: number, column: number) => void
  onCounts?: (words: number, chars: number) => void
}

export interface CM6EditorCommands {
  run: (command: FormatCommand) => boolean
  tableGrid: (rows: number, cols: number) => boolean
  toggleTask: (line: number) => boolean
  setText: (text: string) => void
  getText: () => string
  insertText: (text: string) => void
  getSelectionText: () => string
  getSelectionRange: () => { from: number; to: number }
  replaceSelection: (text: string) => void
  replaceRange: (from: number, to: number, text: string) => void
  /** 光标跳到字符偏移处并滚到可见区（大纲跳转用） */
  goto: (from: number, to?: number) => void
  deleteRange: (from: number, to: number) => void
  search: (opts: { query: string; replace?: string; caseSensitive?: boolean; action?: 'search' | 'next' | 'prev' | 'replace' | 'replaceAll' }) => void
  openSearch: (replace: boolean) => void
  findNext: () => void
  findPrevious: () => void
  undo: () => boolean
  redo: () => boolean
  focus: () => void
  setTabSize: (size: number) => void
  setCurrentLine: (on: boolean) => void
  setAutoPair: (on: boolean) => void
  setContinueLists: (on: boolean) => void
  setLineNumbers: (on: boolean) => void
  setSpellcheck: (on: boolean) => void
  setSoftWrap: (on: boolean) => void
  setTypewriter: (on: boolean) => void
  setLivePreview: (on: boolean) => void
  setSnippets: (snippets: MarkdownSnippet[]) => void
  setInputFormat: (next: Partial<InputFormatSettings>) => void
  onScroll: (handler: () => void) => () => void
  onSelection: (handler: (line: number, col: number, selText: string | null) => void) => () => void
  view: EditorView
}

const undoKeymap = keymap.of([
  { key: 'Mod-z', run: undo, preventDefault: true },
  { key: 'Mod-Shift-z', run: redo, preventDefault: true },
])

// 列表/任务项回车续写：受「续写列表」开关控制，单独成 keymap 便于动态增删
const continuationKeymap = keymap.of([
  { key: 'Enter', run: (view) => {
    const state = view.state
    const { from } = state.selection.main
    const line = state.doc.lineAt(from)
    const text = line.text
    const match = text.match(/^(\s*)([-*+]|\d+[.)])(\s+)(\[([ xX])\])?$/)
    if (!match || from !== line.from) return false
    const continuation = match[1] + match[2] + match[3]
    if (match[4]) {
      const box = match[5]
      view.dispatch({
        changes: { from: line.from, insert: continuation + (box === ' ' ? '[ ]' : '[x]') + ' ' },
        selection: { anchor: line.from + continuation.length + 6 },
        userEvent: 'input.type',
      })
      return true
    }
    view.dispatch({
      changes: { from: line.to, insert: continuation },
      selection: { anchor: line.to + continuation.length },
      userEvent: 'input.type',
    })
    return true
  }},
])

// 软换行（Mod+Enter）：GFM 用行尾两个空格表示强制换行
const hardBreakKeymap = keymap.of([
  { key: 'Mod-Enter', run: (view) => {
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: '  \n' },
      selection: { anchor: from + 3 },
      userEvent: 'input.type',
    })
    return true
  }, preventDefault: true },
])

export function createCM6Editor(options: CM6EditorOptions): CM6EditorCommands {
  const { parent, doc, onChange: _onChange, onCursor } = options

  // 可开关的扩展统一走 Compartment，set* 通过 reconfigure 增删
  const lineNumbersC = new Compartment()
  const tabSizeC = new Compartment()
  const wrapC = new Compartment()
  const typewriterC = new Compartment()
  const currentLineC = new Compartment()
  const livePreviewC = new Compartment()
  const continuationC = new Compartment()

  const extensions: Extension[] = [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    tabSizeC.of(EditorState.tabSize.of(2)),
    drawSelection(),
    history(),
    search({ top: true }),
    undoKeymap,
    lineNumbersC.of([]),
    currentLineC.of([highlightActiveLine(), highlightActiveLineGutter()]),
    wrapC.of(EditorView.lineWrapping),
    typewriterC.of([]),
    livePreviewC.of([]),
    continuationC.of(continuationKeymap),
    hardBreakKeymap,
    completionSetup([snippetSource]),
    snippetTabKeymap,
    snippetDataField,
    inputFormatListener,
    slashPaletteExtension,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange()
      if (update.docChanged || update.selectionSet) {
        const { from } = update.state.selection.main
        const line = update.state.doc.lineAt(from)
        onCursor(line.number, from - line.from + 1)
        if (options.onCounts) {
          const text = update.state.doc.toString()
          const words = text.split(/\s+/).filter(Boolean).length
          options.onCounts(words, text.length)
        }
      }
    }),
  ]

  const view = new EditorView({
    parent,
    doc,
    extensions,
  })

  let currentTypewriter = false
  let currentLivePreview = false
  let currentAutoPair = true
  let currentContinueLists = true
  let currentLineNumbers = false
  let currentSpellcheck = true
  let currentSoftWrap = true
  let currentCurrentLine = true

  setSnippetImpl(snippetCompletionSource())
  setupAutoPair(view, true)
  setupInputFormat(view)
  setupSmartPaste(view)
  setupImageDropPaste(view)
  // 截图粘贴/拖拽图片 → markdown 图片插入光标处；handler 为空时截图会被静默吞掉
  setImageHandler(view, (images) => {
    const sel = view.state.selection.main
    const body = images.map(i => `![${i.alt}](${i.src})`).join('\n\n')
    const insert = `\n\n${body}\n\n`
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert },
      selection: { anchor: sel.from + insert.length },
      userEvent: 'input',
    })
  })

  const cmd: CM6EditorCommands = {
    run(command: FormatCommand): boolean {
      return runFormatCommand(view, command)
    },

    tableGrid(rows: number, cols: number): boolean {
      const spec = cmTableGrid(view.state, rows, cols)
      if (!spec) return false
      view.dispatch(spec)
      view.focus()
      return true
    },

    toggleTask(line: number): boolean {
      const state = view.state
      const target = state.doc.line(line + 1)
      if (!target) return false
      const TASK_LINE = /^([ \t]*(?:>[ \t]?)*[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+)\[([ xX])\](?=[ \t]|$)/
      const match = TASK_LINE.exec(target.text)
      if (!match) return false
      const box = target.from + (match[1] ?? '').length
      view.dispatch({
        changes: { from: box + 1, to: box + 2, insert: match[2] === ' ' ? 'x' : ' ' },
        userEvent: 'input.task',
      })
      return true
    },

    setText(text: string): void {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor: 0 },
      })
    },

    getText(): string {
      return view.state.doc.toString()
    },

    insertText(text: string): void {
      const main = view.state.selection.main
      view.dispatch({
        changes: { from: main.from, to: main.to, insert: text },
        selection: { anchor: main.from + text.length },
        scrollIntoView: true,
        userEvent: 'input',
      })
      view.focus()
    },

    getSelectionText(): string {
      const main = view.state.selection.main
      return main.empty ? '' : view.state.sliceDoc(main.from, main.to)
    },

    getSelectionRange(): { from: number; to: number } {
      const main = view.state.selection.main
      return { from: main.from, to: main.to }
    },

    replaceRange(from: number, to: number, text: string): void {
      const len = view.state.doc.length
      const f = Math.max(0, Math.min(from, len))
      const t = Math.max(f, Math.min(to, len))
      view.dispatch({ changes: { from: f, to: t, insert: text }, scrollIntoView: true })
      view.focus()
    },

    replaceSelection(text: string): void {
      const main = view.state.selection.main
      view.dispatch({
        changes: { from: main.from, to: main.to, insert: text },
        selection: { anchor: main.from, head: main.from + text.length },
        scrollIntoView: true,
      })
      view.focus()
    },

    search(opts: { query: string; replace?: string; caseSensitive?: boolean; action?: 'search' | 'next' | 'prev' | 'replace' | 'replaceAll' }): void {
      const action = opts.action ?? 'search'
      if (opts.query !== undefined) {
        view.dispatch({
          effects: setSearchQuery.of(new SearchQuery({
            search: opts.query,
            replace: opts.replace || '',
            caseSensitive: !!opts.caseSensitive,
          })),
        })
      }
      if (action === 'next') { cmFindNext(view); return }
      if (action === 'prev') { cmFindPrevious(view); return }
      if (action === 'replace') { cmReplaceNext(view); return }
      if (action === 'replaceAll') { cmReplaceAll(view); return }
      const query = new SearchQuery({
        search: opts.query,
        replace: opts.replace || '',
        caseSensitive: !!opts.caseSensitive,
      })
      view.dispatch({ effects: setSearchQuery.of(query) })
      openSearchPanel(view)
      view.focus()
    },

    openSearch(replace: boolean): void {
      if (replace) openSearchPanel(view)
      else view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) })
    },

    findNext(): void { cmFindNext(view) },

    findPrevious(): void { cmFindPrevious(view) },

    undo(): boolean { return undo(view) },
    redo(): boolean { return redo(view) },
    focus(): void { view.focus() },
    setTabSize(size: number): void {
      const n = Math.max(1, Math.min(16, Math.round(size)))
      if (view.state.facet(EditorState.tabSize) === n) return
      view.dispatch({ effects: tabSizeC.reconfigure(EditorState.tabSize.of(n)) })
    },
    setCurrentLine(on: boolean): void {
      if (on === currentCurrentLine) return
      currentCurrentLine = on
      view.dispatch({ effects: currentLineC.reconfigure(on ? [highlightActiveLine(), highlightActiveLineGutter()] : []) })
    },
    setAutoPair(on: boolean): void {
      if (on === currentAutoPair) return
      currentAutoPair = on
      teardownAutoPair(view)
      if (on) setupAutoPair(view, true)
    },
    setContinueLists(on: boolean): void {
      if (on === currentContinueLists) return
      currentContinueLists = on
      view.dispatch({ effects: continuationC.reconfigure(on ? continuationKeymap : []) })
    },
    setLineNumbers(on: boolean): void {
      if (on === currentLineNumbers) return
      currentLineNumbers = on
      view.dispatch({ effects: lineNumbersC.reconfigure(on ? lineNumbers() : []) })
    },
    setSpellcheck(on: boolean): void {
      if (on === currentSpellcheck) return
      currentSpellcheck = on
      view.dom.setAttribute('spellcheck', on ? 'true' : 'false')
    },
    setSoftWrap(on: boolean): void {
      if (on === currentSoftWrap) return
      currentSoftWrap = on
      view.dispatch({ effects: wrapC.reconfigure(on ? EditorView.lineWrapping : []) })
      if (on) view.dom.classList.add('cm-lineWrapping')
      else view.dom.classList.remove('cm-lineWrapping')
    },
    setTypewriter(on: boolean): void {
      if (on === currentTypewriter) return
      currentTypewriter = on
      view.dispatch({ effects: typewriterC.reconfigure(on ? typewriterExtension : []) })
      if (on) enableTypewriter(view)
      else disableTypewriter(view)
    },
    setLivePreview(on: boolean): void {
      if (on === currentLivePreview) return
      currentLivePreview = on
      view.dispatch({ effects: livePreviewC.reconfigure(on ? livePreviewExtension : []) })
    },
    setSnippets(snippetList: MarkdownSnippet[]): void {
      view.dispatch({ effects: setSnippetDataEffect({ snippets: snippetList }) })
    },

    setInputFormat(next: Partial<InputFormatSettings>): void {
      setInputFormatSettings(next)
    },

    goto(from: number, to?: number): void {
      const len = view.state.doc.length
      const f = Math.max(0, Math.min(from, len))
      const t = to === undefined ? f : Math.max(f, Math.min(to, len))
      view.dispatch({
        selection: { anchor: f, head: t },
        scrollIntoView: true,
      })
      view.focus()
    },

    deleteRange(from: number, to: number): void {
      const len = view.state.doc.length
      const f = Math.max(0, Math.min(from, len))
      const t = Math.max(f, Math.min(to, len))
      if (f === t) return
      view.dispatch({
        changes: { from: f, to: t },
        selection: { anchor: f },
        userEvent: 'delete.range',
      })
      view.focus()
    },

    onScroll(handler: () => void): () => void {
      const el = view.scrollDOM
      el.addEventListener('scroll', handler, { passive: true })
      return () => el.removeEventListener('scroll', handler)
    },
    onSelection(handler: (line: number, col: number, selText: string | null) => void): () => void {
      const tick = () => {
        const { from, to } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        handler(line.number, from - line.from + 1, from !== to ? view.state.sliceDoc(from, to) : null)
      }
      tick()
      const obs = new MutationObserver(tick)
      obs.observe(view.dom, { childList: true, subtree: true, attributes: true })
      return () => obs.disconnect()
    },
    get view() { return view },
  }

  return cmd
}

export function destroyCM6Editor(view: EditorView): void {
  teardownAutoPair(view)
  teardownInputFormat(view)
  teardownSmartPaste(view)
  teardownImageDropPaste(view)
  disableTypewriter(view)
  view.destroy()
}
