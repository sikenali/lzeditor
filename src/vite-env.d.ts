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
