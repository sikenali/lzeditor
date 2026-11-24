/// <reference types="vite/client" />

declare module 'echarts' {
  export * from 'echarts'
  const echarts: any
  export default echarts
}

declare module 'echarts-for-react' {
  import * as React from 'react'
  interface EChartsReactProps {
    option?: any
    style?: React.CSSProperties
    className?: string
    [key: string]: any
  }
  class EChartsReact extends React.Component<EChartsReactProps> {}
  export default EChartsReact
}

declare module 'markdown-it-footnote' {
  import type { Plugin } from 'markdown-it'
  const footnote: Plugin
  export default footnote
}

declare module 'jszip' {
  class JSZip {
    constructor()
    file(name: string, data: string, options?: any): JSZip
    folder(name: string): JSZip
    generateAsync(options?: any): Promise<Blob>
  }
  export = JSZip
}

