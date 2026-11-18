import { pluginApi } from './api'
import { toast } from '../utils/toast'

/* ═══════════════════════════════════════════════════════════
   内置示例插件：演示各类贡献点确实接线生效。
   全部走插件 API 注册，纯增量，不触碰任何现有功能路径。
   可通过删除本文件并在 index.ts 移除注册来停用。
   ═══════════════════════════════════════════════════════════ */

/** 示例命令：toast 一条问候，证明 commands 注册表 + run 生效。 */
async function demoSay(): Promise<void> {
  toast('来自示例插件：你好，懒猫编辑器！', { type: 'info' })
}

/** 示例 AI 工具：把输入首尾去空白并去掉多余空行，返回处理结果。 */
async function demoCleanText(text: string): Promise<string> {
  const lines = text
    .split('\n')
    .map(l => l.trimEnd())
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
  return lines.join('\n').trim()
}

/** 注册示例插件（幂等：多次调用只注册一次）。 */

export function registerDemoPlugins(): void {
  // 命令
  pluginApi.commands.register({ id: 'demo.say', title: '示例问候', run: demoSay })

  // 设置页
  pluginApi.settingsPages.register({
    id: 'demo.page',
    label: '示例插件',
    icon: 'ri-flask-line',
    render: () => (
      <div className="settings-section">
        <div className="settings-section-title"><span>示例插件设置页</span></div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 16px' }}>
          这个页面由示例插件通过 settingsPages 贡献点注册，证明插件设置页接线生效。
        </p>
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={() => { void pluginApi.commands.run('demo.say') }}
        >
          <span className="remix ri-flashlight-fill"></span>
          运行示例命令
        </button>
      </div>
    ),
  })

  // 状态项（页脚，挨着现有状态信息）
  pluginApi.statusItems.register({
    id: 'demo.status',
    render: () => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} data-title="示例插件已加载">
        <span className="remix ri-flask-line" style={{ color: 'var(--color-primary)' }}></span>
        <span>插件</span>
      </span>
    ),
  })

  // AI 工具（AI 面板动作区追加）
  pluginApi.aiTools.register({
    id: 'demo.clean',
    label: '清理空白',
    run: demoCleanText,
  })

  // 菜单项（格式/插入飞出菜单追加）
  pluginApi.menus.register({
    id: 'demo.menu.say',
    menu: 'block',
    label: '示例插件：问候',
    icon: 'ri-flask-line',
    run: () => { void demoSay() },
  })

  // 浮动视图
  pluginApi.floatingViews.register({
    id: 'demo.floating',
    title: '示例浮动视图',
    render: () => (
      <div style={{ padding: '12px 16px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
        <p style={{ margin: '0 0 8px' }}>这是示例插件注册的浮动视图，证明 floatingViews 接线生效。</p>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => { void demoSay() }}>
          运行示例命令
        </button>
      </div>
    ),
  })

  // 托盘项（Electron 托盘菜单追加）
  pluginApi.menus.register({
    id: 'demo.tray.say',
    menu: 'tray',
    label: '示例插件：问候',
    icon: 'ri-flask-line',
    run: () => { void demoSay() },
  })

  // will-save 钩子（只读，不阻断保存）
  pluginApi.willSave.register({
    id: 'demo.willSave',
    run: (doc) => { console.info('[plugin:demo] will-save', doc.title, doc.md.length) },
  })

  // will-export 钩子（只读，不阻断导出）
  pluginApi.willExport.register({
    id: 'demo.willExport',
    run: (format) => { console.info('[plugin:demo] will-export', format) },
  })

  // 插件设置项（独立 Map，不触碰 settingsStore）
  pluginApi.settings.register({
    key: 'demo.enabled',
    label: '启用示例插件',
    default: true,
    type: 'boolean',
  })
}
