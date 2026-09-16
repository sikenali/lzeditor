/// <reference types="vite/client" />
\ndeclare module 'react-katex' {
  import * as React from 'react'
  
  interface KatexProps {
    expression: string
    displayMode?: boolean
    throwOnError?: boolean
    errorColor?: string
    color?: string
    maxSize?: number
    maxExpand?: number
    strict?: boolean | string
    trust?: boolean | ((url: string) => boolean)
    globalGroup?: boolean
    output?: 'html' | 'mathml' | 'both'
    [key: string]: any
  }
  
  class Katex extends React.Component<KatexProps> {}
  export = Katex
}
