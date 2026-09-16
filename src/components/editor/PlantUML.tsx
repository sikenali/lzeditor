import React, { useEffect, useRef } from 'react'
import plantumlEncoder from 'plantuml-encoder'

interface PlantUMLProps {
  code: string
  width?: number
  height?: number
}

export const PlantUML: React.FC<PlantUMLProps> = ({ code, width = 600, height = 400 }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const encoded = plantumlEncoder.encode(code)
    const svgUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`
    
    if (containerRef.current) {
      containerRef.current.innerHTML = `<iframe src="${svgUrl}" width="${width}" height="${height}" style="border:none;" sandbox="allow-same-origin"></iframe>`
    }
  }, [code, width, height])

  return (
    <div className="plantuml-container" style={{ margin: '16px 0', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'rgba(15, 22, 32, 1)' }}>
      <div ref={containerRef} style={{ width, height }} />
    </div>
  )
}
