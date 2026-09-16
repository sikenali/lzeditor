import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface EChartsComponentProps {
  option: any
  height?: number | string
  width?: number | string
}

export const EChartsComponent: React.FC<EChartsComponentProps> = ({ option, height = 400, width = '100%' }) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark')
    }

    if (chartInstance.current) {
      chartInstance.current.setOption(option, true)
    }

    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [option])

  return (
    <div
      ref={chartRef}
      style={{ width, height, borderRadius: 8, overflow: 'hidden' }}
    />
  )
}
