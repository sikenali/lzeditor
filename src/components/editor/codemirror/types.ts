import { EditorView } from '@codemirror/view'
import type { CM6EditorCommands } from './editor'

declare global {
  interface HTMLElement {
    _cm6Editor?: CM6EditorCommands
    _cm6View?: EditorView
    _autoPairHandler?: EventListener
    _smartPasteHandler?: EventListener
    _imageDropHandler?: EventListener
    _imageDropHandlerDrop?: EventListener
    _typewriterScroll?: EventListener
  }
}
