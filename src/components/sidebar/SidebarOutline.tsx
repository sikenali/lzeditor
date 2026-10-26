import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { getCM6Editor } from '../editor/codemirror/registry'
import { parseMdOutline, type MdOutlineItem } from '../../utils/mdOutline'
import {
  OUTLINE_DEPTHS, currentSectionIndex, depthLabel, filterByDepth,
  rovingIndex, sectionCountLabel, shownCurrent, type OutlineDepth,
} from '../../utils/outline'

/** 标题级别到徽标样式类：只有两级视觉差异，4/5/6 共用第三级。 */
function badgeClass(level: number): string {
  return `outline-badge${level === 1 ? ' l1' : level === 2 ? ' l2' : ' l3'}`
}

/** 缩进按层级查表，H1 也从同一基线起排（徽标左缘对齐列表内边距）。 */
function indentClass(level: number): string {
  return `outline-indent-${Math.min(6, Math.max(1, level))}`
}

export const SidebarOutline: React.FC = () => {
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const cursorPosition = useEditorStore((s: any) => s.cursorPosition)
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)

  const [depth, setDepth] = useState<OutlineDepth>(0)
  /** 上次拿过焦点的那一项，Tab 回来还是它。 */
  const [focused, setFocused] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const depthGroupRef = useRef<HTMLDivElement>(null)

  // 大纲从 markdown 源文本解析：CM6 没有文档树，标题只能从 `#` 号推
  const md = docsMd[activeDocId || 'readme'] || mdContent || ''
  const items = useMemo(() => parseMdOutline(md), [md])
  const entries = useMemo(() => filterByDepth(items, depth), [items, depth])

  // 当前节 = 最后一个不晚于光标行的标题；深度过滤只显示上级可见项
  const current = useMemo(() => currentSectionIndex(items, cursorPosition?.line ?? 1), [items, cursorPosition])
  const shownIndex = useMemo(() => shownCurrent(entries, current), [entries, current])
  /** 唯一的 tab 停点：上次焦点，否则当前项。 */
  const stop = Math.min(focused ?? shownIndex ?? 0, entries.length - 1)

  // 光标或预览换节时，当前项留在视口内
  useEffect(() => {
    if (shownIndex === null) return
    const btns = listRef.current?.querySelectorAll<HTMLButtonElement>('.outline-jump-btn')
    btns?.[shownIndex]?.scrollIntoView({ block: 'nearest' })
  }, [shownIndex])

  const handleJump = useCallback((item: MdOutlineItem) => {
    getCM6Editor()?.goto(item.pos, item.pos + item.text.length)
  }, [])

  /** 方向键在列表里走焦点，Home/End 跳首尾，Return/Space 打开（原生 button 自带）。 */
  const onListKeyDown = useCallback((e: React.KeyboardEvent<HTMLUListElement>) => {
    const btns = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('.outline-jump-btn') ?? [])
    const index = btns.indexOf(document.activeElement as HTMLButtonElement)
    const next = rovingIndex(e.key, index < 0 ? 0 : index, btns.length)
    if (next === null) return
    e.preventDefault()
    btns[next]?.focus()
  }, [])

  /** 层级单选组：方向键移焦并直接选中，选中项始终是唯一的 tab 停点。 */
  const onDepthKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const btns = Array.from(depthGroupRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const index = btns.indexOf(document.activeElement as HTMLButtonElement)
    const next = rovingIndex(e.key, index < 0 ? 0 : index, btns.length)
    if (next === null) return
    e.preventDefault()
    btns[next]?.focus()
    btns[next]?.click()
  }, [])

  return (
    <div className="sidebar-outline">
      <div className="sidebar-header">
        <span className="remix sidebar-header-icon ri-list-unordered"></span>
        <span className="sidebar-header-title">目录</span>
        {items.length > 0 && (
          <span className="outline-count" title="当前显示 / 全部标题">{sectionCountLabel(entries.length, items.length)}</span>
        )}
        <button className="sidebar-close-btn" onClick={() => setShowOutline(false)}>
          <span className="remix ri-close-line"></span>
        </button>
      </div>
      <div className="sidebar-scroll">
        {items.length === 0 ? (
          <div className="sidebar-empty">
            <span className="remix ri-article-line"></span>
            <span>暂无标题，以 # 开头的一行会出现在这里</span>
          </div>
        ) : (
          <ul ref={listRef} className="outline-list" onKeyDown={onListKeyDown}>
            {entries.map((entry, position) => {
              const isCurrent = position === shownIndex
              return (
                <li key={entry.heading.id} className={indentClass(entry.heading.level)}>
                  <button
                    type="button"
                    className={`outline-jump-btn${isCurrent ? ' current' : ''}`}
                    data-level={entry.heading.level}
                    data-line={entry.heading.line}
                    aria-current={isCurrent ? 'location' : undefined}
                    tabIndex={position === stop ? 0 : -1}
                    onFocus={() => setFocused(position)}
                    onClick={() => handleJump(entry.heading)}
                    title={entry.heading.text}
                  >
                    <span className={badgeClass(entry.heading.level)}>H{entry.heading.level}</span>
                    <span className="outline-text">{entry.heading.text}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {items.length > 0 && (
        <div className="outline-footer">
          <span className="outline-footer-label" aria-hidden="true"><span className="remix ri-filter-line"></span>层级</span>
          <div ref={depthGroupRef} role="radiogroup" aria-label="层级" className="outline-depth-group" tabIndex={-1} onKeyDown={onDepthKeyDown}>
            {OUTLINE_DEPTHS.map(d => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={depth === d}
                tabIndex={depth === d ? 0 : -1}
                className={`outline-depth-btn${depth === d ? ' active' : ''}`}
                onClick={() => setDepth(d)}
              >
                {depthLabel(d)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
