import { useEffect } from 'react'
import { pluginRegistries } from './api'
import { usePluginRegistry } from './hooks'

/* ═══════════════════════════════════════════════════════════
   插件托盘桥（纯增量）：渲染侧把 menu === 'tray' 的插件菜单项登记到
   主进程托盘菜单；点击时主进程回发插件项 id，这里运行插件 run()。
   仅 Electron 下生效（浏览器 window.electronAPI 为 undefined）。
   ═══════════════════════════════════════════════════════════ */

export function usePluginTrayBridge(): void {
  const items = usePluginRegistry(pluginRegistries.menuItems)

  // 托盘项列表变化 → 同步给主进程重建托盘菜单
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.setPluginTrayItems) return
    api.setPluginTrayItems(
      items.filter(m => m.menu === 'tray').map(m => ({ id: m.id, label: m.label })),
    )
  }, [items])

  // 托盘插件项被点击 → 运行对应插件的 run()
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onPluginTrayItem) return
    return api.onPluginTrayItem((id) => {
      const item = pluginRegistries.menuItems.list().find(m => m.id === id)
      if (item) { try { item.run() } catch { /* 托盘动作失败不抛 */ } }
    })
  }, [])
}
