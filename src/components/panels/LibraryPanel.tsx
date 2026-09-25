import React, { useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { PanelContainer, UDSection } from '../ui/PanelContainer'
import { LibraryTree, buildTree } from './LibraryTree'
import { ImportButtons, CATEGORIES } from './ImportButtons'

export const LibraryPanel: React.FC<{ onClose?: () => void; sidebar?: boolean; className?: string }> = ({ onClose, sidebar, className }) => {
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setShowLibrary = useEditorStore((s: any) => s.setShowLibrary)
  const docs = useEditorStore((s) => s.docs)
  const createDoc = useEditorStore((s) => s.createDoc)
  const docLibraries = useEditorStore((s: any) => s.docLibraries)
  const activeLibraryId = useEditorStore((s: any) => s.activeLibraryId)
  const createLibrary = useEditorStore((s: any) => s.createLibrary)
  const setActiveLibrary = useEditorStore((s: any) => s.setActiveLibrary)
  const renameLibrary = useEditorStore((s: any) => s.renameLibrary)
  const setDocGitMeta = useEditorStore((s: any) => s.setDocGitMeta)
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null)
  const [category, setCategory] = useState('docs')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [searchText, setSearchText] = useState('')

  const handleClose = () => {
    if (sidebar) setShowLibrary(false)
    else if (onClose) onClose()
    else setOpenPanel('none')
  }

  const handleNewFile = () => {
    const activeLib = docLibraries.find((lib: any) => lib.id === activeLibraryId)
    const id = createDoc('', activeLib?.name || 'Default', activeLibraryId)
    const editor = useEditorStore.getState().editor
    if (editor) { editor.chain().focus().clearContent().run() }
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

  const handlePrimaryAction = () => {
    if (category === 'docs') handleNewLibrary()
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }))
  }

  const flatDocs = useMemo(() => {
    const visible = docs.filter((d: any) => !d.system)
    if (searchText) {
      return visible.filter((d: any) =>
        d.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (d.path || '').toLowerCase().includes(searchText.toLowerCase())
      )
    }
    return visible
  }, [docs, searchText])

  const tree = useMemo(() => buildTree(flatDocs), [flatDocs])

  const handleImportGit = () => {
    const repoUrl = prompt('请输入 Git 仓库地址 (如 https://github.com/user/repo):')
    if (!repoUrl) return
    const id = createDoc('imported-from-git.md', 'Git Import', activeLibraryId)
    const editor = useEditorStore.getState().editor
    if (editor) editor.chain().focus().insertContent('<h1>来自 Git 的文档</h1><p>此文档已从远程仓库导入</p>').run()
    setDocGitMeta({ gitPath: repoUrl, isFromGit: true })
    alert('Git 仓库导入功能已触发（需后端支持）')
  }

  const handleImportBlog = () => {
    const blogUrl = prompt('请输入博客地址 (如 https://blog.example.com):')
    if (!blogUrl) return
    alert('博客导入功能已触发（需后端支持）')
  }

  const handleImportGitbook = () => {
    const gitbookUrl = prompt('请输入 GitBook 地址 (如 https://example.gitbook.io):')
    if (!gitbookUrl) return
    alert('GitBook 导入功能已触发（需后端支持）')
  }

  // Sidebar mode
  if (sidebar) {
    return (
      <div className={`sidebar-library${className ? ` ${className}` : ''}`}>
        <div className="sidebar-library-inner">
          <div className="sidebar-library-head">
            <div className="sidebar-library-title">
              <span className="remix ri-folder-fill"></span>
              <span>文档库</span>
            </div>
            <button className="sidebar-close-btn" onClick={handleClose} title="隐藏文档库">
              <span className="remix ri-close-line"></span>
            </button>
          </div>
          <div className="library-folder-list">
            {docLibraries.map((lib: any) => (
              <div key={lib.id} className="library-folder-row">
                <button
                  className={`library-folder-item ${activeLibraryId === lib.id ? 'active' : ''}`}
                  onClick={() => setActiveLibrary(lib.id)}
                >
                  <span className="remix ri-folder-fill library-folder-icon"></span>
                  <span className="library-folder-name">{lib.name}</span>
                  <span className="library-folder-count">{docs.filter((doc: any) => (doc.libraryId || 'default') === lib.id && !doc.system).length}</span>
                </button>
                <button
                  className="library-folder-rename-btn"
                  onClick={(e) => { e.stopPropagation(); setRenameTargetId(renameTargetId === lib.id ? null : lib.id) }}
                  title="重命名"
                >
                  <span className="remix ri-edit-line"></span>
                </button>
                {renameTargetId === lib.id && (
                  <input
                    className="library-folder-rename-input"
                    defaultValue={lib.name}
                    autoFocus
                    onBlur={(e) => {
                      const name = e.target.value.trim()
                      if (name) renameLibrary(lib.id, name)
                      setRenameTargetId(null)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="library-search-wrap">
            <span className="remix ri-search-line library-search-icon"></span>
            <input
              className="library-search-input"
              placeholder="搜索文档…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            {searchText && (
              <button className="library-search-clear" onClick={() => setSearchText('')}>
                <span className="remix ri-close-line"></span>
              </button>
            )}
          </div>
          <div className="library-docs-section">
            <div className="library-section-title">Markdown</div>
            <div className="library-tree">
              <LibraryTree
                nodes={tree}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onSelectDoc={(id) => { useEditorStore.getState().switchDoc(id); handleClose() }}
                searchActive={!!searchText}
              />
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

  // Dialog mode - now using PanelContainer instead of UnifiedDialog
  const rightTop = (
    <UDSection label="">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`ud-btn${category === cat.id ? ' ud-btn--primary' : ''}`}
            onClick={() => setCategory(cat.id)}
            style={{ flexDirection: 'column', gap: 6, padding: '14px 10px', justifyContent: 'center' }}
          >
            <span className={`remix ${cat.icon}`} style={{ fontSize: 18 }}></span>
            <span style={{ fontSize: 12 }}>{cat.label}</span>
          </button>
        ))}
      </div>
    </UDSection>
  )

  const rightContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {category === 'docs' && (
        <UDSection label="文档库">
          {docLibraries.length === 0 ? (
            <div className="library-empty-state">
              <span className="remix ri-folder-open-line library-empty-icon"></span>
              <div className="library-empty-title">暂无文档库</div>
              <div className="library-empty-desc">点击右下角"新建文档库"开始组织文档</div>
            </div>
          ) : (
            <div className="library-list">
              {docLibraries.map((lib: any) => (
                <button key={lib.id} className={`library-doc-item${activeLibraryId === lib.id ? 'active' : ''}`}
                  onClick={() => { setActiveLibrary(lib.id); setShowLibrary(true); handleClose() }}>
                  <span className="remix ri-folder-fill library-doc-icon"></span>
                  <div className="library-doc-info">
                    <div className="library-doc-name">{lib.name}</div>
                    <div className="library-doc-meta">{docs.filter((doc: any) => (doc.libraryId || 'default') === lib.id && !doc.system).length} 个文档</div>
                  </div>
                  <span className="remix ri-arrow-right-s-line library-doc-arrow"></span>
                </button>
              ))}
            </div>
          )}
        </UDSection>
      )}
      <ImportButtons
        category={category}
        onImportGit={handleImportGit}
        onImportBlog={handleImportBlog}
        onImportGitbook={handleImportGitbook}
      />
    </div>
  )

  const footer = (
    <div className="ud-actions">
      <button className="ud-btn ud-btn--ghost" onClick={handleClose}>关闭</button>
      {category === 'docs' && (
        <button className="ud-btn ud-btn--primary" onClick={handlePrimaryAction}>新建文档库</button>
      )}
    </div>
  )

  return (
    <PanelContainer
      onClose={handleClose}
      icon="ri-archive-2-line"
      title="文档库"
      subtitle={CATEGORIES.find(c => c.id === category)?.label || '文档库'}
      footer={footer}
      size="lg"
      className="library-dialog"
    >
      <div className="ud-body ud-body-split">
        <div className="ud-left">
          {rightTop}
        </div>
        <div className="ud-right">
          <div className="ud-right-content">{rightContent}</div>
        </div>
      </div>
    </PanelContainer>
  )
}
