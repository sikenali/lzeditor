import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const ReadMode: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [fontSize, setFontSize] = useState(17)
  const readProgress = 34

  return (
    <div className="read-mode-overlay" onClick={onClose}>
      <div className="read-mode-container" onClick={e => e.stopPropagation()}>
        <div className="read-mode-topbar">
          <div className="read-mode-left">
            <span className="remix" style={{ fontSize: 17, color: 'var(--accent-primary)' }}></span>
            <span style={{ fontSize: 13, color: 'rgba(139,152,165,1)' }}>阅读模式 · Read Mode</span>
          </div>
          <div className="read-mode-center">
            <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>technical-notes.md</span>
            <span className="read-divider" />
            <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>预计阅读 6 分钟</span>
            <span className="read-divider" />
            <span style={{ fontSize: 12, color: 'var(--amber)' }}>已读 34%</span>
          </div>
          <div className="read-mode-right">
            <div className="font-size-control">
              <span style={{ fontSize: 12, color: 'rgba(139,152,165,1)' }}>A</span>
              <div className="font-slider">
                <span className="font-slider-fill" style={{ width: `${Math.max(0, (fontSize - 14) * 5.65)}px` }} />
                <span className="font-slider-dot" style={{ left: `${Math.max(0, (fontSize - 14) * 5.65 + 2)}px` }} />
              </div>
              <span style={{ fontSize: 16, color: 'rgba(139,152,165,1)' }}>A</span>
            </div>
            <button className="read-exit-btn" onClick={onClose}>
              <span className="remix" style={{ fontSize: 14 }}></span>
              <span>退出阅读</span>
            </button>
          </div>
        </div>

        <div className="read-progress-bar">
          <div className="read-progress-fill" style={{ width: `${readProgress}%` }} />
        </div>

        <div className="read-mode-body" onClick={onClose}>
          <div className="read-article">
            <div className="read-article-header">
              <div className="read-tags">
                <span className="read-tag read-tag-tech">技术笔记</span>
                <span className="read-tag read-tag-system">系统</span>
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 700, color: 'rgba(242,248,251,1)', marginTop: 20 }}>
                Praesent varius diam
              </h1>
              <div className="read-meta">
                <div className="read-avatar" />
                <div>
                  <div style={{ fontSize: 13, color: 'rgba(199,211,222,1)' }}>Ivar Pratt</div>
                  <div style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>2024-05-18 · 更新于 3 天前</div>
                </div>
                <div className="read-divider-v" />
                <div className="read-views">
                  <span className="remix" style={{ fontSize: 14, color: 'rgba(127,191,162,1)' }}></span>
                  <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>1,204 次阅读</span>
                </div>
              </div>
            </div>

            <div className="read-article-body" style={{ fontSize }}>
              <p>Mauris ultrices ac erat quis gravida. Mauris non dictum mauris. Quisque rhoncus, nisi et condimentum cursus, felis orci lacinia ante, eget venenatis ligula quam at quam.</p>

              <h2 style={{ fontSize: 22, fontWeight: 600, color: 'rgba(234,243,248,1)', marginTop: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                Praesent varius diam
                <span style={{ width: 31, height: 3, background: 'var(--accent-primary)', borderRadius: 2, flexShrink: 0 }} />
              </h2>

              <p>Nam id imperdiet turpis. Fusce dignissim vel eros sit amet auctor. Donec quis lorem egestas, placerat odio vel, pulvinar tellus.</p>

              <div className="read-tip-card">
                <div className="read-tip-header">
                  <span className="remix" style={{ fontSize: 16, color: 'var(--amber)' }}></span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--amber)' }}>本节要点</span>
                </div>
                <div className="read-tip-list">
                  {[
                    '保持 Markdown 标记可见，写作时无需在源码与预览之间来回切换。',
                    '每次自动保存都会生成快照，可在历史面板中对比与回滚。',
                    '样式集决定导出观感，切换到 Ocean 后表格与标题会统一为冷色调。',
                  ].map((text, i) => (
                    <div key={i} className="read-tip-item">
                      <span className="read-tip-num">{i + 1}</span>
                      <span style={{ fontSize: 15, color: 'rgba(185,198,210,1)' }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="read-quote">
                <span className="remix" style={{ fontSize: 20, color: 'var(--amber)' }}></span>
                <span>"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..."</span>
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 600, color: 'rgba(234,243,248,1)', marginTop: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                Libero finibus facilisis ac a lacus
                <span style={{ width: 31, height: 3, background: 'var(--accent-primary)', borderRadius: 2, flexShrink: 0 }} />
              </h2>

              <p>Integer tincidunt nunc quis tortor tristique, ut egestas metus volutpat. In sit amet dolor leo, dictum in odio eu vulputate.</p>

              <div className="read-code-block">
                <div className="read-code-header">
                  <div className="read-code-lang">
                    <span className="remix" style={{ fontSize: 14, color: 'rgba(127,191,162,1)' }}></span>
                    <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>bash</span>
                  </div>
                  <button style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '2px 8px', border: '1px solid rgba(37,50,62,1)', borderRadius: 4 }}>
                    <span className="remix" style={{ fontSize: 12, marginRight: 4 }}></span>复制
                  </button>
                </div>
                <pre style={{ margin: '12px 0', padding: '12px 16px', background: 'var(--bg-code)', borderRadius: 6, fontFamily: 'monospace', fontSize: 14 }}>
                  <div><span style={{ color: 'var(--accent-primary)' }}>$</span> cat /proc/cpuinfo | grep "model name" | head -n 3</div>
                  <div style={{ marginTop: 8, color: 'rgba(213,226,236,1)' }}>model name : Apple M3 Pro</div>
                  <div style={{ marginTop: 4, color: 'rgba(213,226,236,1)' }}>cpu cores : 12</div>
                </pre>
              </div>

              <div className="read-footer">
                <div className="read-tags-footer">
                  <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}></span>
                  <span className="read-tag-sm">markdown</span>
                  <span className="read-tag-sm">writing</span>
                  <span className="read-tag-sm">workflow</span>
                </div>
                <div className="read-footer-actions">
                  <button className="read-back-top-btn">
                    <span className="remix" style={{ fontSize: 14 }}></span>
                    <span>回到顶部</span>
                  </button>
                  <button className="read-edit-btn" onClick={onClose}>
                    <span className="remix" style={{ fontSize: 14 }}></span>
                    <span>继续编辑</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
