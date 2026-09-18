import React, { useEffect, useRef } from 'react'

interface PlantUMLProps {
  code: string
  width?: number
  height?: number
}

let _drawUmlMod: any = null
let _drawio2SvgMod: any = null

async function loadLibs(): Promise<{ drawUml: any; drawio2svg: any }> {
  if (!_drawUmlMod) {
    // @ts-ignore
    const m = await import(/* @vite-ignore */ 'https://esm.sh/@markdown-viewer/draw-uml@1.4.8?target=es2022')
    _drawUmlMod = m.default || m
  }
  if (!_drawio2SvgMod) {
    // @ts-ignore
    const m = await import(/* @vite-ignore */ 'https://esm.sh/@markdown-viewer/drawio2svg@1.5.5?target=es2022')
    _drawio2SvgMod = m.default || m
  }
  return { drawUml: _drawUmlMod, drawio2svg: _drawio2SvgMod }
}

export const PlantUML: React.FC<PlantUMLProps> = ({ code, width = 600, height = 400 }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    loadLibs().then(({ drawUml, drawio2svg }) => {
      if (cancelled) return
      const textToDrawioXml = drawUml.textToDrawioXml
      const convert = drawio2svg.convert
      if (typeof textToDrawioXml !== 'function' || typeof convert !== 'function') return
      textToDrawioXml(code).then((xml: string) => {
        if (cancelled) return
        const svg = convert(xml)
        if (cancelled) return
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div style="overflow:auto;width:100%;height:100%">${svg}</div>`
        }
      }).catch(() => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = '<div style="padding:12px;color:#f66;font-size:12px">PlantUML 渲染失败</div>'
        }
      })
    }).catch(() => {
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = '<div style="padding:12px;color:#f66;font-size:12px">依赖加载失败，请检查网络</div>'
      }
    })
    return () => { cancelled = true }
  }, [code, width, height])

  return (
    <div className="plantuml-container" style={{ margin: '16px 0', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-code)' }}>
      <div ref={containerRef} style={{ width, height, minHeight: 120 }} />
    </div>
  )
}
