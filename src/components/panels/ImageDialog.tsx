import React, { useState } from 'react'
import { toast } from '../../utils/toast'
import { UiModal, UiInput, UiButton } from '../ui'

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

/** 图片 URL 校验：允许 http(s)、data:image/、相对路径；拒绝空值、未知协议、空格。 */
function validateImageUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return '请输入图片 URL'
  if (/\s/.test(v)) return 'URL 不能包含空格'
  if (/^data:/i.test(v)) return /^data:image\//i.test(v) ? '' : '仅支持 data:image/ 内嵌图片'
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) {
    if (!/^https?:/i.test(v)) return '仅支持 http(s)、data:image/ 或相对路径'
    if (!/^https?:\/\/[^\s]+/i.test(v)) return 'http(s) 地址格式不正确'
  }
  return ''
}

export const ImageDialog: React.FC<Props> = ({ onClose, onInsert, onUpload }) => {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [align, setAlign] = useState<'top' | 'left' | 'right'>('left')
  const [useUrl, setUseUrl] = useState(false) // 默认本地上传
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)
  // 上传到第三方图床会把图片 base64 明文 POST 给 imgant.com。
  // 之前点按钮就直接发出去了，用户完全不知情；现在必须先显式勾选。
  const [remoteConsent, setRemoteConsent] = useState(false)
  const imageUrlError = useUrl && url.trim() ? validateImageUrl(url) : ''
  const imageUrlValid = validateImageUrl(url) === ''

  const handleInsert = () => {
    if (useUrl && url.trim() && imageUrlValid) {
      onInsert(url.trim(), alt.trim() || 'image', align)
      onClose()
    } else if (!useUrl && uploadFile) {
      onUpload(uploadFile, align)
      onClose()
    }
  }

  const handleGenerateUrl = () => {
    if (!uploadFile) return
    setGenerating(true)
    const reader = new FileReader()
    reader.onerror = () => {
      setGenerating(false)
      toast('图片读取失败')
    }
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string
        const resp = await fetch('https://imgant.com/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64.split(',')[1] }),
        })
        const data = await resp.json()
        if (data.url) {
          setUrl(data.url)
          setUseUrl(true)
          toast('图床上传成功')
        } else {
          toast('图床上传失败，可改用本地嵌入')
        }
      } catch {
        toast('图床服务不可用，可改用本地嵌入')
      } finally {
        setGenerating(false)
      }
    }
    reader.readAsDataURL(uploadFile)
  }

  return (
    <UiModal
      open
      onClose={onClose}
      icon="ri-image-line"
      title="插入图片"
      subtitle="支持 URL 或本地上传"
      width={720}
      height={520}
      footer={
        <>
          <UiButton variant="ghost" onClick={onClose}>取消</UiButton>
          <UiButton onClick={handleInsert} disabled={useUrl ? !imageUrlValid : !uploadFile}>
            插入图片
          </UiButton>
        </>
      }
    >
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', flex: 1 }}>
        {/* 2 标签切换 - 本地上传在前，URL链接在后 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`ud-btn${!useUrl ? ' ud-btn--primary' : ''}`}
            onClick={() => setUseUrl(false)}
            style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '8px 8px' }}
          >
            <span className="remix ri-upload-cloud-line" style={{ fontSize: 18 }}></span>
            <span style={{ fontSize: 12 }}>本地上传</span>
          </button>
          <button
            className={`ud-btn${useUrl ? ' ud-btn--primary' : ''}`}
            onClick={() => setUseUrl(true)}
            style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '8px 8px' }}
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
                <>
                  <label
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      padding: '8px 10px',
                      background: 'var(--bg-code)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={remoteConsent}
                      onChange={e => setRemoteConsent(e.target.checked)}
                      style={{ marginTop: 3, flexShrink: 0 }}
                    />
                    <span>
                      <b>上传到第三方图床 imgant.com</b>：图片会以明文 base64 发送到该网站。
                      如需保存在本地，请直接点「插入图片」，图片会以 base64 内嵌进文档，不经过任何网络请求。
                    </span>
                  </label>
                  <button
                    className="ud-btn"
                    onClick={handleGenerateUrl}
                    disabled={generating || !remoteConsent}
                    style={{ marginTop: 8, width: '100%', justifyContent: 'center', opacity: remoteConsent ? 1 : 0.5 }}
                    title={remoteConsent ? '上传图片到 imgant.com' : '请先勾选上方确认项'}
                  >
                    <span className={`remix ${generating ? 'ri-loader-4-line spin' : 'ri-flashlight-line'}`}></span>
                    {generating ? '上传中...' : '上传到图床并生成 URL'}
                  </button>
                </>
              )}
            </UDSection>
          ) : (
            // URL 链接
            <>
              <UDSection label="图片地址">
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, fontFamily: 'var(--font-mono)' }}>
                    <UiInput
                      value={url}
                      onChange={setUrl}
                      placeholder="https://..."
                    />
                    {imageUrlError && (
                      <div style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 4 }}>{imageUrlError}</div>
                    )}
                  </div>
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
                <UiInput
                  value={alt}
                  onChange={setAlt}
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
    </UiModal>
  )
}
