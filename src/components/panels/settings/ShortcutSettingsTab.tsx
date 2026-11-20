import React from 'react'
import { UDSettingRow } from '../../ui'

function renderShortcutContent(tab: string) {

  const isMac = navigator.userAgent.toLowerCase().includes('mac')
  const mod = isMac ? '⌘' : 'Ctrl'
  const alt = isMac ? '⌥' : 'Alt'
  const shift = '⇧'
  // 快捷键行统一「图标 + 上下文字 + 右对齐键帽」结构（UDSettingRow，task 1）。
  const row = (icon: string, desc: string, key: string, note?: string) => (
    <UDSettingRow icon={icon} label={desc} desc={note}>
      <kbd className="shortcut-key">{key}</kbd>
    </UDSettingRow>
  )

  if (tab === 'doc') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-file-list-line shortcut-section-icon"></span><span>文档操作</span></div>
      <div className="shortcut-list">
        {row('ri-file-add-line', '新建文档', `${mod}+N`)}
        {row('ri-folder-open-line', '打开文件', `${mod}+O`)}
        {row('ri-folder-transfer-line', '打开文件夹批量导入', `${mod}+${shift}+O`)}
        {row('ri-save-line', '自动保存（无需手动）', `${mod}+S`, '仅提示')}
        {row('ri-download-line', '导出文件', `${mod}+E`)}
        {row('ri-logout-box-r-line', '退出应用', `${mod}+Q`, '仅桌面端')}
      </div>
    </div>
  )
  if (tab === 'edit') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-edit-line shortcut-section-icon"></span><span>编辑操作</span></div>
      <div className="shortcut-list">
        {row('ri-arrow-go-back-line', '撤销', `${mod}+Z`)}
        {row('ri-arrow-go-forward-line', '重做', `${mod}+${shift}+Z`)}
        {row('ri-scissors-line', '剪切', `${mod}+X`)}
        {row('ri-file-copy-line', '复制', `${mod}+C`)}
        {row('ri-clipboard-line', '粘贴', `${mod}+V`)}
        {row('ri-checkbox-multiple-line', '全选', `${mod}+A`)}
      </div>
    </div>
  )
  if (tab === 'common') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-list-check shortcut-section-icon"></span><span>常规操作</span></div>
      <div className="shortcut-list">
        {row('ri-settings-3-line', '设置面板', `${mod}+,`)}
        {row('ri-fullscreen-line', '全屏模式', `${mod}+Shift+F`)}
        {row('ri-search-line', '搜索文档', `${mod}+F`)}
        {row('ri-find-replace-line', '替换文本', `${mod}+${shift}+H`)}
        {row('ri-printer-line', '打印文档', `${mod}+P`)}
      </div>
    </div>
  )
  if (tab === 'heading') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-h-1 shortcut-section-icon"></span><span>标题与段落</span></div>
      <div className="shortcut-list">
        {row('ri-h-1', '一级标题 (H1)', `${mod}+${alt}+1`)}
        {row('ri-h-2', '二级标题 (H2)', `${mod}+${alt}+2`)}
        {row('ri-h-3', '三级标题 (H3)', `${mod}+${alt}+3`)}
        {row('ri-h-4', '四级标题 (H4)', `${mod}+${alt}+4`)}
        {row('ri-h-5', '五级标题 (H5)', `${mod}+${alt}+5`)}
        {row('ri-h-6', '六级标题 (H6)', `${mod}+${alt}+6`)}
        {row('ri-list-unordered', '无序列表', `${mod}+${shift}+8`)}
        {row('ri-list-ordered', '有序列表', `${mod}+${shift}+7`)}
        {row('ri-list-check-2', '待办事项列表', `${mod}+${shift}+9`)}
        {row('ri-double-quotes-l', '引用块', `${mod}+${shift}+B`)}
        {row('ri-text-wrap', '软换行', `${shift}+Enter`)}
      </div>
    </div>
  )
  if (tab === 'code') return (
    <div>
      <div className="settings-section-title"><span className="remix ri-code-box-line shortcut-section-icon"></span><span>代码块</span></div>
      <div className="shortcut-list">
        {row('ri-code-box-line', '代码块', `${mod}+${alt}+C`)}
      </div>
    </div>
  )
  return (
    <div>
      <div className="settings-section-title"><span className="remix ri-apps-line shortcut-section-icon"></span><span>应用级快捷键</span></div>
      <div className="shortcut-list">
        {row('ri-robot-2-line', 'AI 辅助面板', `${mod}+/`)}
        {row('ri-eye-line', '预览模式', '仅工具栏按钮')}
        {row('ri-code-line', '代码预览', '仅工具栏按钮')}
        {row('ri-list-unordered', '大纲导航', '仅工具栏按钮')}
        {row('ri-book-open-line', '阅读模式', `${mod}+R`)}
      </div>
      <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, background: 'var(--bg-code)', border: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
        <span className="remix ri-information-fill" style={{ color: 'var(--accent-primary)', marginRight: 6 }}></span>
        水平分割线、段落对齐等功能暂无快捷键，可通过工具栏按钮插入。
        窗口重新加载、开发者工具、缩放等只挂在「视图」菜单里，不占快捷键。
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
