import React, { useState, useEffect, useRef, useMemo } from 'react'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { useEditorStore } from '../../store/editorStore'
import { copyRichText } from '../../clipboard'
import { getDocMd } from '../../utils/docSource'
import { UnifiedDialog } from '../ui/UnifiedDialog'

function getEffectiveMd(activeDocId: string | null, storeMd: string, docsMd: Record<string, string>): string {
  if (storeMd) return storeMd
  if (docsMd[activeDocId || 'welcome']) return docsMd[activeDocId || 'welcome']
  return getDocMd(activeDocId || 'welcome')
}

export const PreviewPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docTitle = useEditorStore((s: any) => s.docTitle)
  const previewMode = useEditorStore((s: any) => s.previewMode)
  const setPreviewMode = useEditorStore((s: any) => s.setPreviewMode)
  const togglePreviewMode = useEditorStore((s: any) => s.togglePreviewMode)
  const [isCodeMode, setIsCodeMode] = useState(previewMode === 'code')

  useEffect(() => { setIsCodeMode(previewMode === 'code') }, [previewMode])

  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current) }
  }, [])

  const effectiveMd = useMemo(() => getEffectiveMd(activeDocId, mdContent, docsMd), [activeDocId, mdContent, docsMd])

  const renderedHtml = useMemo(() => {
    if (!effectiveMd) return ''
    try {
      return remark().use(remarkGfm).use(remarkHtml).processSync(effectiveMd).toString()
    } catch {
      return effectiveMd
    }
  }, [effectiveMd])

  const handleCopyWechat = async () => {
    if (!renderedHtml) return
    const ok = await copyRichText(renderedHtml)
    if (ok) {
      setCopied(true)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  const rightTop = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        className="sidebar-wechat-btn"
        onClick={handleCopyWechat}
        title="一键复制为公众号可用富文本"
      >
        <span className={`remix ${copied ? 'ri-check-line' : 'ri-wechat-fill'}`}></span>
        {copied ? '已复制' : '公众号'}
      </button>
      <button
        className={`preview-mode-btn ${isCodeMode ? 'active' : ''}`}
        onClick={() => togglePreviewMode()}
        title="切换源码模式"
      >
        <span className="remix ri-code-s-line"></span>
        <span>源码</span>
      </button>
    </div>
  )

  const rightContent = (
    isCodeMode ? (
      <pre className="preview-code">
        <code>{effectiveMd || '# Welcome to LZEditor\n\n请切换到编辑模式后查看预览内容...'}</code>
      </pre>
    ) : (
      <div
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: renderedHtml || `<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无内容</p>` }}
      />
    )
  )

  const rightBottom = (
    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
      {isCodeMode ? 'Markdown 源码视图' : '富文本预览'} · 点击外部区域关闭
    </span>
  )

  return (
    <UnifiedDialog
      onClose={onClose}
      icon="ri-eye-2-line"
      title="预览"
      subtitle={docTitle}
      rightTop={rightTop}
      rightContent={rightContent}
      rightBottom={rightBottom}
      size="lg"
    />
  )
}
