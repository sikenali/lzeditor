import React from 'react'
import { APP_VERSION } from '../../shared/version'
import { getRecentDocs, openRecentDoc, formatRelativeTime } from '../../utils/recentDocs'
import { newBlankDoc, pickFile, importSingleFile, pickFolderFiles, importFolderFiles } from '../../utils/docImport'

const RECENT_LIMIT = 6

const IS_MAC = /Mac|iPhone|iPad/i.test(navigator.userAgent)
const MOD = IS_MAC ? '⌘' : 'Ctrl+'
const KEY_NEW = `${MOD}N`
const KEY_OPEN = `${MOD}O`
const KEY_FOLDER = IS_MAC ? '⇧⌘O' : 'Ctrl+Shift+O'
const KEY_SETTINGS = `${MOD},`
const VERSION = APP_VERSION

/**
 * 首次启动欢迎页：替代默认展开的 welcome/README 文档。
 * 任何动作都会新建/切换文档，store 里负责把 showWelcome 关掉，所以这里不需要刷新状态。
 */
export const WelcomeScreen: React.FC = () => {
  const recent = getRecentDocs(RECENT_LIMIT)

  const handleOpenFile = async () => {
    const file = await pickFile()
    if (file) await importSingleFile(file)
  }

  const handleOpenFolder = async () => {
    const files = await pickFolderFiles()
    if (files) await importFolderFiles(files)
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

        <div className="welcome-actions">
          <button type="button" className="welcome-btn welcome-btn--primary" onClick={() => newBlankDoc()}>
            <span className="remix ri-file-add-line"></span>
            <span className="welcome-btn-label">新建文档</span>
            <span className="welcome-kbd">{KEY_NEW}</span>
          </button>
          <button type="button" className="welcome-btn welcome-btn--ghost" onClick={() => void handleOpenFile()}>
            <span className="remix ri-folder-open-line"></span>
            <span className="welcome-btn-label">打开文件…</span>
            <span className="welcome-kbd">{KEY_OPEN}</span>
          </button>
          <button type="button" className="welcome-btn welcome-btn--ghost" onClick={() => void handleOpenFolder()}>
            <span className="remix ri-folder-line"></span>
            <span className="welcome-btn-label">打开文件夹…</span>
            <span className="welcome-kbd">{KEY_FOLDER}</span>
          </button>
        </div>

        <div className="welcome-recent">
          <div className="welcome-recent-head">
            <span className="welcome-recent-title">
              <span className="remix ri-history-line"></span>
              最近文档
            </span>
            <span className="welcome-recent-count">{recent.length} 项</span>
          </div>
          {recent.length === 0 ? (
            <div className="welcome-recent-empty">暂无最近文档，新建或打开一个 Markdown 文件即可在这里看到。</div>
          ) : (
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
          )}
        </div>

        <div className="welcome-hint">
          <span className="welcome-hint-kbd">{KEY_NEW}</span>
          <span className="welcome-hint-label">新建</span>
          <span className="welcome-hint-dot">•</span>
          <span className="welcome-hint-kbd">{KEY_OPEN}</span>
          <span className="welcome-hint-label">打开</span>
          <span className="welcome-hint-dot">•</span>
          <span className="welcome-hint-kbd">{KEY_SETTINGS}</span>
          <span className="welcome-hint-label">设置</span>
        </div>
      </div>

      <div className="welcome-footer">LZEditor {VERSION} · 文档仅保存在本机浏览器，不会上传到任何服务器</div>
    </div>
  )
}
