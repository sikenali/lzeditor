import React, { useState, useEffect, useMemo } from 'react'
import { UnifiedDialog, UDSection, UDInput } from '../ui/UnifiedDialog'
import { LFSCombo } from '../../components/ui/LFSCombo'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  onClose: () => void
  onInsert: (text: string, url: string, newTab?: boolean) => void
  codeModeCursor?: number
  onInsertMarkdown?: (md: string) => void
}

export const LinkDialog: React.FC<Props> = ({ onClose, onInsert }) => {
  const [linkType, setLinkType] = useState<'external' | 'internal'>('external')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [newTab, setNewTab] = useState(true)
  const [docSource, setDocSource] = useState('')
  const [chapterRef, setChapterRef] = useState('')

  const docs = useEditorStore((s) => s.docs)
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const docsMd = useEditorStore((s) => s.docsMd || {})

  // 提取文档中的章节标题
  const extractHeadings = (html: string): { id: string; text: string; level: number }[] => {
    const headings: { id: string; text: string; level: number }[] = []
    const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
    let match
    let index = 0
    while ((match = regex.exec(html)) !== null) {
      const level = parseInt(match[1])
      const text = match[2].replace(/<[^>]+>/g, '').trim()
      if (text) {
        headings.push({
          id: `heading-${index++}`,
          text,
          level
        })
      }
    }
    return headings
  }

  // 获取当前选中文档的章节列表
  const chapters = useMemo(() => {
    if (!docSource) return []
    // 查找匹配的文档
    const doc = docs.find((d: any) => d.title === docSource || d.id === docSource)
    if (!doc) return []
    const md = docsMd[doc.id] || ''
    if (!md) return []
    // 从 Markdown 提取标题 - 支持 # 标题 和 #### 标题 等格式
    const headingRegex = /^#{1,6}\s+.+$/gm
    const headings: { id: string; text: string; level: number }[] = []
    let match
    let index = 0
    while ((match = headingRegex.exec(md)) !== null) {
      const line = match[0]
      const hashMatch = line.match(/^(#+)/)
      const level = hashMatch ? hashMatch[1].length : 1
      const text = line.replace(/^#+\s+/, '').trim()
      if (text) {
        headings.push({
          id: `heading-${index++}`,
          text,
          level
        })
      }
    }
    return headings
  }, [docSource, docs, docsMd])

  // 默认选择当前文档
  useEffect(() => {
    const currentDoc = docs.find((d: any) => d.id === activeDocId)
    if (currentDoc) {
      setDocSource(currentDoc.title || currentDoc.id)
    }
  }, [docs, activeDocId])

  const handleInsert = () => {
    if (linkType === 'external') {
      if (!url.trim()) return
      const linkText = text.trim() || url.trim()
      onInsert(linkText, url.trim(), newTab)
    } else {
      // 内部链接
      const linkText = text.trim() || docSource
      const chapterHash = chapterRef ? `#${chapterRef}` : ''
      const internalUrl = `${docSource}${chapterHash}`
      onInsert(linkText, internalUrl)
    }
    onClose()
  }

  return (
    <UnifiedDialog
      onClose={onClose}
      icon="ri-link"
      title="插入链接"
      subtitle="链接将插入到当前光标位置"
      size="md"
      className="dialog-fixed-882x600"
      rightContent={(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 2 标签切换 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`ud-btn${linkType === 'external' ? ' ud-btn--primary' : ''}`}
              onClick={() => setLinkType('external')}
              style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <span className="remix ri-global-line" style={{ fontSize: 18 }}></span>
              <span style={{ fontSize: 12 }}>外部链接</span>
            </button>
            <button
              className={`ud-btn${linkType === 'internal' ? ' ud-btn--primary' : ''}`}
              onClick={() => setLinkType('internal')}
              style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <span className="remix ri-file-list-3-line" style={{ fontSize: 18 }}></span>
              <span style={{ fontSize: 12 }}>内部链接</span>
            </button>
          </div>

          {/* 外部链接 */}
          {linkType === 'external' && (
            <>
              <UDSection label="链接信息">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>显示文字</label>
                    <UDInput
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="链接文字（可选，留空使用 URL）"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>URL 地址</label>
                    <UDInput
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://..."
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
              </UDSection>
              <UDSection label="打开方式">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newTab}
                    onChange={e => setNewTab(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>点击从新标签中打开</span>
                </label>
              </UDSection>
            </>
          )}

          {/* 内部链接 */}
          {linkType === 'internal' && (
            <>
              {/* 1. 显示文字 */}
              <UDSection label="显示文字">
                <UDInput
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="链接文字（可选，留空使用文档名）"
                />
              </UDSection>

              {/* 2. 文档来源 */}
              <UDSection label="文档来源">
                <LFSCombo value={docSource} onChange={setDocSource} options={[
                  { value: '', label: '请选择文档...' },
                  ...docs.map((d: any) => ({ value: d.title || d.id, label: d.title || d.id }))
                ]} style={{ width: '100%' }} />
              </UDSection>

              {/* 3. 章节引用 */}
              <UDSection label="章节引用">
                <LFSCombo value={chapterRef} onChange={setChapterRef} options={[
                  { value: '', label: '整篇文档' },
                  ...chapters.map(c => ({ value: c.text, label: `${'　'.repeat(c.level - 1)}${c.text}` }))
                ]} style={{ width: '100%' }} />
              </UDSection>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-code)', borderRadius: 6 }}>
                <span className="remix ri-information-line" style={{ marginRight: 6 }}></span>
                内部链接将生成锚点链接，格式为 #章节标题
              </div>
            </>
          )}
        </div>
      )}
      hint={linkType === 'external' ? '链接文字留空将使用 URL 作为显示文字' : '选择文档和章节创建内部锚点链接'}
      submitText="插入链接"
      onSubmit={handleInsert}
      submitDisabled={linkType === 'external' ? !url.trim() : !docSource}
    />
  )
}
