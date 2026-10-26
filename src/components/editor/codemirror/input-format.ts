import { EditorView } from '@codemirror/view'
import { type Extension } from '@codemirror/state'
import { runFormatCommand, type FormatCommand } from './commands'

export interface InputFormatSettings {
  /** 选中文字后按 * _ ~ = 转成加粗/斜体/删除线/高亮 */
  allowMarkdownSymbols?: boolean
  /** "" → “” */
  smartQuotes?: boolean
  /** "" → 「」 */
  cornerQuotes?: boolean
  /** , ; → ， ； */
  fullwidthSymbols?: boolean
  /** 中日韩字符与英文数字之间补空格 */
  autoSpaceCJK?: boolean
  /** 引号自动配对（「」/「」以外的成对符号） */
  autoSpaceQuotes?: boolean
}

let settings: InputFormatSettings = {}

export function setInputFormatSettings(next: Partial<InputFormatSettings> = {}): void {
  settings = { ...settings, ...next }
}

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/

const SYMBOL_CMDS: Record<string, FormatCommand> = {
  '*': 'bold',
  '_': 'italic',
  '~': 'strikethrough',
  '=': 'highlight',
}

const FULLWIDTH: Record<string, string> = { ',': '，', ';': '；' }

const SMART: Record<string, [string, string]> = { '"': ['“', '”'], "'": ['‘', '’'] }
const CORNER: Record<string, [string, string]> = { '"': ['「', '」'], "'": ['『', '』'] }

/**
 * 键盘级输入变换。挂在 keydown 上而不是 keymap：引号/符号的分支需要看
 * 「紧邻的前一个字符」，keymap 的 run 拿不到原始按键序列，keydown 更直接。
 * 括号配对在 autopair.ts，这里只处理引号，避免两处同时改一个字符。
 */
export function setupInputFormat(view: EditorView): void {
  const handler = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const ch = e.key
    const { state, dispatch } = view
    const { from, to } = state.selection.main

    const symbolCmd = SYMBOL_CMDS[ch]
    if (symbolCmd) {
      if (!settings.allowMarkdownSymbols || from === to) return
      e.preventDefault()
      runFormatCommand(view, symbolCmd)
      return
    }

    if (FULLWIDTH[ch]) {
      if (!settings.fullwidthSymbols) return
      if (state.sliceDoc(from - 1, from) !== ch) return
      e.preventDefault()
      dispatch({
        changes: { from: from - 1, insert: FULLWIDTH[ch] },
        selection: { anchor: from },
        userEvent: 'input.format',
      })
      return
    }

    if (ch !== '"' && ch !== "'") return
    const smart = settings.smartQuotes || settings.cornerQuotes
    const pairOn = settings.autoSpaceQuotes || smart
    if (!pairOn) return

    const pair = settings.cornerQuotes ? CORNER[ch] : settings.smartQuotes ? SMART[ch] : null
    const next = state.sliceDoc(to, to + 1)
    const prev = state.sliceDoc(from - 1, from)

    if (next === ch) {
      e.preventDefault()
      dispatch({ changes: { from: to, to: to + 1 }, selection: { anchor: to }, userEvent: 'input.type' })
      return
    }
    if (prev === ch && pair) {
      e.preventDefault()
      dispatch({
        changes: { from: from - 1, insert: pair[0] + pair[1] },
        selection: { anchor: from },
        userEvent: 'input.format',
      })
      return
    }
    if (from !== to) return

    e.preventDefault()
    const open = pair ? pair[0] : ch
    const close = pair ? pair[1] : ch
    dispatch({
      changes: { from: to, insert: open + close },
      selection: { anchor: from + 1 },
      userEvent: 'input.type',
    })
  }

  view.dom.addEventListener('keydown', handler)
  ;(view.dom as any)._inputFormatHandler = handler
}

export function teardownInputFormat(view: EditorView): void {
  const handler = (view.dom as any)._inputFormatHandler
  if (handler) {
    view.dom.removeEventListener('keydown', handler)
    delete (view.dom as any)._inputFormatHandler
  }
}

/** 中日韩字符后面跟英文/数字时补一个空格，避免「中文abc」挤在一起。 */
export const inputFormatListener: Extension = EditorView.updateListener.of((update) => {
  if (!settings.autoSpaceCJK || !update.docChanged || update.view.state.readOnly) return
  const state = update.view.state
  update.changes.iterChanges((_fromA, _toA, _fromB, toB, inserted) => {
    if (inserted.length !== 1) return
    if (!CJK.test(inserted.toString())) return
    const after = state.sliceDoc(toB, toB + 1)
    if (!after || !/[A-Za-z0-9]/.test(after)) return
    update.view.dispatch({
      changes: { from: toB, insert: ' ' },
      selection: { anchor: toB + 1 },
      userEvent: 'input.format',
    })
  })
})
