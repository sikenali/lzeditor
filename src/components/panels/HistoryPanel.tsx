import React, { useState, useMemo, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { getEditorFacade } from '../editor/facade/registry'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { mdToHtml } from '../../utils/mdToHtml'
import { mergeTimeline, commitShortHash, type GitVersionLike } from '../../utils/historyTimeline'
import { fetchVersions } from '../../services/versionApi'

export const HistoryPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const versions = useEditorStore((s) => s.activeDocId ? (s.versionsByDoc[s.activeDocId] ?? []) : [])
  const hydrateVersions = useEditorStore((s) => s.hydrateVersions)
  const setDocHTML = useEditorStore((s) => s.setDocHTML)
  const setMdContent = useEditorStore((s) => s.setMdContent)

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  // git 提交（异步拉取）+ 仓库内相对路径
  const [gitCommits, setGitCommits] = useState<GitVersionLike[]>([])
  const [gitPath, setGitPath] = useState<string | undefined>(undefined)
  const [gitLoading, setGitLoading] = useState(false)
  // git 项选中后惰性拉取内容渲染预览
  const [gitPreviewHtml, setGitPreviewHtml] = useState<string | null>(null)
  const [gitPreviewLoading, setGitPreviewLoading] = useState(false)

  const diskPath = useMemo(() => {
    const doc = useEditorStore.getState().docs.find((d: any) => d.id === activeDocId)
    return (doc as any)?.diskPath || ''
  }, [activeDocId])

  // 打开时：播种本地快照 + 若在 git 仓库则异步拉提交历史。
  // 切文档时先重置 git 提交（防上一文档的提交泄漏进合并时间线）；stale 异步响应用 cancelled 丢弃。
  // 重启后主进程 allowedPaths 已清空，故打开时先重新授权持久化的 diskPath（git:authorize 双检 ext+existsSync）。
  useEffect(() => {
    setGitCommits([])
    setGitPath(undefined)
    setGitPreviewHtml(null)
    setGitPreviewLoading(false)
    setSelectedVersion(null)
    if (activeDocId) {
      // 先用本地缓存渲染（即时），再从后端拉取 Ctrl+S 保存历史覆写（权威）。
      hydrateVersions(activeDocId)
      void (async () => {
        const server = await fetchVersions(activeDocId)
        if (server) useEditorStore.getState().setDocVersions(activeDocId, server)
      })()
    }
    const api = window.electronAPI
    if (!diskPath || !api?.gitHistory) {
      setGitLoading(false)
      return
    }
    let cancelled = false
    setGitLoading(true)
    const load = async () => {
      try {
        try { await api.gitAuthorize?.(diskPath) } catch {}
        if (cancelled) return
        const res = await api.gitHistory(diskPath)
        if (cancelled) return
        if (res?.ok) {
          setGitCommits(res.commits ?? [])
          setGitPath(res.gitPath)
        }
      } catch {}
      finally { if (!cancelled) setGitLoading(false) }
    }
    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId, diskPath])

  // 合并时间线：本地快照 + git 提交按 ts 倒序
  const merged = useMemo(() => mergeTimeline(versions, gitCommits, gitPath), [versions, gitCommits, gitPath])
  const selected = merged.find(v => v.id === selectedVersion) ?? merged[0] ?? null
  const currentIndex = merged.findIndex(v => v.id === selected?.id)

  const maxChanges = useMemo(() => Math.max(...merged.map(v => v.changes), 1), [merged])

  // git 项预览：选中后拉该 commit 内容 → mdToHtml
  useEffect(() => {
    if (!selected || selected.source !== 'git' || !diskPath) {
      setGitPreviewHtml(null)
      return
    }
    setGitPreviewLoading(true)
    window.electronAPI?.gitShow?.(diskPath, selected.id)
      .then(res => {
        if (res?.ok && res.text != null) setGitPreviewHtml(mdToHtml(res.text))
        else setGitPreviewHtml(null)
      })
      .catch(() => setGitPreviewHtml(null))
      .finally(() => setGitPreviewLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.source, diskPath])

  const previewHtml = selected?.source === 'git' ? (gitPreviewHtml ?? '') : (selected?.html ?? '')

  // 回滚/重播：载入内容，不改仓库（版本仅由 Ctrl+S 创建，回滚不会落新快照）。
  const loadVersion = async () => {
    if (!selected) return
    const docId = useEditorStore.getState().activeDocId
    try {
      if (selected.source === 'git') {
        if (!diskPath) return
        const res = await window.electronAPI?.gitShow?.(diskPath, selected.id)
        if (!res?.ok || res.text == null) return
        const html = mdToHtml(res.text)
        useEditorStore.getState().updateDoc({ md: res.text, html, docsMd: docId ? { [docId]: res.text } : undefined })
        setDocHTML(html)
        setMdContent(res.text)
        getEditorFacade()?.setText(res.text)
      } else {
        useEditorStore.getState().updateDoc({ md: selected.md, html: selected.html, docsMd: docId ? { [docId]: selected.md } : undefined })
        setDocHTML(selected.html)
        setMdContent(selected.md)
        getEditorFacade()?.setText(selected.md)
      }
    } catch {
      // 载入失败不阻塞面板
    }
  }

  const handleRollback = () => {
    if (!selected) return
    void loadVersion()
    onClose?.()
  }

  // 重播：把选中版本载入编辑器，但不关闭面板，便于对照查看
  const handleReplay = () => {
    if (!selected) return
    void loadVersion()
  }

  const handleBarClick = (id: string) => {
    setSelectedVersion(id)
  }

  const sourceIcon = (v: { source: 'git' | 'local' }) =>
    v.source === 'git' ? 'ri-git-commit-line' : 'ri-history-line'

  const emptyState = gitLoading ? (
    <div className="history-empty-state">
      <span className="remix ri-loader-4-line history-loading"></span>
      <div>加载历史中…</div>
    </div>
  ) : (
    <div className="history-empty-state">
      <span className="remix ri-history-line"></span>
      <div>暂无历史记录</div>
    </div>
  )

  return (
    <div className="history-main-panel">
      {/* ── 上部：版本预览 ── */}
      <div className="history-scroll-area">
        {merged.length === 0 ? emptyState : selected ? (
          <>
            {gitPreviewLoading && <div className="history-loading-bar">加载提交内容…</div>}
            <div className="history-preview-doc">
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) || '<p class="history-preview-empty">空快照</p>' }} />
            </div>
          </>
        ) : (
          emptyState
        )}
      </div>

      {/* ── 下部：版本信息 + 时间线柱状图 ── */}
      {merged.length > 0 && (
        <div className="history-timeline-bar">
          {/* 版本信息头 */}
          {selected && (
            <div className="history-version-info">
              <span className="history-version-label">
                <span className={`remix ${sourceIcon(selected)} history-version-hash-icon`}></span>
                <span className="history-version-num">{selected.source === 'git' ? `Git 提交 #${currentIndex !== -1 ? currentIndex + 1 : merged.length}` : `版本 #${currentIndex !== -1 ? currentIndex + 1 : merged.length}`}</span>
                <span className="history-version-hash">({commitShortHash(selected.id)})</span>
                <span className="history-version-date">{selected.date} {selected.time}</span>
              </span>
              <div className="history-version-actions">
                <button className="history-action-btn" onClick={handleRollback} title="恢复到该版本并关闭面板">
                  <span className="remix ri-arrow-go-back-line"></span>
                  <span>回滚</span>
                </button>
                <button className="history-action-btn" onClick={handleReplay} title="载入该版本内容，保持面板可继续对照">
                  <span className="remix ri-restart-line"></span>
                  <span>重播</span>
                </button>
                <button className="history-action-btn" onClick={onClose}>
                  <span className="remix ri-close-line"></span>
                  <span>关闭</span>
                </button>
              </div>
            </div>
          )}
          {/* 时间线柱状图 */}
          <div className="history-timeline">
            {merged.map((v, i) => {
              const isActive = i === currentIndex
              // 优化 #③：柱高按修改量线性映射（修改越多越高），保留 8px 最小高度；
              // 量程 8→72px，不同修改量映射到不同柱高，形成层次感。
              const barH = Math.max(8, 8 + (v.changes / maxChanges) * 64)
              return (
                <div
                  key={v.id}
                  className={`history-bar${isActive ? ' active' : ''}`}
                  onClick={() => handleBarClick(v.id)}
                  title={v.source === 'git' ? `Git 提交 · ${v.desc}` : `本地编辑 · ${v.date} ${v.time}`}
                >
                  <span className={`remix ${sourceIcon(v)} history-bar-source`}></span>
                  <div
                    className="history-bar-body"
                    style={{ height: `${barH}px` }}
                  >
                    <div
                      className="history-bar-base"
                      style={{ height: '100%' }}
                    />
                  </div>
                  <span className="history-bar-label">{merged.length - i}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
