import React, { useState } from 'react'
import { PanelContainer, UDSection, UDInput } from '../ui/PanelContainer'

interface Props {
  onClose: () => void
  onInsert: (url: string, alt: string, align?: 'top' | 'left' | 'right') => void
  onUpload: (file: File, align?: 'top' | 'left' | 'right') => void
  codeModeCursor?: number
  onInsertMarkdown?: (md: string) => void
}

const ALIGN_OPTIONS = [
  { id: 'left', label: '左对齐', icon: 'ri-align-left' },
  { id: 'top', label: '居中', icon: 'ri-align-center' },
  { id: 'right', label: '右对齐', icon: 'ri-align-right' },
] as const

export const ImageDialog: React.FC<Props> = ({ onClose, onInsert, onUpload }) => {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [align, setAlign] = useState<'top' | 'left' | 'right'>('left')
  const [useUrl, setUseUrl] = useState(false) // 默认本地上传
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)

  const handleInsert = () => {
    if (useUrl && url.trim()) {
      onInsert(url.trim(), alt.trim() || 'image', align)
      onClose()
    } else if (!useUrl && uploadFile) {
      onUpload(uploadFile, align)
      onClose()
    }
  }

  const handleGenerateUrl = async () => {
    if (!uploadFile) return
    setGenerating(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        try {
          const resp = await fetch('https://imgant.com/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64.split(',')[1] }),
          })
          const data = await resp.json()
          if (data.url) {
            setUrl(data.url)
            setUseUrl(true) // 上传成功后切换到 URL 模式
          } else {
            alert('图床上传失败，请手动复制图片链接')
          }
        } catch {
          alert('图床服务不可用，请使用其他图床或手动上传')
        }
      }
      reader.readAsDataURL(uploadFile)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PanelContainer
      onClose={onClose}
      icon="ri-image-line"
      title="插入图片"
      subtitle="支持 URL 或本地上传"
      size="md"
      className="dialog-fixed-882x600"
      footer={
        <div className="ud-actions">
          <button className="ud-btn ud-btn--ghost" onClick={onClose}>取消</button>
          <button className="ud-btn ud-btn--primary" onClick={handleInsert} disabled={useUrl ? !url.trim() : !uploadFile}>
            插入图片
          </button>
        </div>
      }
    >
      <div className="ud-right-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 2 标签切换 - 本地上传在前，URL链接在后 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`ud-btn${!useUrl ? ' ud-btn--primary' : ''}`}
              onClick={() => setUseUrl(false)}
              style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <span className="remix ri-upload-cloud-line" style={{ fontSize: 18 }}></span>
              <span style={{ fontSize: 12 }}>本地上传</span>
            </button>
            <button
              className={`ud-btn${useUrl ? ' ud-btn--primary' : ''}`}
              onClick={() => setUseUrl(true)}
              style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <span className="remix ri-link" style={{ fontSize: 18 }}></span>
              <span style={{ fontSize: 12 }}>URL 链接</span>
            </button>
          </div>

          {!useUrl ? (
            // 本地上传
            <UDSection label="选择文件">
              <label className="ud-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f) }}
                />
                <span className="remix ri-upload-cloud-line" style={{ fontSize: 28, color: 'var(--accent-primary)' }}></span>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                  {uploadFile ? `✓ ${uploadFile.name}` : '点击选择图片或拖拽到此处'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>支持 JPG、PNG、GIF、SVG、WebP</div>
              </label>
              {uploadFile && (
                <button
                  className="ud-btn"
                  onClick={handleGenerateUrl}
                  disabled={generating}
                  style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                >
                  <span className={`remix ${generating ? 'ri-loader-4-line spin' : 'ri-flashlight-line'}`}></span>
                  {generating ? '上传中...' : '生成图床 URL'}
                </button>
              )}
            </UDSection>
          ) : (
            // URL 链接
            <>
              <UDSection label="图片地址">
                <div style={{ display: 'flex', gap: 8 }}>
                  <UDInput
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://..."
                    style={{ fontFamily: 'var(--font-mono)', flex: 1 }}
                  />
                  <button
                    className="ud-btn"
                    onClick={() => window.open('https://imgant.com', '_blank')}
                    title="打开图床网站"
                    style={{ flexShrink: 0 }}
                  >
                    <span className="remix ri-flashlight-line"></span> 图床
                  </button>
                </div>
              </UDSection>
              <UDSection label="替代文字">
                <UDInput
                  value={alt}
                  onChange={e => setAlt(e.target.value)}
                  placeholder="图片描述（可选）"
                />
              </UDSection>
            </>
          )}

          <UDSection label="对齐方式">
            <div style={{ display: 'flex', gap: 8 }}>
              {ALIGN_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`ud-btn${align === opt.id ? ' ud-btn--primary' : ''}`}
                  onClick={() => setAlign(opt.id as any)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <span className={`remix ${opt.icon}`}></span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </UDSection>
        </div>
      </div>
    </PanelContainer>
  )
}
