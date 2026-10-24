import React, { useState, useEffect, useMemo } from 'react'
import { UiModal, UiInput, UiSelect, UiSwitch, UiButton } from '../ui'
import { useEditorStore } from '../../store/editorStore'
import { parseMdOutline } from '../../utils/mdOutline'

const UDSection: React.FC<{ label: string; desc?: string; children: React.ReactNode }> = ({ label, desc, children }) => (
  <div className="ud-section">
    <div className="ud-section-head">
      <span className="ud-section-label">{label}</span>
      {desc && <span className="ud-section-desc">{desc}</span>}
    </div>
    <div className="ud-section-body">{children}</div>
  </div>
)

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

  // 章节标题从 markdown 源解析：id 就是预览里生成的真实锚点，
  // 围栏内的 # 不会被当成标题
  const chapters = useMemo(() => {
    if (!docSource) return []
    const doc = docs.find((d: any) => d.id === docSource || d.title === docSource)
    if (!doc) return []
    return parseMdOutline(docsMd[doc.id] || '').filter(h => h.text !== '(无标题)')
  }, [docSource, docs, docsMd])

  // 默认选择当前文档
  useEffect(() => {
    const currentDoc = docs.find((d: any) => d.id === activeDocId)
    if (currentDoc) setDocSource(currentDoc.id)
  }, [docs, activeDocId])

  const handleInsert = () => {
    if (linkType === 'external') {
      if (!url.trim()) return
      onInsert(text.trim() || url.trim(), url.trim(), newTab)
    } else {
      if (!docSource) return
      const doc = docs.find((d: any) => d.id === docSource)
      const linkText = text.trim() || doc?.title || docSource
      // 跨文档：docId#章节锚点；同文档：#章节锚点
      const internalUrl = chapterRef
        ? `${docSource === (docs.find((d: any) => d.id === activeDocId)?.id || '') ? '' : docSource}#${chapterRef}`
        : docSource
      onInsert(linkText, internalUrl)
    }
    onClose()
  }

  return (
    <UiModal
      open
      onClose={onClose}
      icon="ri-link"
      title="插入链接"
      subtitle="链接将插入到当前光标位置"
      width={720}
      footer={
        <>
          <UiButton variant="ghost" onClick={onClose}>取消</UiButton>
          <UiButton onClick={handleInsert} disabled={linkType === 'external' ? !url.trim() : !docSource}>
            插入链接
          </UiButton>
        </>
      }
    >
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto', flex: 1 }}>
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
                    <UiInput
                      value={text}
                      onChange={setText}
                      placeholder="链接文字（可选，留空使用 URL）"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>URL 地址</label>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                      <UiInput
                        value={url}
                        onChange={setUrl}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </UDSection>
              <UDSection label="打开方式">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <UiSwitch size="sm" checked={newTab} onChange={setNewTab} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 10 }}>点击从新标签中打开</span>
                </div>
              </UDSection>
            </>
          )}

          {/* 内部链接 */}
          {linkType === 'internal' && (
            <>
              {/* 1. 显示文字 */}
              <UDSection label="显示文字">
                <UiInput
                  value={text}
                  onChange={setText}
                  placeholder="链接文字（可选，留空使用文档名）"
                />
              </UDSection>

              {/* 2. 文档来源 */}
              <UDSection label="文档来源">
                <UiSelect value={docSource} onChange={v => { setDocSource(v); setChapterRef('') }} options={[
                  { value: '', label: '请选择文档...' },
                  ...docs.map((d: any) => ({ value: d.id, label: d.title || d.id }))
                ]} />
              </UDSection>

              {/* 3. 章节引用 */}
              <UDSection label="章节引用">
                <UiSelect value={chapterRef} onChange={setChapterRef} options={[
                  { value: '', label: '整篇文档' },
                  ...chapters.map(c => ({ value: c.id, label: `${'　'.repeat(c.level - 1)}${c.text}` }))
                ]} />
              </UDSection>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-code)', borderRadius: 6 }}>
                <span className="remix ri-information-line" style={{ marginRight: 6 }}></span>
                内部链接在应用内跳转：选择其他文档时打开该文档，选择章节时滚动到对应标题
              </div>
            </>
          )}
        </div>
    </UiModal>
  )
}
