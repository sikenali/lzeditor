import { useSyncExternalStore } from 'react'
import type { Registry } from './registry'

/* ═══════════════════════════════════════════════════════════
   React 订阅钩子：UI 组件靠它在插件贡献点变化时重渲染。
   只读，不改任何现有组件的既有逻辑。
   ═══════════════════════════════════════════════════════════ */

/** 订阅一个插件注册表，返回其当前快照（不可变数组）。 */
export function usePluginRegistry<T>(registry: Registry<T>): T[] {
  return useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    registry.getSnapshot,
  )
}
