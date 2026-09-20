import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

interface ImageDialogProps {
  onClose: () => void
  onInsert: (url: string, alt: string) => void
  onUpload: (file: File) => void
}

type ImageMode = 'local' | 'url'

export const ImageDialog: React.FC<ImageDialogProps> = ({ onClose, onInsert, onUpload }) => {
  const [mode, setMode] = useState<ImageMode>('local')
  const [imgUrl, setImgUrl] = useState('')
  const [imgAlt, setImgAlt] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onUpload(file)
  }

  const handleInsert = () => {
    if (mode === 'url' && imgUrl.trim()) {
      onInsert(imgUrl.trim(), imgAlt.trim() || 'image')
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog insert-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-image-line"></span>
            <div>
              <div className="export-title-text">插入图片</div>
              <div className="export-title-desc">选择图片来源方式</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="export-body export-body-split export-body-redesigned insert-dialog-body">
          <div className="export-left insert-left-nav">
            <button
              className={`insert-nav-item ${mode === 'local' ? 'active' : ''}`}
              onClick={() => setMode('local')}
            >
              <span className="remix insert-nav-icon ri-upload-cloud-2-line"></span>
              <span className="chip-name">本地图片</span>
              <span className="chip-desc">上传或拖入图片文件</span>
            </button>
            <button
              className={`insert-nav-item ${mode === 'url' ? 'active' : ''}`}
              onClick={() => setMode('url')}
            >
              <span className="remix insert-nav-icon ri-global-line"></span>
              <span className="chip-name">图床地址</span>
              <span className="chip-desc">使用 http 或 https 链接</span>
            </button>
          </div>
          <div className="export-right insert-right-pane">
            <div className="insert-preview-panel">
              {mode === 'local' && (
                <div
                  className={`image-drop-zone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <span className="remix ri-image-add-line" style={{ fontSize: 28, color: 'var(--text-muted)', opacity: 0.5 }}></span>
                  <div className="image-drop-text">拖拽图片到此处，或</div>
                  <label className="image-drop-btn">
                    <span className="remix ri-folder-open-line"></span>
                    选择文件
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                </div>
              )}
              {mode === 'url' && (
                <div className="image-url-fields">
                  <div className="export-field">
                    <label className="export-label">图片地址</label>
                    <input className="lfs-input" placeholder="https:// 或 http://" value={imgUrl} onChange={e => setImgUrl(e.target.value)} />
                    {imgUrl && !imgUrl.match(/^https?:\/\//) && <span className="image-url-tip">提示：URL 需以 http:// 或 https:// 开头</span>}
                  </div>
                  <div className="export-field">
                    <label className="export-label">替代文字（可选）</label>
                    <input className="lfs-input" placeholder="图片描述" value={imgAlt} onChange={e => setImgAlt(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className="export-footer">
              <div className="export-hint">
                <span className="remix ri-information-line"></span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>插入后图片将显示在光标位置</span>
              </div>
              <div className="export-actions">
                <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
                <button className="settings-save-btn" onClick={handleInsert} disabled={mode === 'url' && !imgUrl.trim()}>
                  <span className="remix ri-add-line"></span>
                  插入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
