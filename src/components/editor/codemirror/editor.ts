import { EditorView } from '@codemirror/view'
import { type Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { history, undo, redo } from '@codemirror/commands'
import { search } from '@codemirror/search'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { drawSelection, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { type FormatCommand, runFormatCommand } from './commands'
import { setupAutoPair, teardownAutoPair } from './autopair'
import { setupSmartPaste, teardownSmartPaste } from './smart-paste'
import { setupImageDropPaste, teardownImageDropPaste, setImageHandler } from './image-input'
import { typewriterExtension, enableTypewriter, disableTypewriter } from './typewriter'
import { setSnippetImpl, snippetCompletionSource } from './complete'
import type { MarkdownSnippet } from './snippets'

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
  toggleTask: (line: number) => boolean
  setText: (text: string) => void
  getText: () => string
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
  onScroll: (handler: () => void) => () => void
  onSelection: (handler: (line: number, col: number, selText: string | null) => void) => () => void
  view: EditorView
}

const basicKeymap = keymap.of([
  { key: 'Mod-z', run: undo, preventDefault: true },
  { key: 'Mod-Shift-z', run: redo, preventDefault: true },
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

export function createCM6Editor(options: CM6EditorOptions): CM6EditorCommands {
  const { parent, doc, onChange: _onChange, onCursor } = options

  const extensions: Extension[] = [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    drawSelection(),
    history(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    search({ top: true }),
    basicKeymap,
    typewriterExtension,
    EditorView.lineWrapping,
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
  let currentAutoPair = false
  let currentContinueLists = true
  let currentLineNumbers = true
  let currentSpellcheck = true
  let currentSoftWrap = true
  let currentCurrentLine = true

  setupAutoPair(view, true)
  setupSmartPaste(view)
  setupImageDropPaste(view)
  setImageHandler(view, null)

  const cmd: CM6EditorCommands = {
    run(command: FormatCommand): boolean {
      return runFormatCommand(view, command)
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

    openSearch(_replace: boolean): void {
      const panel = view.dom.querySelector('.cm-panel.cm-search') as HTMLElement | null
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? '' : 'none'
      }
    },

    findNext(): void {
      view.dispatch({ effects: [] })
    },

    findPrevious(): void {
      view.dispatch({ effects: [] })
    },

    undo(): boolean { return undo(view) },
    redo(): boolean { return redo(view) },
    focus(): void { view.focus() },
    setTabSize(_size: number): void {},
    setCurrentLine(on: boolean): void {
      if (on === currentCurrentLine) return
      currentCurrentLine = on
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
    },
    setLineNumbers(on: boolean): void {
      if (on === currentLineNumbers) return
      currentLineNumbers = on
    },
    setSpellcheck(on: boolean): void {
      if (on === currentSpellcheck) return
      currentSpellcheck = on
      view.dom.setAttribute('spellcheck', on ? 'true' : 'false')
    },
    setSoftWrap(on: boolean): void {
      if (on === currentSoftWrap) return
      currentSoftWrap = on
      if (on) view.dom.classList.add('cm-lineWrapping')
      else view.dom.classList.remove('cm-lineWrapping')
    },
    setTypewriter(on: boolean): void {
      if (on === currentTypewriter) return
      currentTypewriter = on
      if (on) enableTypewriter(view)
      else disableTypewriter(view)
    },
    setLivePreview(on: boolean): void {
      if (on === currentLivePreview) return
      currentLivePreview = on
    },
    setSnippets(_snippetList: MarkdownSnippet[]): void {
      setSnippetImpl(snippetCompletionSource())
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
  teardownSmartPaste(view)
  teardownImageDropPaste(view)
  disableTypewriter(view)
  view.destroy()
}
