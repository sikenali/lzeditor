import React, { useState } from 'react'
import { getRecentDocs, openRecentDoc, formatRelativeTime, clearRecentDocs } from '../../utils/recentDocs'

const RECENT_LIMIT = 5

const IS_MAC = /Mac|iPhone|iPad/i.test(navigator.userAgent)
const MOD = IS_MAC ? '⌘' : 'Ctrl+'
const KEY_NEW = `${MOD}N`
const KEY_SETTINGS = `${MOD},`

/**
 * 首次启动欢迎页：替代默认展开的 welcome/README 文档。
 * 任何动作都会新建/切换文档，store 里负责把 showWelcome 关掉，所以这里不需要刷新状态。
 */
export const WelcomeScreen: React.FC = () => {
  const [recent, setRecent] = useState(() => getRecentDocs(RECENT_LIMIT))

  const handleClearRecent = () => {
    clearRecentDocs()
    setRecent([])
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-column">
        <img className="welcome-icon-logo" src="/logo.svg" alt="LZEditor" />

        <h1 className="welcome-title">欢迎使用 LZEditor</h1>

        <p className="welcome-subtitle">
          新建一个 Markdown 文档，或打开已有的文件继续写作<br />
          内容自动保存在本机浏览器，无需注册登录
        </p>

        {recent.length > 0 && (
          <div className="welcome-recent">
            <div className="welcome-recent-head">
              <span className="welcome-recent-title">
                <span className="remix ri-history-line"></span>
                最近文档
              </span>
              <button
                type="button"
                className="welcome-recent-clear"
                onClick={handleClearRecent}
                title="清除最近文档"
                aria-label="清除最近文档"
              >
                <span className="remix ri-delete-bin-line"></span>
              </button>
            </div>
            <div className="welcome-recent-list">
              {recent.map(doc => (
                <button
                  key={doc.id}
                  type="button"
                  className="welcome-recent-item"
                  title={doc.path || doc.title}
                  onClick={() => openRecentDoc(doc)}
                >
                  <span className="remix ri-file-text-line"></span>
                  <span className="welcome-recent-name">{doc.title}</span>
                  <span className="welcome-recent-time">{formatRelativeTime(doc.savedAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="welcome-hint">
          <span className="welcome-hint-kbd">{KEY_NEW}</span>
          <span className="welcome-hint-label">新建</span>
          <span className="welcome-hint-dot">•</span>
          <span className="welcome-hint-kbd">{KEY_SETTINGS}</span>
          <span className="welcome-hint-label">设置</span>
        </div>
      </div>
    </div>
  )
}
