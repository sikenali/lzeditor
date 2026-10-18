import React from 'react'
import { useEditorStore } from '../../store/editorStore'

interface DocNode {
  id: string
  title: string
  path: string
  libraryId?: string
  children?: DocNode[]
  gitPath?: string
  isFromGit?: boolean
  isDoc?: boolean
  system?: boolean
}

function buildTree(docs: any[]): DocNode[] {
  const root: Record<string, DocNode> = {}
  const result: DocNode[] = []
  for (const doc of docs) {
    const parts = (doc.path || '').split('/').filter(Boolean)
    let currentArr = result
    let currentKey = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const key = i === 0 ? part : `${currentKey}/${part}`
      let node = root[key]
      if (!node) {
        node = { id: `folder-${key.replace(/\//g, '-')}`, title: part, path: parts.slice(0, i + 1).join('/'), children: [] }
        root[key] = node
        currentArr.push(node)
      }
      currentKey = key
      currentArr = node.children!
    }
    const docNode: DocNode = {
      id: doc.id, title: doc.title, path: doc.path,
      libraryId: doc.libraryId, gitPath: doc.gitPath, isFromGit: doc.isFromGit,
      isDoc: true, system: doc.system,
    }
    currentArr.push(docNode)
  }
  return result
}

export const LibraryTree: React.FC<{
  nodes: DocNode[]
  expandedFolders: Record<string, boolean>
  onToggleFolder: (id: string) => void
  onSelectDoc?: (id: string) => void
  onResetDoc?: (id: string) => void
  searchActive?: boolean
}> = ({ nodes, expandedFolders, onToggleFolder, onSelectDoc, onResetDoc, searchActive }) => {
  const activeDocId = useEditorStore((s) => s.activeDocId)

  const renderNode = (node: DocNode, depth: number): React.ReactNode => {
    // 不能只靠 id 前缀判断：内置手册的 id 是 a01-特色功能 这类，不是 doc- 开头，
    // 会被误判成文件夹而点开就没了。
    const isFolder = !(node.isDoc || node.id.startsWith('doc-'))
    const hasChildren = isFolder && node.children && node.children.length > 0
    const isExpanded = expandedFolders[node.id]
    // 之前写成 node.id === docs.find(d => d.id === node.id)?.id，右边永远等于 node.id，
    // 于是每个文档都亮成"当前打开"，用户在树里根本看不出自己看的是哪篇。
    const isActive = !isFolder && node.id === activeDocId

    if (isFolder) {
      return (
        <div key={node.id}>
          <button
            className={`library-tree-item ${isExpanded ? 'expanded' : ''}`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
            onClick={() => onToggleFolder(node.id)}
          >
            <span className={`remix ${isExpanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} tree-arrow`}></span>
            <span className={`remix ${isExpanded ? 'ri-folder-open-fill' : 'ri-folder-fill'} tree-icon`}></span>
            <span className="tree-label">{node.title}</span>
          </button>
          {isExpanded && hasChildren && (
            <div className="tree-children">{node.children!.map(c => renderNode(c, depth + 1))}</div>
          )}
        </div>
      )
    }
    return (
      <div
        key={node.id}
        className={`library-tree-item doc-item${isActive ? ' active' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 28}px` }}
        onClick={() => onSelectDoc?.(node.id)}
      >
        <span className="tree-dot"></span>
        <span className={`remix ${node.isFromGit ? 'ri-git-repository-line' : 'ri-file-text-line'} tree-icon`}></span>
        <span className="tree-label">{node.title}</span>
        {node.isFromGit && <span className="tree-git-badge">git</span>}
        {/* node.system 覆盖使用手册 20 篇；readme 不在 system 里（它要留在 Default 库、
            也要出现在打开的文档标签上），但它同样是内置文档，改了也该能还原。 */}
        {(node.system || node.id === 'readme') && onResetDoc && (
          <button
            type="button"
            className="tree-reset-btn"
            title="还原为出厂内容"
            onClick={(e) => { e.stopPropagation(); onResetDoc(node.id) }}
          >
            <span className="remix ri-replay-line"></span>
          </button>
        )}
      </div>
    )
  }

  if (searchActive && nodes.length === 0) {
    return (
      <div className="library-empty-state compact">
        <span className="remix ri-file-text-line library-empty-icon"></span>
        <div className="library-empty-title">暂无搜索结果</div>
      </div>
    )
  }

  if (!searchActive && nodes.length === 0) {
    return (
      <div className="library-empty-state compact">
        <span className="remix ri-file-text-line library-empty-icon"></span>
        <div className="library-empty-title">暂无文档</div>
      </div>
    )
  }

  return <>{nodes.map(n => renderNode(n, 0))}</>
}

export { buildTree }
export type { DocNode }
