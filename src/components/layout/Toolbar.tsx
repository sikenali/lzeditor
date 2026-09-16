import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'

const TOOLS = [
  { icon: '\uE8AA', label: '文库', action: 'library' },
  { icon: '\uE8EB', label: '文件', action: 'file' },
  { icon: '\uEA3E', label: '大纲', action: 'outline' },
  { icon: '\uEA4D', label: '预览', action: 'preview' },
  { icon: '\uE64B', label: '图片', action: 'image' },
  { icon: '\uEA72', label: '链接', action: 'link' },
  { icon: '\uEBAD', label: '代码', action: 'code' },
  { icon: '\uFE5E', label: '表格', action: 'table' },
  { icon: '\uF47B', label: 'AI', action: 'ai' },
  { icon: '\uEAF1', label: '阅读', action: 'read' },
  { icon: '\uE617', label: '历史', action: 'history' },
  { icon: '\uE454', label: '导出', action: 'export' },
  { icon: '\uF068', label: '设置', action: 'settings' },
]

export const Toolbar: React.FC = () => {
  const openPanel = useEditorStore((s: any) => s.openPanel)
  const isReadMode = useEditorStore((s: any) => s.isReadMode)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setPreview = useEditorStore((s: any) => s.setPreview)
  const setReadMode = useEditorStore((s: any) => s.setReadMode)

  const handleClick = (action: string) => {
    switch (action) {
      case 'preview': setPreview((v: boolean) => !v); break
      case 'read': setReadMode((v: boolean) => !v); break
      case 'ai': useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 }); break
      case 'history': setOpenPanel((v: string) => v === 'history' ? 'none' : 'history'); break
      case 'export': setOpenPanel((v: string) => v === 'export' ? 'none' : 'export'); break
      case 'settings': setOpenPanel((v: string) => v === 'settings' ? 'none' : 'settings'); break
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {TOOLS.slice(0, 4).map(t => (
          <button key={t.action} className="toolbar-btn" onClick={() => handleClick(t.action)} title={t.label}>
            <span className="remix toolbar-icon">{t.icon}</span>
            <span className="toolbar-label">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="toolbar-group">
        {TOOLS.slice(4, 8).map(t => (
          <button key={t.action} className="toolbar-btn" onClick={() => handleClick(t.action)} title={t.label}>
            <span className="remix toolbar-icon">{t.icon}</span>
            <span className="toolbar-label">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="toolbar-group">
        {TOOLS.slice(8).map(t => (
          <button key={t.action} className="toolbar-btn" onClick={() => handleClick(t.action)} title={t.label}>
            <span className="remix toolbar-icon">{t.icon}</span>
            <span className="toolbar-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
