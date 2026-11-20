import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { getEditorFacade } from '../editor/facade/registry'
import { getOutlineJumper } from '../../utils/outlineJump'
import { parseMdOutline, resolveOutlineMd, type MdOutlineItem } from '../../utils/mdOutline'
import { getDocMd } from '../../utils/docSource'
import {
  OUTLINE_DEPTHS, currentSectionIndex, depthLabel, filterByDepth,
  rovingIndex, shownCurrent, type OutlineDepth,
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
  const appMode = useEditorStore((s: any) => s.appMode)
  const activeTocId = useEditorStore((s: any) => s.activeTocId)
  const isContentMode = appMode === 'read' || appMode === 'style'
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)

  const [depth, setDepth] = useState<OutlineDepth>(0)
  /** 上次拿过焦点的那一项，Tab 回来还是它。 */
  const [focused, setFocused] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const depthGroupRef = useRef<HTMLDivElement>(null)

  // 大纲从 markdown 源文本解析：CM6 没有文档树，标题只能从 `#` 号推。
  // md 源走 resolveOutlineMd 兜底链（docsMd → mdContent → getDocMd 源码），
  // 避免首开 docsMd/mdContent 均空时大纲显示「暂无标题」（编辑器已借 getDocMd 显示内容）。
  const md = resolveOutlineMd(activeDocId || 'readme', docsMd, mdContent, getDocMd)
  const items = useMemo(() => parseMdOutline(md), [md])
  const entries = useMemo(() => filterByDepth(items, depth), [items, depth])

  // 当前节：内容模式（阅读/样式）从 store activeTocId 反查；编辑模式 = 最后一个不晚于光标行的标题。
  // 深度过滤只显示上级可见项
  const current = useMemo(() => {
    if (isContentMode) {
      if (!activeTocId) return -1
      return items.findIndex(i => i.id === activeTocId)
    }
    return currentSectionIndex(items, cursorPosition?.line ?? 1)
  }, [isContentMode, activeTocId, items, cursorPosition])
  const shownIndex = useMemo(() => shownCurrent(entries, current), [entries, current])
  /** 唯一的 tab 停点：上次焦点，否则当前项。 */
  const stop = Math.min(focused ?? shownIndex ?? 0, entries.length - 1)

  // 光标或预览换节时，当前项留在视口内
  useEffect(() => {
    if (shownIndex === null) return
    const btns = listRef.current?.querySelectorAll<HTMLButtonElement>('.outline-jump-btn')
    btns?.[shownIndex]?.scrollIntoView({ block: 'nearest' })
  }, [shownIndex])

  const handleJump = useCallback((item: MdOutlineItem, position: number) => {
    // 内容模式（阅读/样式）：经注册表跳转，由阅读/样式面板注册的 jumper 负责滚动与高亮
    if (isContentMode) { getOutlineJumper()?.(item.id); return }
    // yeli 无 goto：选中目标标题源码区间并聚焦；facade.focus() 会定位到该块
    // 并 scrollIntoView（A2 大纲跳转滚动跟随），不再依赖编辑层随选区跟随。
    const facade = getEditorFacade()
    if (!facade) return
    facade.setSelection(item.pos, item.pos + item.text.length)
    facade.focus()
    // 点击后让该项滚入视口并保持 current 高亮：即使光标未跨节（shownIndex 不变，
    // 上面的 shownIndex effect 不触发），点击的项也要留在大纲视口内。
    const btns = listRef.current?.querySelectorAll<HTMLButtonElement>('.outline-jump-btn')
    btns?.[position]?.scrollIntoView({ block: 'nearest' })
  }, [isContentMode])

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
                    onClick={() => handleJump(entry.heading, position)}
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
