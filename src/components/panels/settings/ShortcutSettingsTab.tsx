import React from 'react'

function renderShortcutContent(tab: string) {

  const isMac = navigator.userAgent.toLowerCase().includes('mac')
  const mod = isMac ? '⌘' : 'Ctrl'
  const alt = isMac ? '⌥' : 'Alt'
  const shift = '⇧'
  const row = (desc: string, key: string, note?: string) => (
    <div className="shortcut-row">
      <span className="shortcut-action">{desc}{note ? <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{note}</span> : ''}</span>
      <kbd className="shortcut-key">{key}</kbd>
    </div>
  )

  if (tab === 'doc') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-file-list-line shortcut-section-icon"></span><span>文档操作</span></div>
      <div className="shortcut-list">
        {row('新建文档', `${mod}+N`)}
        {row('打开文档', `${mod}+O`)}
        {row('自动保存（无需手动）', `${mod}+S`, '仅提示')}
        {row('导出文件', `${mod}+E`)}
        {row('退出应用', `${mod}+Q`)}
        {row('重新加载窗口', `${mod}+R`)}
      </div>
    </div>
  )
  if (tab === 'edit') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-edit-line shortcut-section-icon"></span><span>编辑操作</span></div>
      <div className="shortcut-list">
        {row('撤销', `${mod}+Z`)}
        {row('重做', `${mod}+${shift}+Z`)}
        {row('剪切', `${mod}+X`)}
        {row('复制', `${mod}+C`)}
        {row('粘贴', `${mod}+V`)}
        {row('全选', `${mod}+A`)}
      </div>
    </div>
  )
  if (tab === 'common') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-list-check shortcut-section-icon"></span><span>常规操作</span></div>
      <div className="shortcut-list">
        {row('设置面板', `${mod}+,`)}
        {row('全屏模式', `${mod}+Shift+F`)}
        {row('搜索文档', `${mod}+F`)}
        {row('替换文本', `${mod}+${shift}+H`)}
        {row('打印文档', `${mod}+P`)}
      </div>
    </div>
  )
  if (tab === 'heading') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-h-1 shortcut-section-icon"></span><span>标题与段落</span></div>
      <div className="shortcut-list">
        {row('一级标题 (H1)', `${mod}+${alt}+1`)}
        {row('二级标题 (H2)', `${mod}+${alt}+2`)}
        {row('三级标题 (H3)', `${mod}+${alt}+3`)}
        {row('四级标题 (H4)', `${mod}+${alt}+4`)}
        {row('五级标题 (H5)', `${mod}+${alt}+5`)}
        {row('六级标题 (H6)', `${mod}+${alt}+6`)}
        {row('无序列表', `${mod}+${shift}+8`)}
        {row('有序列表', `${mod}+${shift}+7`)}
        {row('待办事项列表', `${mod}+${shift}+9`)}
        {row('引用块', `${mod}+${shift}+B`)}
        {row('软换行', `${mod}+Enter`)}
      </div>
    </div>
  )
  if (tab === 'code') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-code-box-line shortcut-section-icon"></span><span>代码块</span></div>
      <div className="shortcut-list">
        {row('代码块', `${mod}+${alt}+C`)}
        {row('软换行', `${mod}+Enter`)}
      </div>
    </div>
  )
  return (
    <div>
      <div className="settings-section-title"><span className="remix ri-apps-line shortcut-section-icon"></span><span>应用级快捷键</span></div>
      <div className="shortcut-list">
        {row('AI 辅助面板', `${mod}+/`)}
        {row('预览模式', '仅工具栏按钮')}
        {row('代码预览', '仅工具栏按钮')}
        {row('大纲导航', '仅工具栏按钮')}
        {row('阅读模式', '仅工具栏按钮')}
      </div>
      <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, background: 'var(--bg-code)', border: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
        <span className="remix ri-information-fill" style={{ color: 'var(--accent-primary)', marginRight: 6 }}></span>
        水平分割线、段落对齐等功能暂无快捷键，可通过工具栏按钮插入。
      </div>
    </div>
  )

}

export const ShortcutSettingsTab: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {['doc', 'edit', 'common', 'heading', 'code', 'system'].map(t => (
      <div key={t} className="settings-section">{renderShortcutContent(t)}</div>
    ))}
  </div>
)
