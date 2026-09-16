// @ts-ignore
import React, { useEffect, useRef } from 'react'

interface GraphvizProps {
  code: string
  width?: number
  height?: number
}

export const Graphviz: React.FC<GraphvizProps> = ({ code, width = 600, height = 400 }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Use Viz.js CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/viz.js@2.1.2/prebuilt/viz.full.js'
    script.onload = () => {
      renderGraph()
    }
    document.head.appendChild(script)

    const renderGraph = async () => {
      try {
        if (typeof (window as any).Viz !== 'undefined') {
          const viz = new (window as any).Viz()
          const svg = await viz.renderString(code, {
            formats: ['svg'],
          })
          if (containerRef.current) {
            containerRef.current.innerHTML = svg
            const svgElement = containerRef.current.querySelector('svg')
            if (svgElement) {
              svgElement.style.width = '100%'
              svgElement.style.height = 'auto'
            }
          }
        }
      } catch (error) {
        console.error('Graphviz rendering error:', error)
        if (containerRef.current) {
          containerRef.current.innerHTML = '<pre style="color:var(--text-muted)">' + code + '</pre>'
        }
      }
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [code])

  return (
    <div className="graphviz-container" style={{ margin: '16px 0', padding: '16px', background: 'rgba(15, 22, 32, 1)', borderRadius: 8, border: '1px solid var(--border-default)', overflow: 'auto' }}>
      <div ref={containerRef} style={{ minWidth: width, minHeight: height }} />
    </div>
  )
}
