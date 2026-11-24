import React from 'react'
import { silentError } from '../utils/silentError'

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

const IS_DEV = process.env.NODE_ENV === 'development'

/** 顶层渲染边界。
 *
 * 没有它时，渲染链路里任何一处未捕获异常都会把整个应用打成白屏——这个 app 的风险面
 * 不小：markdown 走 dangerouslySetInnerHTML，mermaid / echarts / katex 都在渲染期
 * 动态执行。生产环境用户只会看到一片空白，没有任何线索。
 *
 * fallback 只给一个「能恢复」的动作（重新加载页面）。文档持久化在 localStorage，
 * 刷新不会丢，所以这里不做任何「清空 / 重置」类的操作。
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    silentError('渲染崩溃', error)
    // 调用栈在组件树里定位错误位置，silentError 只带 message，这里补一份
    if (info?.componentStack) console.error(info.componentStack)
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-main)',
          padding: 24,
        }}
      >
        <div
          style={{
            width: 'min(460px, 100%)',
            padding: '28px 32px',
            background: 'var(--color-bg-card)',
            border: '0.7px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            color: 'var(--color-text-primary)',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.4 }}>页面出了点问题</div>
          <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-muted)' }}>
            编辑器遇到了一个未处理的错误并停止了渲染。你的文档存在本地存储里，刷新不会丢。
          </div>

          {IS_DEV && this.state.error.message ? (
            <pre
              style={{
                margin: '16px 0 0',
                padding: '10px 12px',
                background: 'var(--color-bg-secondary)',
                border: '0.7px solid var(--color-border-soft)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--color-text-primary)',
                maxHeight: 140,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
            </pre>
          ) : null}

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '9px 18px',
              background: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1,
              cursor: 'pointer',
              transition: 'opacity var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            重新加载页面
          </button>
        </div>
      </div>
    )
  }
}
