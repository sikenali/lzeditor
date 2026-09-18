import React, { useEffect, useState, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { TextSelection } from '@tiptap/pm/state'

interface OutlineItem {
  id: string
  level: number
  text: string
  pos: number
  number: string
}

interface NumberingState {
  counters: number[]
}

/** Walk the ProseMirror doc, collect headings with 1 / 1.1 / 1.1.1 numbering. */
function collectOutline(doc: any): OutlineItem[] {
  const items: OutlineItem[] = []
  const counters: number[] = [0, 0, 0, 0, 0, 0]

  doc.descendants((node: any, pos: number) => {
    if (node.type.name !== 'heading') return true
    const level = node.attrs.level || 1
    counters[level - 1] += 1
    for (let i = level; i < counters.length; i++) counters[i] = 0

    const number = counters.slice(0, level).join('.')
    items.push({
      id: `h-${pos}`,
      level,
      text: node.textContent.trim() || '(无标题)',
      pos,
      number,
    })
    return true
  })

  return items
}

/** Group flat items into a tree keyed by parent number (1 → 1.1 → 1.1.1). */
function buildTree(items: OutlineItem[]): Map<string, OutlineItem[]> {
  const tree = new Map<string, OutlineItem[]>()
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
  const editor = useEditorStore((s) => s.editor)
  const setShowOutline = useEditorStore((s) => s.setShowOutline)
  const [items, setItems] = useState<OutlineItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const refresh = useCallback(() => {
    if (!editor) return
    const next = collectOutline(editor.state.doc)
    setItems(next)
    // Track active heading from current cursor position
    const from = editor.state.selection.from
    let active: OutlineItem | undefined
    for (const item of next) {
      if (item.pos <= from) active = item
      else break
    }
    setActiveId(active ? active.id : '')
  }, [editor])

  // Recompute outline + active heading on editor/selection changes
  useEffect(() => {
    refresh()
    if (!editor) return
    const handler = () => refresh()
    editor.on('update', handler)
    editor.on('selectionUpdate', handler)
    return () => {
      editor.off('update', handler)
      editor.off('selectionUpdate', handler)
    }
  }, [editor, refresh])

  const handleJump = (item: OutlineItem) => {
    if (!editor) return
    const pos = editor.state.doc.resolve(item.pos + 1)
    const tr = editor.state.tr.setSelection(TextSelection.near(pos))
    tr.scrollIntoView()
    editor.view.dispatch(tr)
    setActiveId(item.id)
  }

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
              title={item.text}
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
