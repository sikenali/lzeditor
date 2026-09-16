import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'

const TOOLS = [
  { icon: '\uED6A', label: '文库', action: 'library' },
  { icon: '\uECEB', label: '文件', action: 'file' },
  { icon: '\uEEBE', label: '大纲', action: 'outline' },
  { icon: '\uEE8D', label: '预览', action: 'preview' },
  // --- gap 36px ---
  { icon: '\uEE4B', label: '图片', action: 'image' },
  { icon: '\uEEB2', label: '链接', action: 'link' },
  { icon: '\uEBAD', label: '代码', action: 'code' },
  { icon: '\uF1DE', label: '表格', action: 'table' },
  // --- gap 36px ---
  { icon: '\uF47B', label: 'AI', action: 'ai' },
  { icon: '\uEADB', label: '阅读', action: 'read' },
  { icon: '\uEE17', label: '历史', action: 'history' },
  { icon: '\uEC54', label: '导出', action: 'export' },
  { icon: '\uF0E8', label: '设置', action: 'settings' },
]

const LEFT_TOOLS = TOOLS.slice(0, 4)
const MIDDLE_TOOLS = TOOLS.slice(4, 8)
const RIGHT_TOOLS = TOOLS.slice(8)

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
      case 'ai':
        useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })
        break
      case 'history': setOpenPanel((v: string) => v === 'history' ? 'none' : 'history'); break
      case 'export': setOpenPanel((v: string) => v === 'export' ? 'none' : 'export'); break
      case 'settings': setOpenPanel((v: string) => v === 'settings' ? 'none' : 'settings'); break
    }
  }

  const renderGroup = (tools: typeof TOOLS, className: string) => (
    <div className={`toolbar-group ${className}`}>
      {tools.map(t => (
        <button
          key={t.action}
          className={`toolbar-btn ${openPanel === t.action ? 'active' : ''}`}
          onClick={() => handleClick(t.action)}
          title={t.label}
        >
          <span className="remix toolbar-icon">{t.icon}</span>
          <span className="toolbar-label">{t.label}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="toolbar">
      {renderGroup(LEFT_TOOLS, '')}
      {renderGroup(MIDDLE_TOOLS, 'toolbar-group--middle')}
      {renderGroup(RIGHT_TOOLS, '')}
    </div>
  )
}
