import React from 'react'
import { pluginRegistries } from './api'
import { usePluginRegistry } from './hooks'

/* ═══════════════════════════════════════════════════════════
   插件浮动视图容器：渲染所有已注册的 floatingViews。
   独立浮层，不占用现有 AI / 插入面板，纯增量。
   ═══════════════════════════════════════════════════════════ */

export const PluginFloatingViews: React.FC = () => {
  const views = usePluginRegistry(pluginRegistries.floatingViews)
  if (!views.length) return null
  return (
    <div className="plugin-floating-layer" aria-label="插件浮动视图">
      {views.map(v => (
        <div key={v.id} className="plugin-floating-view" data-plugin-view={v.id}>
          <div className="plugin-floating-view-title">
            <span className="remix ri-plug-line"></span>
            <span>{v.title}</span>
          </div>
          <div className="plugin-floating-view-body">{v.render()}</div>
        </div>
      ))}
    </div>
  )
}
