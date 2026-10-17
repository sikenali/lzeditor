import React, { useState, useEffect, useRef } from 'react'
import * as echartsLib from 'echarts'
const echarts: any = echartsLib
import { UiModal, UiInput, UiSwitch, UiButton } from '../ui'

const UDSection: React.FC<{ label: string; desc?: string; children: React.ReactNode }> = ({ label, desc, children }) => (
  <div className="ud-section">
    <div className="ud-section-head">
      <span className="ud-section-label">{label}</span>
      {desc && <span className="ud-section-desc">{desc}</span>}
    </div>
    <div className="ud-section-body">{children}</div>
  </div>
)

const UDSettingRow: React.FC<{ icon: string; label: string; desc?: string; children: React.ReactNode }> = ({ icon, label, desc, children }) => (
  <div className="ud-setting-row">
    <div className="ud-setting-label">
      <span className={`remix ud-setting-icon ${icon}`}></span>
      <div>
        <span className="ud-setting-name">{label}</span>
        {desc && <span className="ud-setting-desc">{desc}</span>}
      </div>
    </div>
    <div className="ud-setting-control">{children}</div>
  </div>
)


type ChartType = 'line' | 'bar' | 'pie' | 'scatter'

const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = [
  { id: 'line', label: '折线图', icon: 'ri-bar-chart-2-line' },
  { id: 'bar', label: '柱状图', icon: 'ri-bar-chart-horizontal-fill' },
  { id: 'pie', label: '饼图', icon: 'ri-pie-chart-box-fill' },
  { id: 'scatter', label: '散点图', icon: 'ri-node-tree' },
]

export const ChartDialog: React.FC<{ onClose: () => void; onInsert: (html: string, type: string) => void }> = ({ onClose, onInsert }) => {
  const [chartType, setChartType] = useState<ChartType>('line')
  const [title, setTitle] = useState('图表标题')
  const [dataStr, setDataStr] = useState('10,20,15,30,25')
  const [labelsStr, setLabelsStr] = useState('A,B,C,D,E')
  const [showLegend, setShowLegend] = useState(true)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!chartRef.current) return
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose()
      chartInstanceRef.current = null
    }
    const chart = echarts.init(chartRef.current)
    chartInstanceRef.current = chart
    const data = dataStr.split(',').map(Number)
    const labels = labelsStr.split(',').map(s => s.trim())

    const option: any = {
      title: { text: title, left: 'center', textStyle: { fontSize: 13, color: 'var(--text-secondary)' } },
      legend: showLegend ? { bottom: 0 } : undefined,
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 50, bottom: 40 },
      xAxis: chartType === 'pie' ? undefined : { type: 'category', data: labels },
      yAxis: chartType === 'pie' ? undefined : { type: 'value' },
      series: [{
        type: chartType === 'line' ? 'line' : chartType === 'bar' ? 'bar' : chartType === 'pie' ? 'pie' : 'scatter',
        data: chartType === 'pie' ? labels.map((l, i) => ({ name: l, value: data[i] })) : data,
        smooth: chartType === 'line',
        areaStyle: chartType === 'line' ? { opacity: 0.1 } : undefined,
      }],
    }
    chart.setOption(option, true)
  }, [chartType, title, dataStr, labelsStr, showLegend])

  const handleInsert = () => {
    if (!chartInstanceRef.current) { onClose(); return }
    const svgUrl = chartInstanceRef.current.getConnectors?.()?.[0]?.getAttribute('src') || ''
    const imgSrc = chartInstanceRef.current.getDataURL?.({ type: 'png', pixelRatio: 2 }) || ''
    if (imgSrc) {
      onInsert(`![](${imgSrc})`, chartType)
    } else {
      onInsert(`![${title}](${svgUrl})`, chartType)
    }
    onClose()
  }

  return (
    <UiModal
      open
      onClose={onClose}
      icon="ri-bar-chart-2-line"
      title="插入图表"
      subtitle="生成 ECharts 图表并插入文档"
      width={900}
      footer={
        <>
          <UiButton variant="ghost" onClick={onClose}>取消</UiButton>
          <UiButton onClick={handleInsert}>插入图表</UiButton>
        </>
      }
    >
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto', flex: 1 }}>
        <UDSection label="图表类型">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CHART_TYPES.map(ct => (
                <button key={ct.id} className={`ud-btn${chartType === ct.id ? ' ud-btn--primary' : ''}`}
                  onClick={() => setChartType(ct.id)} style={{ flexDirection: 'column', gap: 4, padding: '10px 8px' }}>
                  <span className={`remix ${ct.icon}`} style={{ fontSize: 18 }}></span>
                  <span style={{ fontSize: 11 }}>{ct.label}</span>
                </button>
              ))}
            </div>
          </UDSection>
          <UDSection label="数据配置">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>图表标题</label>
                <UiInput value={title} onChange={setTitle} placeholder="图表标题" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>数据值</label>
                  <UiInput value={dataStr} onChange={setDataStr} placeholder="10,20,15,30" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>分类标签</label>
                  <UiInput value={labelsStr} onChange={setLabelsStr} placeholder="A,B,C,D" />
                </div>
              </div>
            </div>
          </UDSection>
          <UDSettingRow icon="ri-eye-line" label="显示图例" desc="在图表底部显示数据系列图例">
            <UiSwitch size="sm" checked={showLegend} onChange={setShowLegend} />
          </UDSettingRow>
          <UDSection label="预览">
            <div ref={chartRef} style={{ width: '100%', height: 220, borderRadius: 8 }} />
          </UDSection>
        </div>
    </UiModal>
  )
}
