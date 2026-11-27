import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { UiModal, UiButton } from '../ui'

export const DocumentMetaBar: React.FC = () => {
  const docs = useEditorStore((s: any) => s.docs)
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const showWelcome = useEditorStore((s: any) => s.showWelcome)
  const switchDoc = useEditorStore((s: any) => s.switchDoc)
  const closeDoc = useEditorStore((s: any) => s.closeDoc)
  const renameDoc = useEditorStore((s: any) => s.renameDoc)
  const enableTabs = useSettingsStore((s) => s.enableTabs !== false)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  /** 待删除确认的文档：关闭标签不再直接删除，避免误点丢文档。 */
  const [pendingClose, setPendingClose] = useState<string | null>(null)

  const userDocs = docs.filter((doc: any) => !doc.system)
  const hasDoc = !!activeDocId && userDocs.length > 0

  if (!enableTabs || showWelcome || !hasDoc) return null

  const beginRename = (doc: { id: string; title: string }) => {
    setEditingId(doc.id)
    setDraftTitle(doc.title)
  }

  const commitRename = () => {
    if (!editingId) return
    renameDoc(editingId, draftTitle)
    setEditingId(null)
  }

  const pendingDoc = userDocs.find((d: any) => d.id === pendingClose)

  return (
    <div className="document-meta-bar">
      {/* Tab bar */}
      <div className="meta-tabs">
        {userDocs.map((doc: { id: string; title: string }) => {
          const isActive = doc.id === activeDocId
          const isHovered = hoveredTab === doc.id
          const isEditing = editingId === doc.id
          return (
            <div
              key={doc.id}
              className={`meta-tab ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => { if (!isEditing) switchDoc(doc.id) }}
              onMouseEnter={() => setHoveredTab(doc.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <span className="remix ri-file-text-line meta-tab-icon"></span>
              {isEditing ? (
                <input
                  className="meta-tab-rename-input"
                  value={draftTitle}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  onChange={e => setDraftTitle(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitRename() }
                    else if (e.key === 'Escape') { e.preventDefault(); setEditingId(null) }
                  }}
                />
              ) : (
                <span
                  className="meta-tab-title"
                  title={`${doc.title}（双击重命名）`}
                  onDoubleClick={e => { e.stopPropagation(); beginRename(doc) }}
                >
                  {doc.title}
                </span>
              )}
              <button
                className="meta-tab-close"
                onClick={(e) => { e.stopPropagation(); setPendingClose(doc.id) }}
                title="关闭并删除文档"
                aria-label="关闭并删除文档"
              >
                <span className="remix ri-close-line"></span>
              </button>
            </div>
          )
        })}
      </div>

      <UiModal
        open={!!pendingClose}
        onClose={() => setPendingClose(null)}
        icon="ri-delete-bin-line"
        title="关闭文档"
        subtitle="关闭后会从文档库中移除"
        width={440}
        footer={
          <>
            <UiButton variant="ghost" onClick={() => setPendingClose(null)}>取消</UiButton>
            <UiButton onClick={() => { if (pendingClose) closeDoc(pendingClose); setPendingClose(null) }}>删除文档</UiButton>
          </>
        }
      >
        <p style={{ padding: '4px 0 12px', fontSize: 13, color: 'var(--color-text-body)' }}>
          确定关闭并删除「{pendingDoc?.title || '该文档'}」？文档正文会一并从本机移除。
        </p>
      </UiModal>
    </div>
  )
}
