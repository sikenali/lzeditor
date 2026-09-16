import React, { useEffect, useRef, useState } from 'react'

interface DrawIOEditorProps {
  initialData?: string
  onChange?: (data: string) => void
  onClose?: () => void
}

export const DrawIOEditor: React.FC<DrawIOEditorProps> = ({ initialData, onChange, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [editorLoaded, setEditorLoaded] = useState(false)

  useEffect(() => {
    // Load mxGraphEditor from CDN
    const loadEditor = async () => {
      try {
        // Load draw.io editor CSS
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://cdn.jsdelivr.net/npm/mxgraph@2.2.0/css/explorer.css'
        document.head.appendChild(cssLink)

        // Load draw.io editor JS
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/mxgraph@2.2.0/js/mxClient.js'
        script.onload = () => {
          setEditorLoaded(true)
          initEditor()
        }
        document.head.appendChild(script)
      } catch (error) {
        console.error('Failed to load draw.io editor:', error)
      }
    }

    const initEditor = () => {
      if (!containerRef.current || typeof (window as any).mxEditor === 'undefined') return

      const editor = new (window as any).mxEditor()
      const container = containerRef.current
      
      // Configure container
      const graph = new (window as any).mxGraph(container)
      const parent = graph.getDefaultParent()
      
      // Enable folding
      graph.setFoldable(true)
      graph.setScrollbars(true)
      graph.setEdgesResizable(true)
      graph.setCellsMovable(true)
      graph.setCellsResizable(true)

      // Add initial data if provided
      if (initialData) {
        const doc = (window as any).mxUtils.parseXml(initialData)
        const codec = new (window as any).mxCodec(doc)
        codec.decode(doc.documentElement, graph.getModel())
      }

      // Save on change
      graph.getModel().addListener((window as any).mxEvent.CHANGE, () => {
        const xml = (window as any).mxUtils.getPrettyXml(
          (new (window as any).mxCodec()).encode(graph.getModel())
        )
        onChange?.(xml)
      })

      // Store editor reference for cleanup
      ;(container as any).__drawioEditor = editor
      ;(container as any).__drawioGraph = graph
    }

    loadEditor()

    return () => {
      // Cleanup
      if (containerRef.current) {
        const editor = (containerRef.current as any).__drawioEditor
        const graph = (containerRef.current as any).__drawioGraph
        if (editor) editor.destroy()
        if (graph) graph.destroy()
      }
    }
  }, [initialData, onChange])

  if (!editorLoaded) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="remix" style={{ fontSize: 32 }}>\uF305</span>
        <p>正在加载 draw.io 编辑器...</p>
      </div>
    )
  }

  return (
    <div className="drawio-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="drawio-toolbar" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '8px 12px', 
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-default)'
      }}>
        <button 
          onClick={() => {
            const graph = (containerRef.current as any).__drawioGraph
            if (graph) {
              graph.exportImage('png', 1, (dataUrl: string) => {
                const link = document.createElement('a')
                link.download = 'diagram.png'
                link.href = dataUrl
                link.click()
              })
            }
          }}
          style={buttonStyle}
        >
          <span className="remix" style={{ fontSize: 14 }}>\uE915</span>
          导出PNG
        </button>
        <button 
          onClick={() => {
            const graph = (containerRef.current as any).__drawioGraph
            if (graph) {
              const xml = (window as any).mxUtils.getPrettyXml(
                (new (window as any).mxCodec()).encode(graph.getModel())
              )
              const blob = new Blob([xml], { type: 'application/xml' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.download = 'diagram.drawio'
              link.href = url
              link.click()
              URL.revokeObjectURL(url)
            }
          }}
          style={buttonStyle}
        >
          <span className="remix" style={{ fontSize: 14 }}>\uE915</span>
          导出.drawio
        </button>
        <div style={{ flex: 1 }} />
        {onClose && (
          <button onClick={onClose} style={{ ...buttonStyle, background: 'var(--accent-primary)', color: 'rgba(6, 36, 23, 1)' }}>
            完成
          </button>
        )}
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-code)',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.12s',
}
