import {
  acceptCompletion,
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionSource,
  completionStatus,
  selectedCompletion,
} from '@codemirror/autocomplete'
import { type EditorState, type Extension, Prec, StateEffect, StateField } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import type { MarkdownSnippet } from './snippets'

export type { MarkdownSnippet }

export interface SnippetData {
  snippets?: MarkdownSnippet[]
}

const setData = StateEffect.define<SnippetData>()

export const snippetDataField = StateField.define<SnippetData>({
  create: () => ({}),
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(setData)) return effect.value
    return value
  },
})

export const setSnippetDataEffect = (data: SnippetData): StateEffect<SnippetData> =>
  setData.of(data)

export function getSnippetData(state: EditorState): SnippetData {
  return state.field(snippetDataField, false) ?? {}
}

let snippetImpl: CompletionSource | null = null

export const snippetSource: CompletionSource = (context) => snippetImpl?.(context) ?? null

export function setSnippetImpl(source: CompletionSource | null): void {
  snippetImpl = source
}

export const snippetTabKeymap: Extension = Prec.highest(
  keymap.of([
    {
      key: 'Tab',
      run: (view) =>
        completionStatus(view.state) === 'active' &&
        selectedCompletion(view.state)?.type === 'snippet' &&
        acceptCompletion(view),
    },
  ]),
)

const SNIPPET_TRIGGER = /(?:^|\s)(\/\w*)$/

export function snippetCompletionSource(): CompletionSource {
  return (context) => {
    const match = context.matchBefore(SNIPPET_TRIGGER)
    if (!match) return null
    const data = getSnippetData(context.state)
    const snippets = data.snippets ?? []
    if (snippets.length === 0) return null

    const filter = match.text.slice(1)
    const matches = snippets.filter(s => s.trigger.includes(filter) || s.label.includes(filter))
    if (matches.length === 0) return null

    const options: Completion[] = matches.map(s => ({
      label: s.label,
      detail: s.trigger,
      type: 'snippet',
      apply: (view) => {
        view.dispatch({
          changes: { from: match.from, to: match.from + match.text.length, insert: s.body },
          selection: { anchor: match.from + s.body.length },
          userEvent: 'input.complete',
        })
      },
    }))
    return { from: match.from, options, validFor: /^\/?\w*$/ }
  }
}

/**
 * 片段补全默认不跟随输入弹出：`/` 是斜杠命令面板的入口（见 slash.ts），
 * 两个弹层会同时出现。片段补全靠 Ctrl+Space（completionKeymap）手动触发。
 */
export function completionSetup(sources: CompletionSource[]): Extension {
  if (sources.length === 0) return []
  return [
    keymap.of(completionKeymap),
    autocompletion({
      override: sources,
      activateOnTyping: false,
      icons: false,
      maxRenderedOptions: 50,
    }),
  ]
}
