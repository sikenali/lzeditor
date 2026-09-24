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
  searchActive?: boolean
}> = ({ nodes, expandedFolders, onToggleFolder, onSelectDoc, searchActive }) => {
  const docs = useEditorStore((s) => s.docs)

  const renderNode = (node: DocNode, depth: number): React.ReactNode => {
    const isFolder = !node.id.startsWith('doc-')
    const hasChildren = isFolder && node.children && node.children.length > 0
    const isExpanded = expandedFolders[node.id]
    const isActive = !isFolder && node.id === docs.find((d: any) => d.id === node.id)?.id

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
      <button
        key={node.id}
        className={`library-tree-item doc-item${isActive ? ' active' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 28}px` }}
        onClick={() => onSelectDoc?.(node.id)}
      >
        <span className="tree-dot"></span>
        <span className={`remix ${node.isFromGit ? 'ri-git-repository-line' : 'ri-file-text-line'} tree-icon`}></span>
        <span className="tree-label">{node.title}</span>
        {node.isFromGit && <span className="tree-git-badge">git</span>}
      </button>
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
