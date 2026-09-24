import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { LFSInput } from '../ui/LFInput'
import { UnifiedDialog, UDSection } from '../ui/UnifiedDialog'

const FILE_TEMPLATES = [
  { id: 'blank', name: '空白文档', desc: '从头开始', icon: 'ri-file-line' },
  { id: 'markdown', name: 'Markdown 模板', desc: '标准 Markdown 结构', icon: 'ri-markdown-fill' },
  { id: 'report', name: '技术报告', desc: '带章节的长文档', icon: 'ri-file-text-line' },
  { id: 'notes', name: '会议记录', desc: '日程与待办', icon: 'ri-article-line' },
]

export const FilePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const setDocPath = useEditorStore((s: any) => s.setDocPath)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const [searchText, setSearchText] = useState('')

  const handleCreate = (templateId: string) => {
    const names: Record<string, string> = {
      blank: 'untitled.md',
      markdown: 'markdown-template.md',
      report: 'technical-report.md',
      notes: 'meeting-notes.md',
    }
    setTitle(names[templateId] || 'untitled.md')
    setDocPath('')
    setOpenPanel('none')
    onClose()
  }

  const handleOpen = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt,.markdown'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) {
        setTitle(file.name)
        setDocPath(file.name)
        setOpenPanel('none')
        onClose()
      }
    }
    input.click()
  }

  const filtered = FILE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.desc.toLowerCase().includes(searchText.toLowerCase())
  )

  const leftNav = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {filtered.map(t => (
        <button key={t.id} className="ud-chip" onClick={() => handleCreate(t.id)}>
          <span className={`remix ud-chip-icon ${t.icon}`}></span>
          <div>
            <div className="ud-chip-label">{t.name}</div>
            <div className="ud-chip-desc">{t.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )

  const rightContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <UDSection label="搜索">
        <LFSInput value={searchText} onChange={setSearchText} placeholder="搜索模板…" />
      </UDSection>
      <UDSection label="快速打开">
        <button className="ud-btn" onClick={handleOpen} style={{ width: '100%', justifyContent: 'center' }}>
          <span className="remix ri-folder-open-line"></span> 打开本地文件
        </button>
      </UDSection>
    </div>
  )

  return (
    <UnifiedDialog
      onClose={onClose}
      icon="ri-file-list-2-line"
      title="文件"
      subtitle="新建或打开文档"
      leftNav={leftNav}
      rightContent={rightContent}
      hint="选择模板将直接创建新文档"
      size="md"
    />
  )
}
