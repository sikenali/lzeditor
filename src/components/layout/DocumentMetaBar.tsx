import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const DocumentMetaBar: React.FC = () => {
  const docs = useEditorStore((s: any) => s.docs)
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const switchDoc = useEditorStore((s: any) => s.switchDoc)
  const closeDoc = useEditorStore((s: any) => s.closeDoc)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  return (
    <div className="document-meta-bar">
      {/* Tab bar */}
      <div className="meta-tabs">
        {docs.map((doc: { id: string; title: string }) => {
          const isActive = doc.id === activeDocId
          const isHovered = hoveredTab === doc.id
          return (
            <div
              key={doc.id}
              className={`meta-tab ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => switchDoc(doc.id)}
              onMouseEnter={() => setHoveredTab(doc.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <span className="remix ri-file-text-line meta-tab-icon"></span>
              <span className="meta-tab-title">{doc.title}</span>
              <button
                className="meta-tab-close"
                onClick={(e) => { e.stopPropagation(); closeDoc(doc.id) }}
                title="关闭"
              >
                <span className="remix ri-close-line"></span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
