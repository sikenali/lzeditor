/// <reference types="vite/client" />

declare module 'react-katex' {
  import * as React from 'react'
  interface KatexProps {
    expression: string
    displayMode?: boolean
    throwOnError?: boolean
    [key: string]: any
  }
  class Katex extends React.Component<KatexProps> {}
  export = Katex
}

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

declare module 'plantuml-encoder' {
  function encode(text: string): string
  function decode(encoded: string): string
  export = { encode, decode }
}

declare module 'viz.js' {
  export class Viz {
    constructor(options?: any)
    renderString(source: string, options?: any): Promise<string>
  }
}

declare module 'file-saver' {
  function saveAs(blob: Blob, filename?: string): void
  export = { saveAs }
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

