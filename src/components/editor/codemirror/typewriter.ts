import { EditorView } from '@codemirror/view'
import { type Extension } from '@codemirror/state'

function keepCursorCentered(view: EditorView): void {
  try {
    const { from } = view.state.selection.main
    const coords = view.coordsAtPos(from)
    if (!coords) return
    const dom = view.scrollDOM
    const rect = dom.getBoundingClientRect()
    if (coords.top === undefined) return
    const offset = coords.top - rect.top - rect.height / 2
    dom.scrollTop += offset
  } catch {}
}

export const typewriterExtension: Extension = EditorView.updateListener.of((update) => {
  if (!update.docChanged && !update.selectionSet) return
  keepCursorCentered(update.view)
})

export function enableTypewriter(view: EditorView): void {
  const onScroll = () => keepCursorCentered(view)
  view.scrollDOM.addEventListener('scroll', onScroll, { passive: true })
  ;(view.scrollDOM as any)._typewriterScroll = onScroll
}

export function disableTypewriter(view: EditorView): void {
  const handler = (view.scrollDOM as any)._typewriterScroll
  if (handler) {
    view.scrollDOM.removeEventListener('scroll', handler)
    delete (view.scrollDOM as any)._typewriterScroll
  }
}
