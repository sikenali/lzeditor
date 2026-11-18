/* 一个通用注册表：纯 TS、可订阅、带不可变快照（供 useSyncExternalStore）。 */

export interface Registry<T> {
  list: () => T[]
  getSnapshot: () => T[]
  subscribe: (fn: () => void) => () => void
  /** 注册一项，返回注销函数（快照更新为新数组，触发订阅者重渲染）。 */
  register: (item: T) => () => void
}

export function createRegistry<T>(): Registry<T> {
  let items: T[] = []
  const listeners = new Set<() => void>()
  const emit = () => { for (const fn of listeners) fn() }
  return {
    list: () => items,
    getSnapshot: () => items,
    subscribe: (fn) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    register: (item: T) => {
      items = [...items, item]
      emit()
      return () => {
        items = items.filter((x) => x !== item)
        emit()
      }
    },
  }
}
