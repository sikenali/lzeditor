import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { UiModal, UiInput, UDSection } from '../ui'

import { mdToHtml } from '../../utils/mdToHtml'

const FILE_TEMPLATES = [
  { id: 'blank', name: '空白文档', desc: '从头开始', icon: 'ri-file-line' },
  { id: 'markdown', name: 'Markdown 模板', desc: '标准 Markdown 结构', icon: 'ri-markdown-fill' },
  { id: 'report', name: '技术报告', desc: '带章节的长文档', icon: 'ri-file-text-line' },
  { id: 'notes', name: '会议记录', desc: '日程与待办', icon: 'ri-article-line' },
]

const TEMPLATE_MD: Record<string, string> = {
  blank: '',
  markdown: `# 标题

简要描述文档主题。

## 背景

## 目标

## 方案

## 结论
`,
  report: `# 技术报告

> 作者：　　日期：

## 摘要

## 背景与动机

## 方案设计

## 实现细节

## 测试结果

## 后续计划
`,
  notes: `# 会议记录

- 时间：
- 参与人：

## 议题

## 待办

- [ ] 待办事项 1
- [ ] 待办事项 2
`,
}

/** Create a doc tab, load markdown into it and persist it. */
function loadNewDoc(title: string, md: string): void {
  const store = useEditorStore.getState()
  const id = store.createDoc(title)
  const html = mdToHtml(md)
  store.updateDoc({ md, html, docsMd: { [id]: md } })
  try { localStorage.setItem(`lzeditor-doc-${id}`, JSON.stringify({ md, html, savedAt: Date.now() })) } catch {}
  store.editor?.commands?.setContent(html)
}

export const FilePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const [searchText, setSearchText] = useState('')

  const handleCreate = (templateId: string) => {
    const names: Record<string, string> = {
      blank: 'untitled.md',
      markdown: 'markdown-template.md',
      report: 'technical-report.md',
      notes: 'meeting-notes.md',
    }
    loadNewDoc(names[templateId] || 'untitled.md', TEMPLATE_MD[templateId] ?? '')
    setOpenPanel('none')
    onClose()
  }

  const handleOpen = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt,.markdown'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      const md = await file.text().catch(() => '')
      loadNewDoc(file.name, md)
      setOpenPanel('none')
      onClose()
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
        <UiInput value={searchText} onChange={setSearchText} placeholder="搜索模板…" />
      </UDSection>
      <UDSection label="快速打开">
        <button className="ud-btn" onClick={handleOpen} style={{ width: '100%', justifyContent: 'center' }}>
          <span className="remix ri-folder-open-line"></span> 打开本地文件
        </button>
      </UDSection>
    </div>
  )

  return (
    <UiModal
      open
      onClose={onClose}
      icon="ri-file-list-2-line"
      title="文件"
      subtitle="新建或打开文档"
      width={900}
    >
      <div className="ud-body ud-body-split">
        <div className="ud-left">{leftNav}</div>
        <div className="ud-right">
          <div className="ud-right-content">{rightContent}</div>
        </div>
      </div>
    </UiModal>
  )
}
