import React, { useState, useMemo, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { openMarkdownDoc, importFolderFiles } from '../../utils/docImport'
import { fetchMarkdownFromUrl } from '../../utils/importUrl'
import { UiModal, UDSection } from '../ui'
import { LibraryTree, buildTree } from './LibraryTree'
import { ImportButtons, CATEGORIES } from './ImportButtons'

export const LibraryPanel: React.FC<{ onClose?: () => void; sidebar?: boolean; className?: string }> = ({ onClose, sidebar, className }) => {
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setShowLibrary = useEditorStore((s: any) => s.setShowLibrary)
  const docs = useEditorStore((s) => s.docs)
  const docLibraries = useEditorStore((s: any) => s.docLibraries)
  const createLibrary = useEditorStore((s: any) => s.createLibrary)
  const renameLibrary = useEditorStore((s: any) => s.renameLibrary)
  const [renameTarget, setRenameTarget] = useState<{ key: string; title: string } | null>(null)
  // 弹框默认「文档库」标签（优化 #4）：侧栏「添加文档库」按钮 setCategory 作用于侧栏实例，
  // 弹框是独立实例，其初始 category 由这里决定，故默认 docs。
  const [category, setCategory] = useState('docs')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    // 默认全部展开（优化 #4）：文档库弹框按文件管理器方式显示文件夹→md 文件，不折叠。
    const init: Record<string, boolean> = {}
    const collect = (nodes: any[]): void => {
      for (const n of nodes) {
        if (n.children) { init[n.id] = true; collect(n.children) }
      }
    }
    collect(buildTree(useEditorStore.getState().docs))
    return init
  })
  const [searchText, setSearchText] = useState('')

  const handleClose = () => {
    if (sidebar) setShowLibrary(false)
    else if (onClose) onClose()
    else setOpenPanel('none')
  }

  const handleNewLibrary = () => {
    createLibrary('')
    setCategory('docs')
    setShowLibrary(true)
  }

  const handleOpenLibraryDialog = () => {
    // 弹框默认显示「文档库」标签（优化 #4），右侧按文件管理器显示文件夹→md 文件。
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
    // 注意：不要再过滤 d.system。内置文档都标了 system，
    // 之前在这里被整包藏掉，用户除了「关于」页的第一篇外一篇都打不开。
    const visible = docs
    if (searchText) {
      return visible.filter((d: any) =>
        d.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (d.path || '').toLowerCase().includes(searchText.toLowerCase())
      )
    }
    return visible
  }, [docs, searchText])

  const tree = useMemo(() => buildTree(flatDocs), [flatDocs])

  // 导入后新文件夹默认展开：初始化快照只在挂载时跑一次，新出现的文件夹
  // 不在快照里会被当成折叠，看起来像导入没反应。
  useEffect(() => {
    setExpandedFolders(prev => {
      const next = { ...prev }
      let changed = false
      const collect = (nodes: any[]): void => {
        for (const n of nodes) {
          if (n.children) {
            if (!(n.id in next)) { next[n.id] = true; changed = true }
            collect(n.children)
          }
        }
      }
      collect(tree)
      return changed ? next : prev
    })
  }, [tree])

  // 本地导入：复用 docImport 的扩展名/大小/数量校验与磁盘路径授权。
  const handleImportLocal = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.mdown,.mkd,.txt'
    input.multiple = true
    input.onchange = (e: any) => {
      const files: File[] = Array.from(e.target.files || [])
      if (!files.length) return
      void importFolderFiles(files)
    }
    input.click()
  }

  // 在线导入：拉取 .md 直链并新建文档（错误由 ImportButtons catch 提示）。
  const handleImportUrl = async (url: string) => {
    const { title, md } = await fetchMarkdownFromUrl(url)
    openMarkdownDoc(title, md)
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
                renameTargetKey={renameTarget?.key ?? null}
                renameableTitles={docLibraries.map((l: any) => l.name)}
                onRenameFolder={(node) => setRenameTarget({ key: node.id, title: node.title })}
                onRenameCommit={(_key, newName) => {
                  // 树文件夹名 ↔ 库名 按 title 匹配（renameLibrary 会同步改写 docs path）
                  const lib = docLibraries.find((l: any) => l.name === renameTarget?.title)
                  if (lib) renameLibrary(lib.id, newName)
                  setRenameTarget(null)
                }}
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

  const leftNav = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {CATEGORIES.map(cat => (
        <button key={cat.id} className={`ud-chip${category === cat.id ? ' active' : ''}`} onClick={() => setCategory(cat.id)}>
          <span className={`remix ud-chip-icon ${cat.icon}`}></span>
          <div>
            <div className="ud-chip-label">{cat.label}</div>
            <div className="ud-chip-desc">{cat.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )

  const rightContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {category === 'docs' && (
        <UDSection label="文档库">
          {tree.length === 0 ? (
            <div className="library-empty-state">
              <span className="remix ri-folder-open-line library-empty-icon"></span>
              <div className="library-empty-title">暂无文档</div>
              <div className="library-empty-desc">点击"本地导入"添加 Markdown 文档</div>
            </div>
          ) : (
            // 文件管理器方式：先显示文件夹列表，再显示文件夹下包含的 md 文件，默认全部展开（优化 #4）
            <div className="library-tree">
              <LibraryTree
                nodes={tree}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onSelectDoc={(id) => { useEditorStore.getState().switchDoc(id); handleClose() }}
                renameTargetKey={renameTarget?.key ?? null}
                renameableTitles={docLibraries.map((l: any) => l.name)}
                onRenameFolder={(node) => setRenameTarget({ key: node.id, title: node.title })}
                onRenameCommit={(_key, newName) => {
                  const lib = docLibraries.find((l: any) => l.name === renameTarget?.title)
                  if (lib) renameLibrary(lib.id, newName)
                  setRenameTarget(null)
                }}
                searchActive={!!searchText}
              />
            </div>
          )}
        </UDSection>
      )}
      <ImportButtons
        category={category}
        onImportUrl={handleImportUrl}
        onImportLocal={handleImportLocal}
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
    <UiModal
      open
      onClose={handleClose}
      icon="ri-archive-2-line"
      title="文档库"
      subtitle={CATEGORIES.find(c => c.id === category)?.label || '文档库'}
      footer={footer}
      width={900}
      height={600}
    >
      <div className="ud-body ud-body-split">
        <div className="ud-left">{leftNav}</div>
        <div className="ud-right">
          <div className="ud-right-content">{rightContent}</div>
        </div>
      </div>
    </UiModal>
  )
}
