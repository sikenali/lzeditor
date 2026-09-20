import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const CATEGORIES = [
  { id: 'docs', label: '文档库', icon: 'ri-folder-fill', desc: '本地 MD 文件目录' },
  { id: 'folders', label: '外部文件夹', icon: 'ri-git-branch-line', desc: 'Git / Dropbox / WebDAV' },
  { id: 'blog', label: '博客', icon: 'ri-article-fill', desc: '在线博客同步' },
  { id: 'ebook', label: '电子书', icon: 'ri-book-mark-fill', desc: 'EPUB / MOBI 导入' },
]

export const LibraryPanel: React.FC<{ onClose?: () => void; sidebar?: boolean }> = ({ onClose, sidebar }) => {
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setShowLibrary = useEditorStore((s: any) => s.setShowLibrary)
  const docs = useEditorStore((s) => s.docs)
  const createDoc = useEditorStore((s) => s.createDoc)
  const docLibraries = useEditorStore((s: any) => s.docLibraries)
  const activeLibraryId = useEditorStore((s: any) => s.activeLibraryId)
  const createLibrary = useEditorStore((s: any) => s.createLibrary)
  const setActiveLibrary = useEditorStore((s: any) => s.setActiveLibrary)
  const [category, setCategory] = useState('docs')

  const handleClose = () => {
    if (sidebar) setShowLibrary(false)
    else if (onClose) onClose()
    else setOpenPanel('none')
  }

  const handleNewFile = () => {
    const activeLib = docLibraries.find((lib: any) => lib.id === activeLibraryId)
    const id = createDoc('', activeLib?.name || 'Default', activeLibraryId)
    const editor = useEditorStore.getState().editor
    if (editor) {
      editor.chain().focus().clearContent().run()
    }
    if (!sidebar) handleClose()
  }

  const handleNewLibrary = () => {
    createLibrary('')
    setCategory('docs')
    setShowLibrary(true)
  }

  const handleOpenLibraryDialog = () => {
    setCategory('docs')
    setOpenPanel('library')
  }

  const categoryMeta = CATEGORIES.find(c => c.id === category) || CATEGORIES[0]

  const handlePrimaryAction = () => {
    if (category === 'docs') {
      handleNewLibrary()
    }
  }

  const handleOpen = (docId: string) => {
    const doc = docs.find((d: any) => d.id === docId)
    if (doc) {
      useEditorStore.getState().switchDoc(docId)
      if (!sidebar) handleClose()
    }
  }

  const activeDocs = docs.filter((doc: any) => (doc.libraryId || 'default') === activeLibraryId)

  if (sidebar) {
    return (
      <div className="sidebar-library">
        <div className="sidebar-library-inner">
          <div className="sidebar-library-head">
            <div className="sidebar-library-title">
              <span className="remix ri-folder-3-fill"></span>
              <span>文档库</span>
            </div>
            <button className="sidebar-close-btn" onClick={handleClose} title="隐藏文档库">
              <span className="remix ri-close-line"></span>
            </button>
          </div>

          <div className="library-folder-list">
            {docLibraries.map((lib: any) => (
              <button
                key={lib.id}
                className={`library-folder-item ${activeLibraryId === lib.id ? 'active' : ''}`}
                onClick={() => setActiveLibrary(lib.id)}
              >
                <span className="remix ri-folder-3-fill library-folder-icon"></span>
                <span className="library-folder-name">{lib.name}</span>
                <span className="library-folder-count">{docs.filter((doc: any) => (doc.libraryId || 'default') === lib.id).length}</span>
              </button>
            ))}
          </div>

          <div className="library-docs-section">
            <div className="library-section-title">Markdown</div>
            <button className="library-new-doc-inline" onClick={handleNewFile}>
              <span className="remix ri-file-add-line"></span>
              <span>新建 MD 文件</span>
            </button>
            <div className="library-list">
              {activeDocs.map((doc: any) => (
                <button key={doc.id} className="library-doc-item" onClick={() => handleOpen(doc.id)}>
                  <span className="remix ri-file-text-line library-doc-icon"></span>
                  <span className="library-doc-name">{doc.title}</span>
                </button>
              ))}
              {activeDocs.length === 0 && (
                <div className="library-empty-state compact">
                  <span className="remix ri-file-text-line library-empty-icon"></span>
                  <div className="library-empty-title">暂无文档</div>
                </div>
              )}
            </div>
          </div>

          <div className="library-sidebar-footer">
            <button className="library-add-folder-btn" onClick={handleOpenLibraryDialog}>
              <span className="remix ri-folder-add-line"></span>
              <span>添加文档库</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={sidebar ? 'sidebar-library' : 'modal-overlay'} onClick={sidebar ? undefined : onClose}>
      <div className={sidebar ? 'sidebar-library-inner' : 'export-dialog library-dialog-split'} onClick={e => !sidebar && e.stopPropagation()}>
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-archive-2-line"></span>
            <div>
              <div className="export-title-text">文档库</div>
              <div className="export-title-desc">{categoryMeta.label} · {categoryMeta.desc}</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={handleClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="library-dialog-body">
          <div className="library-dialog-left">
            <div className="format-chips-compact library-format-list">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className={`format-chip-compact ${category === c.id ? 'active' : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  <span className={`remix ${c.icon}`}></span>
                  <span className="chip-name">{c.label}</span>
                  <span className="chip-desc">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="library-dialog-right">
            <div className="library-content">
              {category === 'docs' && (
                <div className="library-list">
                  {docLibraries.length === 0 ? (
                    <div className="library-empty-state">
                      <span className="remix ri-folder-open-line library-empty-icon"></span>
                      <div className="library-empty-title">暂无文档库</div>
                      <div className="library-empty-desc">点击右下角"新建文档库"开始组织文档</div>
                    </div>
                  ) : (
                    docLibraries.map((lib: any) => (
                      <button
                        key={lib.id}
                        className={`library-doc-item ${activeLibraryId === lib.id ? 'active' : ''}`}
                        onClick={() => { setActiveLibrary(lib.id); setShowLibrary(true); handleClose() }}
                      >
                        <span className="remix ri-folder-3-fill library-doc-icon"></span>
                        <div className="library-doc-info">
                          <div className="library-doc-name">{lib.name}</div>
                          <div className="library-doc-meta">{docs.filter((doc: any) => (doc.libraryId || 'default') === lib.id).length} 个文档</div>
                        </div>
                        <span className="remix ri-arrow-right-s-line library-doc-arrow"></span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {category === 'folders' && (
                <div className="library-empty-state">
                  <span className="remix ri-git-branch-line library-empty-icon"></span>
                  <div className="library-empty-title">连接外部存储</div>
                  <div className="library-empty-desc">支持 Git、Dropbox、WebDAV 等云存储服务</div>
                </div>
              )}

              {category === 'blog' && (
                <div className="library-empty-state">
                  <span className="remix ri-article-fill library-empty-icon"></span>
                  <div className="library-empty-title">同步博客</div>
                  <div className="library-empty-desc">从 WordPress、Hexo、Hugo 等博客平台导入文章</div>
                </div>
              )}

              {category === 'ebook' && (
                <div className="library-empty-state">
                  <span className="remix ri-book-mark-fill library-empty-icon"></span>
                  <div className="library-empty-title">导入电子书</div>
                  <div className="library-empty-desc">支持 EPUB、MOBI 格式，自动解析目录结构</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="export-footer">
          <div className="export-hint">
            <span className="remix ri-information-line"></span>
            <span>{category === 'docs' ? '新建后会自动出现在左侧文档库侧边栏' : categoryMeta.desc}</span>
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={handleClose}>关闭</button>
            {category === 'docs' && (
              <button className="settings-save-btn" onClick={handlePrimaryAction}>
                <span className="remix ri-folder-add-line"></span>
                <span>新建文档库</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
