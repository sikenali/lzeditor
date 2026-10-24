import React, { useCallback, useMemo, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { getCM6Editor } from '../editor/codemirror/registry'
import { parseMdOutline, type MdOutlineItem } from '../../utils/mdOutline'

/** Group flat items into a tree keyed by parent number (1 → 1.1 → 1.1.1). */
function buildTree(items: MdOutlineItem[]): Map<string, MdOutlineItem[]> {
  const tree = new Map<string, MdOutlineItem[]>()
  for (const item of items) {
    const parentNumber = item.number.includes('.')
      ? item.number.slice(0, item.number.lastIndexOf('.'))
      : ''
    const key = parentNumber || '__root__'
    if (!tree.has(key)) tree.set(key, [])
    tree.get(key)!.push(item)
  }
  return tree
}

export const SidebarOutline: React.FC = () => {
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const cursorPosition = useEditorStore((s: any) => s.cursorPosition)
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // 大纲从 markdown 源文本解析：CM6 没有文档树，标题层级只能从 `#` 号推
  const md = docsMd[activeDocId || 'readme'] || mdContent || ''
  const items = useMemo(() => parseMdOutline(md), [md])

  // 当前高亮跟随光标行号，不重扫文档
  const activeId = useMemo(() => {
    const line = cursorPosition?.line
    if (!line) return ''
    let active: MdOutlineItem | undefined
    for (const item of items) {
      if (item.line <= line) active = item
      else break
    }
    return active?.id ?? ''
  }, [cursorPosition, items])

  const handleJump = useCallback((item: MdOutlineItem) => {
    getCM6Editor()?.goto(item.pos, item.pos + item.text.length)
  }, [])

  const toggleCollapse = (number: string) => {
    setCollapsed((prev) => ({ ...prev, [number]: !prev[number] }))
  }

  const tree = buildTree(items)

  const renderGroup = (parentNumber: string, depth: number): React.ReactNode[] => {
    const children = tree.get(parentNumber) || []
    return children.map((item) => {
      const hasChildren = (tree.get(item.number) || []).length > 0
      const isCollapsed = !!collapsed[item.number]
      return (
        <div key={item.id} className="outline-node">
          <div
            className={`sidebar-item ${activeId === item.id ? 'active' : ''}`}
            style={{ paddingLeft: `${depth * 16 + 10}px` }}
          >
            {hasChildren ? (
              <button
                className="outline-toggle-btn"
                onClick={(e) => { e.stopPropagation(); toggleCollapse(item.number) }}
                title={isCollapsed ? '展开' : '折叠'}
              >
                <span className={`remix ${isCollapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'}`}></span>
              </button>
            ) : (
              <span className="outline-toggle-placeholder" />
            )}
            <button
              className="outline-content-btn"
              onClick={() => handleJump(item)}
              title={`${item.number} ${item.text}`}
            >
              <span className="outline-number">{item.number}</span>
              <span className="sidebar-item-text">{item.text}</span>
            </button>
          </div>
          {hasChildren && !isCollapsed && renderGroup(item.number, depth + 1)}
        </div>
      )
    })
  }

  return (
    <div className="sidebar-outline">
      <div className="sidebar-header">
        <span className="remix sidebar-header-icon ri-list-unordered"></span>
        <span className="sidebar-header-title">目录</span>
        <button className="sidebar-close-btn" onClick={() => setShowOutline(false)}>
          <span className="remix ri-close-line"></span>
        </button>
      </div>
      <div className="sidebar-scroll">
        {items.length === 0 ? (
          <div className="sidebar-empty">
            <span className="remix ri-article-line"></span>
            <span>添加标题以生成目录</span>
          </div>
        ) : (
          renderGroup('__root__', 0)
        )}
      </div>
    </div>
  )
}
