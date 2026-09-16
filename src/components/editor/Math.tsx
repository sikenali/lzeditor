import React from 'react'
import Katex from 'react-katex'
import 'katex/dist/katex.min.css'

interface MathBlockProps {
  expression: string
  displayMode?: boolean
}

export const MathBlock: React.FC<MathBlockProps> = ({ expression, displayMode = true }) => {
  return (
    <div className="math-block" style={{ margin: '16px 0', padding: '16px', background: 'rgba(15, 22, 32, 1)', borderRadius: 8, overflowX: 'auto' }}>
      <Katex
        expression={expression}
        displayMode={displayMode}
        throwOnError={false}
        color="#39FF9E"
      />
    </div>
  )
}

export const MathInline: React.FC<{ expression: string }> = ({ expression }) => {
  return (
    <Katex
      expression={expression}
      displayMode={false}
      throwOnError={false}
      color="#39FF9E"
    />
  )
}
