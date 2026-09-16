import React from 'react'
import { useEditorStore } from '../../store/editorStore'

export const PreviewPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="preview-panel" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div className="preview-title">
            <span className="remix ri-eye-2-line" style={{ fontSize: 17, color: 'var(--accent-primary)' }}></span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>预览</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preview Mode</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="preview-body">
          <div className="preview-content">
            <h1>Praesent varius diam</h1>
            <p>Nam id imperdiet turpis. Fusce dignissim vel eros sit amet auctor. Donec quis lorem egestas, placerat odio vel, pulvinar tellus.</p>
            <h2>Libero finibus facilisis ac a lacus</h2>
            <p>Integer tincidunt nunc quis tortor tristique, ut egestas metus volutpat. In sit amet dolor leo, dictum in odio eu vulputate.</p>
            <blockquote>
              <span className="remix ri-double-quotes-l" style={{ fontSize: 20, color: 'var(--amber)' }}></span>
              <span>"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..."</span>
            </blockquote>
            <div className="read-code-block">
              <div className="read-code-header">
                <div className="read-code-lang">
                  <span className="remix ri-terminal-box-line" style={{ fontSize: 14, color: 'var(--green-accent-soft)' }}></span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>bash</span>
                </div>
              </div>
              <pre style={{ margin: '12px 0', padding: '12px 16px', background: 'var(--bg-code)', borderRadius: 6, fontFamily: 'monospace', fontSize: 14 }}>
                <div><span style={{ color: 'var(--accent-primary)' }}>$</span> cat /proc/cpuinfo | grep "model name" | head -n 3</div>
                <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>model name : Apple M3 Pro</div>
                <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>cpu cores : 12</div>
              </pre>
            </div>
          </div>
        </div>

        <div className="preview-footer">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>点击外部区域关闭预览</span>
        </div>
      </div>
    </div>
  )
}
