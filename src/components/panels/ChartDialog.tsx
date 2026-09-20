import React, { useState, useEffect, useRef } from 'react'

interface ChartDialogProps {
  onClose: () => void
  onInsert: (html: string, type: string) => void
}

type ChartType = 'mermaid' | 'plantuml' | 'graphviz' | 'echarts' | 'vega' | 'drawio' | 'canvas' | 'infographic'

const CHART_TYPES: { id: ChartType; label: string; icon: string; desc: string; defaultCode: string }[] = [
  {
    id: 'mermaid',
    label: 'Mermaid',
    icon: 'ri-flow-chart',
    desc: '流程图、时序图、甘特图',
    defaultCode: 'graph TD\n    A[开始] --> B{判断}\n    B -->|是| C[处理]\n    B -->|否| D[结束]',
  },
  {
    id: 'plantuml',
    label: 'PlantUML',
    icon: 'ri-organization-chart',
    desc: 'UML 类图、时序图、状态图',
    defaultCode: '@startuml\nrectangle "用户" as user\nrectangle "系统" as sys\nuser -> sys : 登录\nsys --> user : 欢迎\n@enduml',
  },
  {
    id: 'graphviz',
    label: 'Graphviz',
    icon: 'ri-git-merge-line',
    desc: '有向/无向图，DOT 语言',
    defaultCode: 'digraph G {\n  rankdir=TB;\n  A -> B -> C;\n  A -> C;\n  B [label="B节点"];\n  C [label="C节点" shape=box];\n}',
  },
  {
    id: 'echarts',
    label: 'ECharts',
    icon: 'ri-bar-chart-2-line',
    desc: '交互式图表，JSON 配置',
    defaultCode: `{\n  "title": {"text": "销售趋势"},\n  "xAxis": {"type": "category", "data": ["周一","周二","周三","周四","周五"]},\n  "yAxis": {"type": "value"},\n  "series": [{\n    "data": [120, 200, 150, 80, 70],\n    "type": "line"\n  }]\n}`,
  },
  {
    id: 'vega',
    label: 'Vega',
    icon: 'ri-pie-chart-2-line',
    desc: '声明式可视化语法',
    defaultCode: `{\n  "$schema": "https://vega.github.io/schema/vega/v5.json",\n  "width": 400,\n  "height": 200,\n  "data": [{\n    "name": "table",\n    "values": [\n      {"a": "A","b": 28},{"a": "B","b": 55}\n    ]\n  }],\n  "scales": [{\n    "name": "x",\n    "type": "band",\n    "domain": {"data": "table","field": "a"},\n    "range": "width"\n  }],\n  "axes": [{"orient": "bottom","scale": "x"}],\n  "marks": [{\n    "type": "rect",\n    "from": {"data": "table"},\n    "encode": {\n      "enter": {\n        "x": {"scale": "x","field": "a"},\n        "width": {"scale": "x","band": 0.5},\n        "y": {"scale": "y","field": "b"},\n        "y2": {"scale": "y","value": 0},\n        "fill": {"value": "#4facfe"}\n      }\n    }\n  }]\n}`,
  },
  {
    id: 'drawio',
    label: 'draw.io',
    icon: 'ri-layout-2-line',
    desc: '流程图编辑器（可视化）',
    defaultCode: '<mxGraphModel dx="1422" dy="755" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="开始" style="ellipse;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="160" y="40" width="120" height="60" as="geometry"/></mxCell><mxCell id="3" value="处理" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="140" y="160" width="160" height="60" as="geometry"/></mxCell><mxCell id="4" value="结束" style="ellipse;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="160" y="280" width="120" height="60" as="geometry"/></mxCell><mxCell id="5" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" source="2" target="3" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="6" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" source="3" target="4" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>',
  },
  {
    id: 'canvas',
    label: 'Canvas',
    icon: 'ri-paint-brush-line',
    desc: 'HTML5 Canvas 绘图脚本',
    defaultCode: `// 绘制简单图表\ncanvas.width = 400;\ncanvas.height = 200;\nconst ctx = canvas.getContext('2d');\nctx.fillStyle = '#4facfe';\nctx.fillRect(50, 20, 60, 120);\nctx.fillRect(150, 60, 60, 80);\nctx.fillRect(250, 30, 60, 110);\nctx.fillStyle = '#333';\nctx.font = '14px sans-serif';\nctx.fillText('柱状图示例', 130, 190);`,
  },
  {
    id: 'infographic',
    label: 'Infographic',
    icon: 'ri-layout-grid-line',
    desc: '信息图，HTML + CSS 排版',
    defaultCode: `<div class="info-card">\n  <div class="info-header">\n    <h2>📊 项目进度报告</h2>\n    <span class="info-date">2026-01-15</span>\n  </div>\n  <div class="info-stats">\n    <div class="stat"><span class="stat-num">85%</span><span class="stat-label">完成率</span></div>\n    <div class="stat"><span class="stat-num">12</span><span class="stat-label">里程碑</span></div>\n    <div class="stat"><span class="stat-num">3</span><span class="stat-label">风险项</span></div>\n  </div>\n  <div class="info-body">\n    <p>当前项目整体进展顺利，核心功能已完成并进入测试阶段。预计下周完成最终验收。</p>\n  </div>\n</div>`,
  },
]

const DEFAULT_PREV_H = 260

export const ChartDialog: React.FC<ChartDialogProps> = ({ onClose, onInsert }) => {
  const [type, setType] = useState<ChartType>('mermaid')
  const [code, setCode] = useState(CODE_DEFAULTS['mermaid'])
  const [previewHtml, setPreviewHtml] = useState('')
  const [prevErr, setPrevErr] = useState(false)
  const [prevH, setPrevH] = useState(DEFAULT_PREV_H)
  const previewRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLTextAreaElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const t = CODE_DEFAULTS[type]
    if (t !== undefined) {
      setCode(t)
      setPreviewHtml('')
      setPrevErr(false)
    }
  }, [type])

  useEffect(() => {
    if (!mountedRef.current) return
    setPrevErr(false)
    setPreviewHtml('<span style="color:var(--text-muted);font-size:12px">渲染中…</span>')

    if (type === 'drawio') {
      renderDrawio(code).then((html) => {
        if (mountedRef.current) { setPreviewHtml(html); autoH(html) }
      }).catch((e: any) => {
        if (mountedRef.current) { setPrevErr(true); setPreviewHtml(`<pre style="color:#f66;padding:12px;font-size:12px">${escHtml(e?.message || String(e))}</pre>`) }
      })
      return
    }

    if (type === 'canvas') {
      renderCanvas(code).then((html) => {
        if (mountedRef.current) setPreviewHtml(html)
      }).catch(() => { if (!mountedRef.current) setPrevErr(true) })
      return
    }

    if (type === 'infographic') {
      if (mountedRef.current) setPreviewHtml(`<style>${INFographic_CSS}</style>${escHtml(code)}`)
      return
    }

    if (type === 'mermaid') {
      renderMermaid(code).then((html) => {
        if (mountedRef.current) { setPreviewHtml(html); autoH(html) }
      }).catch((e: any) => {
        if (mountedRef.current) { setPrevErr(true); setPreviewHtml(`<pre style="color:#f66;padding:12px;font-size:12px">${escHtml(e?.message || String(e))}</pre>`) }
      })
      return
    }

    if (type === 'plantuml') {
      renderPlantUml(code).then((html) => {
        if (mountedRef.current) { setPreviewHtml(html); autoH(html) }
      }).catch((e: any) => {
        if (mountedRef.current) { setPrevErr(true); setPreviewHtml(`<pre style="color:#f66;padding:12px;font-size:12px">${escHtml(e?.message || String(e))}</pre>`) }
      })
      return
    }

    if (type === 'graphviz') {
      loadViz().then(() => {
        if (!mountedRef.current) return
        try {
          const viz = new (window as any).Viz()
          viz.renderString(code, { formats: ['svg'] }).then((svg: string) => {
            if (!mountedRef.current) return
            setPreviewHtml(svg)
            autoH(svg)
          }).catch((e: any) => {
            if (mountedRef.current) { setPrevErr(true); setPreviewHtml(`<pre style="color:#f66;padding:12px;font-size:12px">${escHtml(e?.message || String(e))}</pre>`) }
          })
        } catch (e: any) {
          if (mountedRef.current) { setPrevErr(true); setPreviewHtml(`<pre style="color:#f66;padding:12px;font-size:12px">Viz.js 加载失败: ${escHtml(e?.message || String(e))}</pre>`) }
        }
      }).catch(() => {
        if (mountedRef.current) { setPrevErr(true); setPreviewHtml(`<pre style="color:#f66;padding:12px;font-size:12px">Viz.js CDN 加载失败，请检查网络</pre>`) }
      })
      return
    }

    if (type === 'echarts') {
      renderEcharts(code).then((html) => {
        if (mountedRef.current) setPreviewHtml(html)
      }).catch(() => { if (!mountedRef.current) setPrevErr(true) })
      return
    }

    if (type === 'vega') {
      renderVega(code).then((html) => {
        if (mountedRef.current) setPreviewHtml(html)
      }).catch(() => { if (!mountedRef.current) setPrevErr(true) })
    }
  }, [type, code])

  const autoH = (content: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = content
    tmp.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px;visibility:hidden;'
    document.body.appendChild(tmp)
    setTimeout(() => {
      setPrevH(Math.max(DEFAULT_PREV_H, tmp.scrollHeight + 20))
      document.body.removeChild(tmp)
    }, 100)
  }

  const handleInsert = () => {
    if (!code.trim()) return
    if (type === 'drawio') {
      setPreviewHtml('<div style="padding:12px;color:#f66;font-size:12px">请输入 draw.io XML 代码</div>')
      setPrevErr(true)
      return
    }
    let html = ''
    const uid = 'cz_' + Date.now()

    if (type === 'mermaid') {
      html = `<div class="cz-chart" data-type="mermaid"><div class="cz-chart-code" style="display:none">${escHtml(code)}</div><div class="cz-chart-preview">${previewHtml || '<em>请先输入 Mermaid 代码</em>'}</div></div>`
    } else if (type === 'plantuml') {
      html = `<div class="cz-chart" data-type="plantuml"><div class="cz-chart-code" style="display:none">${escHtml(code)}</div><div class="cz-chart-preview">${previewHtml || '<em>请先输入 PlantUML 代码</em>'}</div></div>`
    } else if (type === 'graphviz') {
      html = `<div class="cz-chart" data-type="graphviz"><div class="cz-chart-code" style="display:none">${escHtml(code)}</div>${previewHtml}</div>`
    } else if (type === 'echarts') {
      html = `<div class="cz-chart" data-type="echarts" id="${uid}"><div class="cz-chart-code" style="display:none">${escHtml(code)}</div><div class="cz-chart-preview" id="${uid}-body"></div><script>(()=>{try{const el=document.getElementById('${uid}-body');const opt=JSON.parse(decodeURIComponent(atob('${btoa(escHtml(code))}')));if(el&&typeof echarts!=='undefined'){const c=echarts.init(el);c.setOption(opt);window.addEventListener('resize',()=>c.resize())}}catch(e){if(el)el.innerHTML='<p style=\"color:#f66\">ECharts 配置错误</p>'}})();</script></div>`
    } else if (type === 'vega') {
      html = `<div class="cz-chart" data-type="vega" id="${uid}"><div class="cz-chart-code" style="display:none">${escHtml(code)}</div><div class="cz-chart-preview" id="${uid}-body"></div><script>(()=>{try{const spec=JSON.parse(decodeURIComponent(atob('${btoa(escHtml(code))}')));vegaEmbed('#${uid}-body',spec).catch(e=>document.getElementById('${uid}-body').innerHTML='<p style=\"color:#f66\">Vega 渲染失败</p>')}catch(e){if(document.getElementById('${uid}-body'))document.getElementById('${uid}-body').innerHTML='<p style=\"color:#f66\">JSON 解析错误</p>'}})();</script></div>`
    } else if (type === 'canvas') {
      html = `<div class="cz-chart" data-type="canvas"><div class="cz-chart-code" style="display:none">${escHtml(code)}</div><div class="cz-chart-preview"><canvas id="${uid}" width="400" height="200" style="border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-code);max-width:100%"></div><script>(()=>{try{const c=document.getElementById('${uid}');const ctx=c.getContext('2d');${code.replace(/canvas\b/g, 'c').replace(/\/\/.*$/gm, '')} }catch(e){const c=document.getElementById('${uid}');if(c){const x=c.getContext('2d');x.fillStyle='var(--text-muted)';x.fillText('Canvas 错误',10,20)}}})();</script></div></div>`
    } else if (type === 'infographic') {
      html = `<style>${INFographic_CSS}</style><div class="cz-chart" data-type="infographic">${code}</div>`
    } else if (type === 'drawio') {
      html = `<div class="cz-chart" data-type="drawio"><div class="cz-chart-code" style="display:none">${escHtml(code)}</div>${previewHtml || '<em>请先输入 draw.io XML 代码</em>'}</div>`
    }

    onInsert(html, type)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog chart-dialog" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon"><span className="remix ri-bar-chart-2-fill"></span></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>插入图表</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{CHART_TYPES.find(t => t.id === type)?.label || ''}</div>
            </div>
          </div>
          <button className="settings-action-btn settings-close-btn" onClick={onClose} title="关闭">
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="chart-body">
          <div className="insert-left-nav chart-type-panel">
            {CHART_TYPES.map(ct => (
              <button key={ct.id} className={`insert-nav-item ${type === ct.id ? 'active' : ''}`}
                onClick={() => setType(ct.id)}
                title={`${ct.label}：${ct.desc}`}>
                <span className={`remix insert-nav-icon ${ct.icon}`}></span>
                <span className="chip-name">{ct.label}</span>
                <span className="chip-desc">{ct.desc}</span>
              </button>
            ))}
          </div>

          <div className="chart-right-panel">
            {/* Code area — 1/3 */}
            <div className="chart-code-wrap">
              <div className="chart-code-label">
                <span className="remix ri-code-line"></span>
                {type === 'mermaid' && ' Mermaid 语法'}
                {type === 'plantuml' && ' PlantUML 语法'}
                {type === 'graphviz' && ' DOT 语言'}
                {type === 'echarts' && ' ECharts JSON'}
                {type === 'vega' && ' Vega JSON'}
                {type === 'canvas' && ' Canvas JS'}
                {type === 'infographic' && ' HTML 结构'}
                {type === 'drawio' && ' Draw.io XML'}
              </div>
              <textarea
                ref={codeRef}
                className="chart-code-textarea"
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                placeholder={`请输入${CHART_TYPES.find(t => t.id === type)?.label} 代码...`}
              />
              <div className="chart-code-hint">
                {type === 'mermaid' && '支持流程图(flowchart)、时序图(sequenceDiagram)、甘特图(gantt)等'}
                {type === 'plantuml' && '支持类图、时序图、状态图、用例图等'}
                {type === 'graphviz' && 'DOT 语言，支持 digraph / graph'}
                {type === 'echarts' && 'ECharts 配置项 JSON，需包含 series 数据'}
                {type === 'vega' && 'Vega/Vega-Lite 声明式可视化语法'}
                {type === 'canvas' && '在 canvas 上下文中绘图，可用 ctx 对象'}
                {type === 'infographic' && 'HTML + CSS 信息图结构'}
                {type === 'drawio' && 'draw.io XML 格式，或留空使用可视化编辑器'}
              </div>
            </div>

            {/* Preview area — 2/3 */}
            <div className="chart-preview-wrap">
              <div className="chart-preview-label"><span className="remix ri-eye-line"></span> 预览</div>
              <div className="chart-preview" ref={previewRef}>
                {prevErr
                  ? <div style={{ padding: 16, color: '#f66', fontSize: 12 }}>{previewHtml}</div>
                  : <div dangerouslySetInnerHTML={{ __html: previewHtml || '<span style="color:var(--text-muted);font-size:13px">输入代码后自动预览</span>' }} />}
              </div>
            </div>

            {/* Action buttons — bottom right */}
            <div className="export-footer">
              <div className="export-hint">
                <span className="remix ri-information-line"></span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>图表将插入到当前光标位置</span>
              </div>
              <div className="export-actions">
                <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
                <button className="settings-save-btn" onClick={handleInsert} disabled={!code.trim() && type !== 'drawio'}>
                  <span className="remix ri-add-line"></span>
                  <span>插入</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Render helpers ── */

async function renderMermaid(code: string): Promise<string> {
  let m: typeof import('mermaid')
  try {
    m = await import('mermaid')
  } catch {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@12/dist/mermaid.min.js'
    await new Promise<void>((resolve, reject) => {
      s.onload = () => resolve()
      s.onerror = reject
      document.head.appendChild(s)
    })
    m = (window as any).mermaid
  }
  m.default.initialize({ startOnLoad: false, theme: 'dark' })
  const svg = await m.default.render('mermaid_' + Date.now(), code)
  return svg.svg
}

async function renderEcharts(code: string): Promise<string> {
  let echarts: any
  try {
    echarts = await import('echarts')
  } catch {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js'
    await new Promise<void>((resolve, reject) => {
      s.onload = () => resolve()
      s.onerror = reject
      document.head.appendChild(s)
    })
    echarts = (window as any).echarts
  }
  const uid = 'cz_e_' + Date.now()
  const opt = JSON.parse(code)
  const div = document.createElement('div')
  div.id = uid
  div.style.cssText = 'width:400px;height:200px;'
  document.body.appendChild(div)
  const chart = echarts.init(div)
  chart.setOption(opt)
  const html = div.outerHTML
  document.body.removeChild(div)
  chart.dispose()
  return `<div id="${uid}" style="width:100%;height:${200}px"></div><script>(()=>{const el=document.getElementById('${uid}');if(el&&typeof echarts!=='undefined'){const c=echarts.init(el);c.setOption(JSON.parse(decodeURIComponent(atob('${btoa(escHtml(code))}')));window.addEventListener('resize',()=>c.resize())}})();</script>`
}

async function renderVega(code: string): Promise<string> {
  let vegalib: any, vegaLite: any
  // vega/vega-lite loaded via CDN; check window globals
  vegalib = (window as any).vega
  vegaLite = (window as any).vegaLite
  if (!vegalib || !vegaLite) {
    await loadScript('https://cdn.jsdelivr.net/npm/vega@5/dist/vega.min.js')
    await loadScript('https://cdn.jsdelivr.net/npm/vega-lite@5/dist/vega-lite.min.js')
    await loadScript('https://cdn.jsdelivr.net/npm/vega-embed@6/dist/vega-embed.min.js')
    vegalib = (window as any).vega
    vegaLite = (window as any).vegaLite
  }
  const uid = 'cz_v_' + Date.now()
  const spec = JSON.parse(code)
  const div = document.createElement('div')
  div.id = uid
  document.body.appendChild(div)
  try {
    const result = await vegalib.default(spec, { renderer: 'svg' })
    const html = result.view.container().outerHTML
    document.body.removeChild(div)
    return html
  } catch {
    document.body.removeChild(div)
    throw new Error('Vega 渲染失败')
  }
}

async function renderCanvas(code: string): Promise<string> {
  const uid = 'cz_c_' + Date.now()
  return `<div id="${uid}" style="width:400px;height:200px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-code)"></div><script>(()=>{try{const c=document.getElementById('${uid}');const ctx=c.getContext('2d');${code}}catch(e){const c=document.getElementById('${uid}');if(c){c.innerHTML='<p style=\"color:#f66;padding:8px;font-size:12px\">'+e.message+'</p>'}}})();</script>`
}

async function loadViz(): Promise<void> {
  if ((window as any).Viz) return
  await loadScript('https://cdn.jsdelivr.net/npm/viz.js@2.1.2/prebuilt/viz.full.js')
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`CDN load failed: ${src}`))
    document.head.appendChild(s)
  })
}

function plantumlEncode(text: string): string {
  try {
    return (window as any).plantumlEncoder?.encode(text) ?? btoa(text)
  } catch {
    return btoa(text)
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const INFographic_CSS = `
.info-card{background:var(--bg-code);border:1px solid var(--border-subtle);border-radius:12px;padding:20px;font-family:inherit}
.info-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.info-header h2{margin:0;font-size:16px;color:var(--text-heading)}
.info-date{font-size:12px;color:var(--text-muted)}
.info-stats{display:flex;gap:16px;margin-bottom:16px}
.stat{flex:1;text-align:center;padding:12px;background:var(--bg-secondary);border-radius:8px}
.stat-num{display:block;font-size:24px;font-weight:700;color:var(--accent-primary)}
.stat-label{font-size:12px;color:var(--text-muted)}
.info-body{font-size:14px;color:var(--text-secondary);line-height:1.6}
`

const CODE_DEFAULTS: Record<ChartType, string> = {
  mermaid: CHART_TYPES[0].defaultCode,
  plantuml: CHART_TYPES[1].defaultCode,
  graphviz: CHART_TYPES[2].defaultCode,
  echarts: CHART_TYPES[3].defaultCode,
  vega: CHART_TYPES[4].defaultCode,
  drawio: CHART_TYPES[5].defaultCode,
  canvas: CHART_TYPES[6].defaultCode,
  infographic: CHART_TYPES[7].defaultCode,
}

/* ── DrawIO + PlantUML local renderers ── */

let _drawio2svgMod: any = null
let _drawUmlMod: any = null

async function loadDrawio2Svg(): Promise<any> {
  if (_drawio2svgMod) return _drawio2svgMod
  try {
    // @ts-ignore
    const mod = await import(/* @vite-ignore */ 'https://esm.sh/@markdown-viewer/drawio2svg@1.5.5?target=es2022')
    _drawio2svgMod = mod.default || mod
    return _drawio2svgMod
  } catch {
    throw new Error('drawio2svg 加载失败，请检查网络')
  }
}

async function loadDrawUml(): Promise<any> {
  if (_drawUmlMod) return _drawUmlMod
  try {
    // @ts-ignore
    const mod = await import(/* @vite-ignore */ 'https://esm.sh/@markdown-viewer/draw-uml@1.4.8?target=es2022')
    _drawUmlMod = mod.default || mod
    return _drawUmlMod
  } catch {
    throw new Error('draw-uml 加载失败，请检查网络')
  }
}

async function renderDrawio(code: string): Promise<string> {
  if (!code.trim()) throw new Error('请输入 draw.io XML 代码')
  const mod = await loadDrawio2Svg()
  const convert = mod.convert
  if (typeof convert !== 'function') throw new Error('drawio2svg 模块导出异常')
  const svg = convert(code)
  return svg
}

async function renderPlantUml(code: string): Promise<string> {
  if (!code.trim()) throw new Error('请输入 PlantUML 代码')
  const umlMod = await loadDrawUml()
  const drawioMod = await loadDrawio2Svg()
  const textToDrawioXml = umlMod.textToDrawioXml
  const convert = drawioMod.convert
  if (typeof textToDrawioXml !== 'function') throw new Error('draw-uml 模块导出异常')
  if (typeof convert !== 'function') throw new Error('drawio2svg 模块导出异常')
  const xml = await textToDrawioXml(code)
  const svg = convert(xml)
  return svg
}
