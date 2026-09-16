import React, { useEffect, useRef } from 'react'
import { Viz } from 'viz.js'
import { textToSVG } from 'viz.js'

interface GraphvizProps {
  code: string
  width?: number
  height?: number
}

export const Graphviz: React.FC<GraphvizProps> = ({ code, width = 600, height = 400 }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderGraph = async () => {
      try {
        const viz = new Viz()
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
      } catch (error) {
        console.error('Graphviz rendering error:', error)
        if (containerRef.current) {
          containerRef.current.innerHTML = '<pre style="color:var(--text-muted)">' + code + '</pre>'
        }
      }
    }
    renderGraph()
  }, [code])

  return (
    <div className="graphviz-container" style={{ margin: '16px 0', padding: '16px', background: 'rgba(15, 22, 32, 1)', borderRadius: 8, border: '1px solid var(--border-default)', overflow: 'auto' }}>
      <div ref={containerRef} style={{ minWidth: width, minHeight: height }} />
    </div>
  )
}
