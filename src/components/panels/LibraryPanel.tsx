import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const CATEGORIES = [
  { id: 'docs', label: '文档库', icon: 'ri-folder-fill', desc: '本地 MD 文件目录' },
  { id: 'folders', label: '外部文件夹', icon: 'ri-git-branch-line', desc: 'Git / Dropbox / WebDAV' },
  { id: 'blog', label: '博客', icon: 'ri-article-fill', desc: '在线博客同步' },
  { id: 'ebook', label: '电子书', icon: 'ri-book-mark-fill', desc: 'EPUB / MOBI 导入' },
]

export const LibraryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const setDocPath = useEditorStore((s: any) => s.setDocPath)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const docs = useEditorStore((s) => s.docs)
  const createDoc = useEditorStore((s) => s.createDoc)
  const [category, setCategory] = useState('docs')

  const handleNewFile = () => {
    const id = createDoc('')
    const editor = useEditorStore.getState().editor
    if (editor) {
      editor.chain().focus().clearContent().run()
    }
    setOpenPanel('none')
    onClose()
  }

  const handleOpen = (docId: string) => {
    const doc = docs.find((d: any) => d.id === docId)
    if (doc) {
      useEditorStore.getState().switchDoc(docId)
      setOpenPanel('none')
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon">
              <span className="remix ri-archive-2-line"></span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>文档库</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Documents · 浏览与管理您的文档</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        {/* Category tabs */}
        <div className="library-categories">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`library-cat-btn ${category === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              <span className={`remix library-cat-icon ${c.icon}`}></span>
              <span className="library-cat-label">{c.label}</span>
              <span className="library-cat-desc">{c.desc}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="library-content">
          {category === 'docs' && (
            <>
              <div className="library-toolbar">
                <button className="library-new-btn" onClick={handleNewFile}>
                  <span className="remix ri-file-add-line"></span>
                  <span>新建文档</span>
                </button>
              </div>
              <div className="library-list">
                {docs.length === 0 ? (
                  <div className="library-empty-state">
                    <span className="remix ri-folder-open-line library-empty-icon"></span>
                    <div className="library-empty-title">暂无文档</div>
                    <div className="library-empty-desc">点击"新建文档"开始写作</div>
                  </div>
                ) : (
                  docs.map(doc => (
                    <div
                      key={doc.id}
                      className="library-doc-item"
                      onClick={() => handleOpen(doc.id)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span className="remix ri-file-text-fill library-doc-icon"></span>
                      <div className="library-doc-info">
                        <div className="library-doc-name">{doc.title}</div>
                        <div className="library-doc-meta">{doc.path || '未保存'}</div>
                      </div>
                      <span className="remix ri-arrow-right-s-line library-doc-arrow"></span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {category === 'folders' && (
            <div className="library-empty-state">
              <span className="remix ri-git-branch-line library-empty-icon"></span>
              <div className="library-empty-title">连接外部存储</div>
              <div className="library-empty-desc">支持 Git、Dropbox、WebDAV 等云存储服务</div>
              <button className="library-connect-btn">
                <span className="remix ri-links-line"></span>
                <span>连接存储服务</span>
              </button>
            </div>
          )}

          {category === 'blog' && (
            <div className="library-empty-state">
              <span className="remix ri-article-fill library-empty-icon"></span>
              <div className="library-empty-title">同步博客</div>
              <div className="library-empty-desc">从 WordPress、Hexo、Hugo 等博客平台导入文章</div>
              <button className="library-connect-btn">
                <span className="remix ri-global-line"></span>
                <span>同步博客</span>
              </button>
            </div>
          )}

          {category === 'ebook' && (
            <div className="library-empty-state">
              <span className="remix ri-book-mark-fill library-empty-icon"></span>
              <div className="library-empty-title">导入电子书</div>
              <div className="library-empty-desc">支持 EPUB、MOBI 格式，自动解析目录结构</div>
              <button className="library-connect-btn">
                <span className="remix ri-upload-line"></span>
                <span>选择文件导入</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
