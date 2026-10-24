import { EditorView } from '@codemirror/view'

export interface ImageInfo {
  src: string
  alt: string
}

type ImageHandler = (links: ImageInfo[]) => void

const handlers = new WeakMap<EditorView, ImageHandler | null>()

export function setImageHandler(view: EditorView, handler: ImageHandler | null): void {
  handlers.set(view, handler)
}

function triggerImageInsert(view: EditorView, links: ImageInfo[]): void {
  const handler = handlers.get(view)
  if (handler) handler(links)
}

export function setupImageDropPaste(view: EditorView): void {
  const onPaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return
    const images: ImageInfo[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            images.push({ src: ev.target?.result as string, alt: file.name })
            if (images.length > 0) triggerImageInsert(view, [...images])
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  const onDrop = (event: DragEvent) => {
    const files = event.dataTransfer?.files
    if (!files) return
    event.preventDefault()
    const images: ImageInfo[] = []
    const imgFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    let loaded = 0
    imgFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        images.push({ src: ev.target?.result as string, alt: file.name })
        loaded++
        if (loaded === imgFiles.length && images.length > 0) {
          triggerImageInsert(view, [...images])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  view.dom.addEventListener('paste', onPaste)
  view.dom.addEventListener('drop', onDrop)
  ;(view.dom as any)._imageDropHandler = onPaste
  ;(view.dom as any)._imageDropHandlerDrop = onDrop
}

export function teardownImageDropPaste(view: EditorView): void {
  if ((view.dom as any)._imageDropHandler) {
    view.dom.removeEventListener('paste', (view.dom as any)._imageDropHandler)
    delete (view.dom as any)._imageDropHandler
  }
  if ((view.dom as any)._imageDropHandlerDrop) {
    view.dom.removeEventListener('drop', (view.dom as any)._imageDropHandlerDrop)
    delete (view.dom as any)._imageDropHandlerDrop
  }
}
